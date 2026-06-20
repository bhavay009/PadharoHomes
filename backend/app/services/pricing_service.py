"""Pricing domain logic: seasonal rates, per-night price, quotes, calendar.

Per-night price precedence (highest first):
  1. Seasonal rate covering that night.
  2. Weekend price (Sat/Sun) if the unit has one set.
  3. Base price.
"""
from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.availability import SeasonalRate
from app.models.unit import Unit
from app.services import availability_service

_WEEKEND = {5, 6}  # Saturday, Sunday (Python date.weekday())
_CENTS = Decimal("0.01")


class RateOverlapError(Exception):
    """A seasonal rate overlaps an existing one (maps to HTTP 409)."""


class QuoteError(Exception):
    """Quote could not be produced (bad range, below min-stay, unavailable)."""


def list_rates(db: Session, unit_id: uuid.UUID) -> list[SeasonalRate]:
    return list(
        db.scalars(
            select(SeasonalRate)
            .where(SeasonalRate.unit_id == unit_id)
            .order_by(SeasonalRate.start_date)
        ).all()
    )


def create_rate(
    db: Session,
    unit_id: uuid.UUID,
    start_date: date,
    end_date: date,
    price: Decimal,
) -> SeasonalRate:
    overlap = db.scalars(
        select(SeasonalRate.id).where(
            SeasonalRate.unit_id == unit_id,
            and_(
                SeasonalRate.start_date < end_date,
                SeasonalRate.end_date > start_date,
            ),
        )
    ).first()
    if overlap is not None:
        raise RateOverlapError("Seasonal rate overlaps an existing one.")
    rate = SeasonalRate(
        unit_id=unit_id, start_date=start_date, end_date=end_date, price=price
    )
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


def get_rate(db: Session, unit_id: uuid.UUID, rate_id: uuid.UUID) -> SeasonalRate | None:
    return db.scalars(
        select(SeasonalRate).where(
            SeasonalRate.id == rate_id, SeasonalRate.unit_id == unit_id
        )
    ).first()


def delete_rate(db: Session, rate: SeasonalRate) -> None:
    db.delete(rate)
    db.commit()


def _night_price(
    unit: Unit, day: date, rates: list[SeasonalRate]
) -> tuple[Decimal, str]:
    for r in rates:
        if r.start_date <= day < r.end_date:
            return r.price, "seasonal"
    if day.weekday() in _WEEKEND and unit.weekend_price is not None:
        return unit.weekend_price, "weekend"
    return unit.base_price, "base"


def _daterange(start: date, end: date):
    d = start
    while d < end:
        yield d
        d += timedelta(days=1)


def price_breakdown(db: Session, unit: Unit, check_in: date, check_out: date) -> dict:
    """Compute the priced breakdown for a stay. Validates the range and min-stay
    but does NOT check availability (callers that already hold a lock use this)."""
    if check_out <= check_in:
        raise QuoteError("check_out must be after check_in.")
    nights = (check_out - check_in).days
    if nights < unit.min_stay_nights:
        raise QuoteError(f"Minimum stay is {unit.min_stay_nights} night(s).")

    rates = list_rates(db, unit.id)
    nightly = []
    subtotal = Decimal("0")
    for day in _daterange(check_in, check_out):
        price, source = _night_price(unit, day, rates)
        subtotal += price
        nightly.append(
            {
                "date": day,
                "price": price,
                "is_weekend": day.weekday() in _WEEKEND,
                "source": source,
            }
        )

    subtotal = subtotal.quantize(_CENTS)
    deposit_due = (subtotal * unit.deposit_percent / Decimal("100")).quantize(_CENTS)
    balance_due = (subtotal - deposit_due).quantize(_CENTS)
    return {
        "check_in": check_in,
        "check_out": check_out,
        "nights": nights,
        "currency": unit.currency,
        "nightly": nightly,
        "subtotal": subtotal,
        "deposit_percent": unit.deposit_percent,
        "deposit_due": deposit_due,
        "balance_due": balance_due,
    }


def quote(db: Session, unit: Unit, check_in: date, check_out: date) -> dict:
    """Public/host quote — same as the breakdown but also requires availability."""
    breakdown = price_breakdown(db, unit, check_in, check_out)
    if not availability_service.is_available(db, unit.id, check_in, check_out):
        raise QuoteError("Selected dates are not available.")
    return breakdown


def calendar(db: Session, unit: Unit, start: date, end: date) -> list[dict]:
    """Per-night availability + price for [start, end)."""
    if end <= start:
        raise QuoteError("end must be after start.")
    rates = list_rates(db, unit.id)
    blocks = availability_service.list_blocks(db, unit.id)
    days = []
    for day in _daterange(start, end):
        # A night is available if it is not within any block range.
        blocked = any(b.start_date <= day < b.end_date for b in blocks)
        price, _ = _night_price(unit, day, rates)
        days.append({"date": day, "available": not blocked, "price": price})
    return days

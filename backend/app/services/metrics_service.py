"""Host dashboard metrics.

Definitions (documented so the numbers are unambiguous):
  - revenue_booked     : sum(subtotal) of ACTIVE bookings (confirmed/checked_in/completed).
  - cash_collected     : deposits actually paid (deposit_paid_at set, any later status)
                         + balances marked collected. Real cash in hand.
  - outstanding_balance: sum(balance_amount) of ACTIVE bookings whose balance is not yet collected.
  - commission_saved   : ota_commission_percent% x revenue_booked (the cut an aggregator
                         would have taken on the same direct revenue).
  - occupancy_percent  : booked nights within the next `occupancy_window_days`
                         / (published_units x window). 0 if no published units.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.booking import ACTIVE_BOOKING_STATUSES, Booking, BookingStatus
from app.models.unit import Unit, UnitStatus

_CENTS = Decimal("0.01")


def _scalar(db: Session, stmt) -> Decimal:
    return db.scalar(stmt) or Decimal("0")


def dashboard_metrics(db: Session, host_id: uuid.UUID) -> dict:
    total_units = db.scalar(
        select(func.count()).select_from(Unit).where(Unit.host_id == host_id)
    ) or 0
    published_units = db.scalar(
        select(func.count())
        .select_from(Unit)
        .where(Unit.host_id == host_id, Unit.status == UnitStatus.published)
    ) or 0

    # Bookings grouped by status.
    by_status_rows = db.execute(
        select(Booking.status, func.count())
        .where(Booking.host_id == host_id)
        .group_by(Booking.status)
    ).all()
    bookings_by_status = {s.value: 0 for s in BookingStatus}
    for status_val, count in by_status_rows:
        bookings_by_status[status_val.value] = count

    active = [Booking.host_id == host_id, Booking.status.in_(ACTIVE_BOOKING_STATUSES)]

    revenue_booked = _scalar(
        db, select(func.coalesce(func.sum(Booking.subtotal), 0)).where(*active)
    )
    outstanding_balance = _scalar(
        db,
        select(func.coalesce(func.sum(Booking.balance_amount), 0)).where(
            *active, Booking.balance_collected_at.is_(None)
        ),
    )
    deposits_collected = _scalar(
        db,
        select(func.coalesce(func.sum(Booking.deposit_amount), 0)).where(
            Booking.host_id == host_id, Booking.deposit_paid_at.is_not(None)
        ),
    )
    balances_collected = _scalar(
        db,
        select(func.coalesce(func.sum(Booking.balance_amount), 0)).where(
            Booking.host_id == host_id, Booking.balance_collected_at.is_not(None)
        ),
    )
    cash_collected = (deposits_collected + balances_collected).quantize(_CENTS)

    commission_saved = (
        revenue_booked * settings.ota_commission_percent / Decimal("100")
    ).quantize(_CENTS)

    occupancy_percent = _occupancy(db, host_id, published_units)

    return {
        "total_units": total_units,
        "published_units": published_units,
        "bookings_by_status": bookings_by_status,
        "revenue_booked": revenue_booked.quantize(_CENTS),
        "cash_collected": cash_collected,
        "outstanding_balance": outstanding_balance.quantize(_CENTS),
        "commission_saved": commission_saved,
        "ota_commission_percent": settings.ota_commission_percent,
        "currency": settings.default_currency,
        "occupancy_percent": occupancy_percent,
        "occupancy_window_days": settings.occupancy_window_days,
    }


def _occupancy(db: Session, host_id: uuid.UUID, published_units: int) -> Decimal:
    window = settings.occupancy_window_days
    if published_units == 0:
        return Decimal("0")
    today = datetime.now(timezone.utc).date()
    window_end = today + timedelta(days=window)

    now = datetime.now(timezone.utc)
    bookings = db.scalars(
        select(Booking).where(
            Booking.host_id == host_id,
            Booking.check_in < window_end,
            Booking.check_out > today,
        )
    ).all()

    booked_nights = 0
    for b in bookings:
        is_active = b.status in ACTIVE_BOOKING_STATUSES or (
            b.status == BookingStatus.pending
            and b.hold_expires_at is not None
            and b.hold_expires_at > now
        )
        if not is_active:
            continue
        start = max(b.check_in, today)
        end = min(b.check_out, window_end)
        if end > start:
            booked_nights += (end - start).days

    capacity_nights = published_units * window
    if capacity_nights == 0:
        return Decimal("0")
    return (Decimal(booked_nights) / Decimal(capacity_nights) * 100).quantize(_CENTS)

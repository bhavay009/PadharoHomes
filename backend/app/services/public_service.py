"""Public storefront domain logic: browse/search published units.

Search rule (per product decision):
  - No dates  -> all published units matching the other filters.
  - Dates set -> additionally exclude units with an overlapping availability
                 block (unavailable for those nights).
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import and_, exists, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.availability import AvailabilityBlock
from app.models.booking import ACTIVE_BOOKING_STATUSES, Booking, BookingStatus
from app.models.unit import Unit, UnitStatus


def get_published_unit(db: Session, unit_id: uuid.UUID) -> Unit | None:
    return db.scalars(
        select(Unit)
        .options(selectinload(Unit.photos))
        .where(Unit.id == unit_id, Unit.status == UnitStatus.published)
    ).first()


def list_published_units(
    db: Session,
    *,
    city: str | None = None,
    guests: int | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    check_in: date | None = None,
    check_out: date | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Unit], int]:
    filters = [Unit.status == UnitStatus.published]
    if city:
        filters.append(func.lower(Unit.city) == city.strip().lower())
    if guests:
        filters.append(Unit.capacity >= guests)
    if min_price is not None:
        filters.append(Unit.base_price >= min_price)
    if max_price is not None:
        filters.append(Unit.base_price <= max_price)

    # Dates -> exclude units with an overlapping block OR active booking.
    if check_in is not None and check_out is not None:
        overlapping_block = (
            select(AvailabilityBlock.id)
            .where(
                AvailabilityBlock.unit_id == Unit.id,
                AvailabilityBlock.start_date < check_out,
                AvailabilityBlock.end_date > check_in,
            )
            .correlate(Unit)
        )
        now = datetime.now(timezone.utc)
        overlapping_booking = (
            select(Booking.id)
            .where(
                Booking.unit_id == Unit.id,
                Booking.check_in < check_out,
                Booking.check_out > check_in,
                or_(
                    Booking.status.in_(ACTIVE_BOOKING_STATUSES),
                    and_(
                        Booking.status == BookingStatus.pending,
                        Booking.hold_expires_at > now,
                    ),
                ),
            )
            .correlate(Unit)
        )
        filters.append(~exists(overlapping_block))
        filters.append(~exists(overlapping_booking))

    total = db.scalar(select(func.count()).select_from(Unit).where(*filters)) or 0
    items = list(
        db.scalars(
            select(Unit)
            .options(selectinload(Unit.photos))
            .where(*filters)
            .order_by(Unit.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()
    )
    return items, total

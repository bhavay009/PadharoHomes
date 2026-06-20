"""Availability domain logic.

Half-open ranges [start, end). Overlap test: a.start < b.end and b.start < a.end.

The reservation primitive (`reserve_block`) takes a PostgreSQL row-level lock on
the unit (`SELECT ... FOR UPDATE`) before checking and writing, so two concurrent
attempts to take overlapping dates on the same unit are serialized — the second
sees the first's committed block and is rejected. This is the foundation the
Phase 5 booking flow will reuse to prevent double-booking.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models.availability import AvailabilityBlock
from app.models.booking import ACTIVE_BOOKING_STATUSES, Booking, BookingStatus
from app.models.unit import Unit


class UnavailableError(Exception):
    """Requested dates overlap an existing block/booking (maps to HTTP 409)."""


def _overlap_clause(model, check_in: date, check_out: date):
    # half-open overlap: start < check_out AND end > check_in
    return and_(model.start_date < check_out, model.end_date > check_in)


def _booking_overlap_clause(check_in: date, check_out: date):
    return and_(Booking.check_in < check_out, Booking.check_out > check_in)


def _booking_active_clause():
    """A booking occupies dates if confirmed/checked_in/completed, or pending
    with a hold that has not yet expired."""
    now = datetime.now(timezone.utc)
    return or_(
        Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        and_(Booking.status == BookingStatus.pending, Booking.hold_expires_at > now),
    )


def lock_unit(db: Session, unit_id: uuid.UUID) -> bool:
    """Acquire a row-level lock on the unit (SELECT ... FOR UPDATE).

    Returns False if the unit does not exist. Serializes concurrent reservations.
    """
    row = db.execute(
        select(Unit.id).where(Unit.id == unit_id).with_for_update()
    ).first()
    return row is not None


def list_blocks(db: Session, unit_id: uuid.UUID) -> list[AvailabilityBlock]:
    return list(
        db.scalars(
            select(AvailabilityBlock)
            .where(AvailabilityBlock.unit_id == unit_id)
            .order_by(AvailabilityBlock.start_date)
        ).all()
    )


def is_available(
    db: Session,
    unit_id: uuid.UUID,
    check_in: date,
    check_out: date,
    exclude_booking_id: uuid.UUID | None = None,
) -> bool:
    """True if no block AND no active booking overlaps [check_in, check_out)."""
    block_conflict = db.scalars(
        select(AvailabilityBlock.id).where(
            AvailabilityBlock.unit_id == unit_id,
            _overlap_clause(AvailabilityBlock, check_in, check_out),
        )
    ).first()
    if block_conflict is not None:
        return False

    booking_filters = [
        Booking.unit_id == unit_id,
        _booking_active_clause(),
        _booking_overlap_clause(check_in, check_out),
    ]
    if exclude_booking_id is not None:
        booking_filters.append(Booking.id != exclude_booking_id)
    booking_conflict = db.scalars(select(Booking.id).where(*booking_filters)).first()
    return booking_conflict is None


def reserve_block(
    db: Session,
    unit_id: uuid.UUID,
    check_in: date,
    check_out: date,
    reason: str | None = None,
) -> AvailabilityBlock:
    """Concurrency-safe: lock the unit row, verify no overlap, insert the block.

    Caller controls the transaction boundary (commit/rollback). Raises
    UnavailableError if the dates overlap an existing block.
    """
    # Row-level lock serializes concurrent reservations for this unit.
    if not lock_unit(db, unit_id):
        raise UnavailableError("Unit not found.")

    if not is_available(db, unit_id, check_in, check_out):
        raise UnavailableError("Requested dates are not available.")

    block = AvailabilityBlock(
        unit_id=unit_id,
        start_date=check_in,
        end_date=check_out,
        reason=reason,
    )
    db.add(block)
    db.flush()
    return block


def delete_block(db: Session, block: AvailabilityBlock) -> None:
    db.delete(block)
    db.commit()


def get_block(
    db: Session, unit_id: uuid.UUID, block_id: uuid.UUID
) -> AvailabilityBlock | None:
    return db.scalars(
        select(AvailabilityBlock).where(
            AvailabilityBlock.id == block_id,
            AvailabilityBlock.unit_id == unit_id,
        )
    ).first()

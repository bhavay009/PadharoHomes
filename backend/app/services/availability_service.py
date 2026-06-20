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
from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.models.availability import AvailabilityBlock
from app.models.unit import Unit


class UnavailableError(Exception):
    """Requested dates overlap an existing block (maps to HTTP 409)."""


def _overlap_clause(model, check_in: date, check_out: date):
    # half-open overlap: start < check_out AND end > check_in
    return and_(model.start_date < check_out, model.end_date > check_in)


def list_blocks(db: Session, unit_id: uuid.UUID) -> list[AvailabilityBlock]:
    return list(
        db.scalars(
            select(AvailabilityBlock)
            .where(AvailabilityBlock.unit_id == unit_id)
            .order_by(AvailabilityBlock.start_date)
        ).all()
    )


def is_available(
    db: Session, unit_id: uuid.UUID, check_in: date, check_out: date
) -> bool:
    """True if no block overlaps [check_in, check_out)."""
    conflict = db.scalars(
        select(AvailabilityBlock.id).where(
            AvailabilityBlock.unit_id == unit_id,
            _overlap_clause(AvailabilityBlock, check_in, check_out),
        )
    ).first()
    return conflict is None


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
    locked = db.execute(
        select(Unit.id).where(Unit.id == unit_id).with_for_update()
    ).first()
    if locked is None:
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

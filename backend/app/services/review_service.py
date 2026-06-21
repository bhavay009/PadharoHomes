"""Reviews & ratings domain logic.

A guest may review a booking they made (matched by email) once it is paid
(confirmed/checked_in/completed). One review per booking.
"""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus
from app.models.review import Review

REVIEWABLE_STATUSES = (
    BookingStatus.confirmed,
    BookingStatus.checked_in,
    BookingStatus.completed,
)


class ReviewError(Exception):
    """Invalid review action (maps to HTTP 400)."""


class ReviewForbiddenError(Exception):
    """The booking isn't the requester's (maps to HTTP 403)."""


class ReviewConflictError(Exception):
    """A review already exists for this booking (maps to HTTP 409)."""


def list_unit_reviews(
    db: Session, unit_id: uuid.UUID, *, limit: int = 20, offset: int = 0
) -> tuple[list[Review], int]:
    filters = [Review.unit_id == unit_id]
    total = db.scalar(select(func.count()).select_from(Review).where(*filters)) or 0
    items = list(
        db.scalars(
            select(Review)
            .where(*filters)
            .order_by(Review.created_at.desc())
            .limit(limit)
            .offset(offset)
        ).all()
    )
    return items, total


def rating_for_unit(db: Session, unit_id: uuid.UUID) -> tuple[float | None, int]:
    row = db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.unit_id == unit_id
        )
    ).one()
    avg, count = row
    return (round(float(avg), 2) if avg is not None else None), int(count or 0)


def ratings_for_units(
    db: Session, unit_ids: list[uuid.UUID]
) -> dict[uuid.UUID, tuple[float | None, int]]:
    if not unit_ids:
        return {}
    rows = db.execute(
        select(Review.unit_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.unit_id.in_(unit_ids))
        .group_by(Review.unit_id)
    ).all()
    return {uid: (round(float(avg), 2), int(cnt)) for uid, avg, cnt in rows}


def reviewed_booking_ids(
    db: Session, booking_ids: list[uuid.UUID]
) -> set[uuid.UUID]:
    if not booking_ids:
        return set()
    rows = db.scalars(
        select(Review.booking_id).where(Review.booking_id.in_(booking_ids))
    ).all()
    return set(rows)


def create_review(
    db: Session,
    *,
    booking_id: uuid.UUID,
    reviewer_email: str,
    rating: int,
    comment: str | None,
) -> Review:
    booking = db.get(Booking, booking_id)
    if booking is None:
        raise ReviewError("Booking not found.")
    if booking.guest_email != reviewer_email.strip().lower():
        raise ReviewForbiddenError("You can only review your own bookings.")
    if booking.status not in REVIEWABLE_STATUSES:
        raise ReviewError("You can review a booking only after it is confirmed.")

    existing = db.scalars(
        select(Review.id).where(Review.booking_id == booking_id)
    ).first()
    if existing is not None:
        raise ReviewConflictError("You have already reviewed this stay.")

    review = Review(
        booking_id=booking.id,
        unit_id=booking.unit_id,
        host_id=booking.host_id,
        guest_email=booking.guest_email,
        guest_name=booking.guest_name,
        rating=rating,
        comment=(comment or None),
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review

"""Platform-wide admin oversight queries + moderation."""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.booking import ACTIVE_BOOKING_STATUSES, Booking, BookingStatus
from app.models.host import Host
from app.models.review import Review
from app.models.unit import Unit, UnitStatus

_CENTS = Decimal("0.01")


def platform_stats(db: Session) -> dict:
    def count(model, *where):
        return db.scalar(select(func.count()).select_from(model).where(*where)) or 0

    units_by_status = {
        s.value: count(Unit, Unit.status == s) for s in UnitStatus
    }
    bookings_by_status = {
        s.value: count(Booking, Booking.status == s) for s in BookingStatus
    }
    revenue = db.scalar(
        select(func.coalesce(func.sum(Booking.subtotal), 0)).where(
            Booking.status.in_(ACTIVE_BOOKING_STATUSES)
        )
    ) or Decimal("0")
    deposits = db.scalar(
        select(func.coalesce(func.sum(Booking.deposit_amount), 0)).where(
            Booking.deposit_paid_at.is_not(None)
        )
    ) or Decimal("0")
    avg_rating = db.scalar(select(func.avg(Review.rating)))

    return {
        "total_hosts": count(Host),
        "total_units": count(Unit),
        "units_by_status": units_by_status,
        "total_bookings": count(Booking),
        "bookings_by_status": bookings_by_status,
        "total_reviews": count(Review),
        "average_rating": round(float(avg_rating), 2) if avg_rating is not None else None,
        "gross_booking_value": revenue.quantize(_CENTS),
        "deposits_collected": deposits.quantize(_CENTS),
        "currency": "INR",
    }


def list_hosts(db: Session, *, limit: int, offset: int) -> tuple[list[dict], int]:
    total = db.scalar(select(func.count()).select_from(Host)) or 0
    hosts = list(
        db.scalars(
            select(Host).order_by(Host.created_at.desc()).limit(limit).offset(offset)
        ).all()
    )
    unit_counts = dict(
        db.execute(
            select(Unit.host_id, func.count()).group_by(Unit.host_id)
        ).all()
    )
    booking_counts = dict(
        db.execute(
            select(Booking.host_id, func.count()).group_by(Booking.host_id)
        ).all()
    )
    rows = [
        {
            "id": h.id,
            "email": h.email,
            "full_name": h.full_name,
            "created_at": h.created_at,
            "unit_count": unit_counts.get(h.id, 0),
            "booking_count": booking_counts.get(h.id, 0),
        }
        for h in hosts
    ]
    return rows, total


def list_units(
    db: Session, *, status: UnitStatus | None, limit: int, offset: int
) -> tuple[list[dict], int]:
    filters = []
    if status is not None:
        filters.append(Unit.status == status)
    total = db.scalar(select(func.count()).select_from(Unit).where(*filters)) or 0
    rows = db.execute(
        select(Unit, Host.email)
        .join(Host, Host.id == Unit.host_id)
        .where(*filters)
        .order_by(Unit.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    items = [
        {
            "id": u.id,
            "title": u.title,
            "city": u.city,
            "status": u.status.value,
            "base_price": u.base_price,
            "currency": u.currency,
            "host_email": email,
            "created_at": u.created_at,
        }
        for (u, email) in rows
    ]
    return items, total


def list_bookings(
    db: Session, *, status: BookingStatus | None, limit: int, offset: int
) -> tuple[list[dict], int]:
    filters = []
    if status is not None:
        filters.append(Booking.status == status)
    total = db.scalar(select(func.count()).select_from(Booking).where(*filters)) or 0
    rows = db.execute(
        select(Booking, Unit.title, Host.email)
        .join(Unit, Unit.id == Booking.unit_id)
        .join(Host, Host.id == Booking.host_id)
        .where(*filters)
        .order_by(Booking.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    items = [
        {
            "id": b.id,
            "guest_name": b.guest_name,
            "guest_email": b.guest_email,
            "unit_title": title,
            "host_email": email,
            "check_in": b.check_in,
            "check_out": b.check_out,
            "subtotal": b.subtotal,
            "status": b.status.value,
        }
        for (b, title, email) in rows
    ]
    return items, total


def list_reviews(db: Session, *, limit: int, offset: int) -> tuple[list[dict], int]:
    total = db.scalar(select(func.count()).select_from(Review)) or 0
    rows = db.execute(
        select(Review, Unit.title)
        .join(Unit, Unit.id == Review.unit_id)
        .order_by(Review.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    items = [
        {
            "id": r.id,
            "guest_name": r.guest_name,
            "unit_title": title,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
        }
        for (r, title) in rows
    ]
    return items, total


def set_unit_status(db: Session, unit_id: uuid.UUID, status: UnitStatus) -> Unit | None:
    unit = db.get(Unit, unit_id)
    if unit is None:
        return None
    unit.status = status
    db.commit()
    db.refresh(unit)
    return unit


def delete_review(db: Session, review_id: uuid.UUID) -> bool:
    review = db.get(Review, review_id)
    if review is None:
        return False
    db.delete(review)
    db.commit()
    return True

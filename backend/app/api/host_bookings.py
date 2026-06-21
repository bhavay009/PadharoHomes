"""Host-facing booking management + dashboard metrics (authenticated)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_host
from app.core.database import get_db
from app.models.booking import BookingStatus
from app.models.host import Host
from app.schemas.booking import (
    BookingOut,
    CompleteIn,
    DashboardMetricsOut,
    HostBookingListOut,
)
from app.services import booking_service, metrics_service, review_service

router = APIRouter(tags=["host-bookings"])


def _load(db: Session, host: Host, booking_id: uuid.UUID):
    booking = booking_service.get_host_booking(db, host.id, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return booking


@router.get("/bookings", response_model=HostBookingListOut)
def list_bookings(
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
    status_filter: BookingStatus | None = Query(default=None, alias="status"),
    unit_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> HostBookingListOut:
    items, total = booking_service.list_host_bookings(
        db, host.id, status=status_filter, unit_id=unit_id, limit=limit, offset=offset
    )
    return HostBookingListOut(
        items=[BookingOut.model_validate(b) for b in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> BookingOut:
    return BookingOut.model_validate(_load(db, host, booking_id))


def _transition(db, host, booking_id, fn, *args):
    booking = _load(db, host, booking_id)
    try:
        return BookingOut.model_validate(fn(db, booking, *args))
    except booking_service.BookingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/bookings/{booking_id}/check-in", response_model=BookingOut)
def check_in(
    booking_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    return _transition(db, host, booking_id, booking_service.check_in)


@router.post("/bookings/{booking_id}/complete", response_model=BookingOut)
def complete(
    booking_id: uuid.UUID,
    payload: CompleteIn,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    booking = _load(db, host, booking_id)
    try:
        return BookingOut.model_validate(
            booking_service.complete(
                db, booking, balance_collected=payload.balance_collected
            )
        )
    except booking_service.BookingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/bookings/{booking_id}/no-show", response_model=BookingOut)
def no_show(
    booking_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    return _transition(db, host, booking_id, booking_service.mark_no_show)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
def host_cancel(
    booking_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    return _transition(db, host, booking_id, booking_service.cancel)


@router.get("/trips", response_model=HostBookingListOut)
def my_trips(
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> HostBookingListOut:
    """Bookings the logged-in user made as a guest, matched by their email."""
    items, total = booking_service.list_guest_bookings(
        db, host.email, limit=limit, offset=offset
    )
    reviewed = review_service.reviewed_booking_ids(db, [b.id for b in items])
    out = []
    for b in items:
        bo = BookingOut.model_validate(b)
        bo.reviewed = b.id in reviewed
        out.append(bo)
    return HostBookingListOut(items=out, total=total, limit=limit, offset=offset)


@router.get("/dashboard/metrics", response_model=DashboardMetricsOut)
def dashboard_metrics(
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> DashboardMetricsOut:
    return DashboardMetricsOut(**metrics_service.dashboard_metrics(db, host.id))

"""Public (no-auth) storefront routes for guests.

Only published units are exposed. Reuses the pricing/availability services so
quotes and calendars are identical to the host-facing ones.
"""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.availability import AvailabilityOut, CalendarDayOut, QuoteOut
from app.schemas.booking import (
    BookingCreate,
    BookingCreateOut,
    BookingOut,
    PaymentIntentOut,
)
from app.schemas.public import PublicUnitListOut, PublicUnitOut
from app.services import (
    availability_service,
    booking_service,
    pricing_service,
    public_service,
)

router = APIRouter(prefix="/public", tags=["public"])


def _require_dates_pair(check_in: date | None, check_out: date | None) -> None:
    if (check_in is None) != (check_out is None):
        raise HTTPException(
            status_code=400,
            detail="Provide both check_in and check_out, or neither.",
        )
    if check_in is not None and check_out is not None and check_out <= check_in:
        raise HTTPException(
            status_code=400, detail="check_out must be after check_in."
        )


@router.get("/units", response_model=PublicUnitListOut)
def browse_units(
    db: Session = Depends(get_db),
    city: str | None = Query(default=None),
    guests: int | None = Query(default=None, ge=1),
    min_price: Decimal | None = Query(default=None, ge=0),
    max_price: Decimal | None = Query(default=None, ge=0),
    check_in: date | None = Query(default=None),
    check_out: date | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> PublicUnitListOut:
    _require_dates_pair(check_in, check_out)
    items, total = public_service.list_published_units(
        db,
        city=city,
        guests=guests,
        min_price=min_price,
        max_price=max_price,
        check_in=check_in,
        check_out=check_out,
        limit=limit,
        offset=offset,
    )
    return PublicUnitListOut(
        items=[PublicUnitOut.model_validate(u) for u in items],
        total=total,
        limit=limit,
        offset=offset,
    )


def _get_published_or_404(db: Session, unit_id: uuid.UUID):
    unit = public_service.get_published_unit(db, unit_id)
    if unit is None:
        raise HTTPException(status_code=404, detail="Listing not found.")
    return unit


@router.get("/units/{unit_id}", response_model=PublicUnitOut)
def unit_detail(unit_id: uuid.UUID, db: Session = Depends(get_db)) -> PublicUnitOut:
    return PublicUnitOut.model_validate(_get_published_or_404(db, unit_id))


@router.get("/units/{unit_id}/availability", response_model=AvailabilityOut)
def unit_availability(
    unit_id: uuid.UUID,
    check_in: date = Query(...),
    check_out: date = Query(...),
    db: Session = Depends(get_db),
) -> AvailabilityOut:
    _get_published_or_404(db, unit_id)
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in.")
    available = availability_service.is_available(db, unit_id, check_in, check_out)
    return AvailabilityOut(available=available, check_in=check_in, check_out=check_out)


@router.get("/units/{unit_id}/quote", response_model=QuoteOut)
def unit_quote(
    unit_id: uuid.UUID,
    check_in: date = Query(...),
    check_out: date = Query(...),
    db: Session = Depends(get_db),
):
    unit = _get_published_or_404(db, unit_id)
    try:
        return pricing_service.quote(db, unit, check_in, check_out)
    except pricing_service.QuoteError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/units/{unit_id}/calendar", response_model=list[CalendarDayOut])
def unit_calendar(
    unit_id: uuid.UUID,
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    unit = _get_published_or_404(db, unit_id)
    try:
        return pricing_service.calendar(db, unit, start, end)
    except pricing_service.QuoteError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---- Guest bookings (hold-then-pay) ----
@router.post(
    "/units/{unit_id}/bookings",
    response_model=BookingCreateOut,
    status_code=201,
)
def create_booking(
    unit_id: uuid.UUID,
    payload: BookingCreate,
    db: Session = Depends(get_db),
) -> BookingCreateOut:
    unit = _get_published_or_404(db, unit_id)
    try:
        booking, payment, client = booking_service.create_hold(
            db,
            unit,
            guest_name=payload.guest_name,
            guest_email=payload.guest_email,
            guest_phone=payload.guest_phone,
            check_in=payload.check_in,
            check_out=payload.check_out,
        )
        db.commit()
        db.refresh(booking)
    except booking_service.BookingUnavailableError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except booking_service.BookingError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BookingCreateOut(
        booking=BookingOut.model_validate(booking),
        payment=PaymentIntentOut(
            intent_id=payment.intent_id,
            gateway=payment.gateway,
            amount=payment.amount,
            currency=payment.currency,
            client=client,
        ),
    )


def _get_booking_or_404(db: Session, booking_id: uuid.UUID):
    booking = booking_service.get_booking(db, booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found.")
    return booking


@router.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: uuid.UUID, db: Session = Depends(get_db)) -> BookingOut:
    return BookingOut.model_validate(_get_booking_or_404(db, booking_id))


@router.post("/bookings/{booking_id}/pay", response_model=BookingOut)
def pay_booking(booking_id: uuid.UUID, db: Session = Depends(get_db)) -> BookingOut:
    booking = _get_booking_or_404(db, booking_id)
    try:
        booking = booking_service.pay_deposit(db, booking)
    except booking_service.BookingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BookingOut.model_validate(booking)


@router.post("/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: uuid.UUID, db: Session = Depends(get_db)) -> BookingOut:
    booking = _get_booking_or_404(db, booking_id)
    try:
        booking = booking_service.cancel(db, booking)
    except booking_service.BookingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BookingOut.model_validate(booking)

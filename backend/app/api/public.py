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
from app.schemas.public import PublicUnitListOut, PublicUnitOut
from app.services import availability_service, pricing_service, public_service

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

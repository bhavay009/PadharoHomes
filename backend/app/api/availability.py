"""Availability & pricing routes — host-authenticated, scoped to a unit.

Mounted under /units/{unit_id}. Quote/calendar/availability are host-facing
previews here; Phase 4 exposes guest-facing variants on the public storefront.
"""
from __future__ import annotations

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_host
from app.core.database import get_db
from app.models.host import Host
from app.schemas.availability import (
    AvailabilityOut,
    BlockIn,
    BlockOut,
    CalendarDayOut,
    QuoteOut,
    RateIn,
    RateOut,
)
from app.services import availability_service, pricing_service, unit_service

router = APIRouter(prefix="/units/{unit_id}", tags=["availability"])


def _load_unit(db: Session, host: Host, unit_id: uuid.UUID):
    try:
        return unit_service.get_unit(db, host.id, unit_id)
    except unit_service.UnitNotFoundError:
        raise HTTPException(status_code=404, detail="Unit not found.")


# ---- Blocks ----
@router.get("/blocks", response_model=list[BlockOut])
def list_blocks(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    _load_unit(db, host, unit_id)
    return [BlockOut.model_validate(b) for b in availability_service.list_blocks(db, unit_id)]


@router.post("/blocks", response_model=BlockOut, status_code=status.HTTP_201_CREATED)
def create_block(
    unit_id: uuid.UUID,
    payload: BlockIn,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    _load_unit(db, host, unit_id)
    try:
        block = availability_service.reserve_block(
            db, unit_id, payload.start_date, payload.end_date, payload.reason
        )
        db.commit()
        db.refresh(block)
    except availability_service.UnavailableError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return BlockOut.model_validate(block)


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_block(
    unit_id: uuid.UUID,
    block_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> Response:
    _load_unit(db, host, unit_id)
    block = availability_service.get_block(db, unit_id, block_id)
    if block is None:
        raise HTTPException(status_code=404, detail="Block not found.")
    availability_service.delete_block(db, block)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- Seasonal rates ----
@router.get("/rates", response_model=list[RateOut])
def list_rates(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    _load_unit(db, host, unit_id)
    return [RateOut.model_validate(r) for r in pricing_service.list_rates(db, unit_id)]


@router.post("/rates", response_model=RateOut, status_code=status.HTTP_201_CREATED)
def create_rate(
    unit_id: uuid.UUID,
    payload: RateIn,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    _load_unit(db, host, unit_id)
    try:
        rate = pricing_service.create_rate(
            db, unit_id, payload.start_date, payload.end_date, payload.price
        )
    except pricing_service.RateOverlapError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return RateOut.model_validate(rate)


@router.delete("/rates/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rate(
    unit_id: uuid.UUID,
    rate_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> Response:
    _load_unit(db, host, unit_id)
    rate = pricing_service.get_rate(db, unit_id, rate_id)
    if rate is None:
        raise HTTPException(status_code=404, detail="Rate not found.")
    pricing_service.delete_rate(db, rate)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---- Availability / quote / calendar ----
@router.get("/availability", response_model=AvailabilityOut)
def check_availability(
    unit_id: uuid.UUID,
    check_in: date = Query(...),
    check_out: date = Query(...),
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    _load_unit(db, host, unit_id)
    if check_out <= check_in:
        raise HTTPException(status_code=400, detail="check_out must be after check_in.")
    available = availability_service.is_available(db, unit_id, check_in, check_out)
    return AvailabilityOut(available=available, check_in=check_in, check_out=check_out)


@router.get("/quote", response_model=QuoteOut)
def get_quote(
    unit_id: uuid.UUID,
    check_in: date = Query(...),
    check_out: date = Query(...),
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    unit = _load_unit(db, host, unit_id)
    try:
        return pricing_service.quote(db, unit, check_in, check_out)
    except pricing_service.QuoteError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/calendar", response_model=list[CalendarDayOut])
def get_calendar(
    unit_id: uuid.UUID,
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
):
    unit = _load_unit(db, host, unit_id)
    try:
        return pricing_service.calendar(db, unit, start, end)
    except pricing_service.QuoteError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

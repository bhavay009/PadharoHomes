"""Admin dashboard: platform oversight + moderation (admin-only)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.booking import BookingStatus
from app.models.host import Host
from app.models.unit import UnitStatus
from app.schemas.admin import (
    AdminBookingList,
    AdminHostList,
    AdminReviewList,
    AdminStats,
    AdminUnitList,
    AdminUnitOut,
)
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db)) -> AdminStats:
    return AdminStats(**admin_service.platform_stats(db))


@router.get("/hosts", response_model=AdminHostList)
def hosts(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AdminHostList:
    items, total = admin_service.list_hosts(db, limit=limit, offset=offset)
    return AdminHostList(items=items, total=total, limit=limit, offset=offset)


@router.get("/units", response_model=AdminUnitList)
def units(
    db: Session = Depends(get_db),
    status_filter: UnitStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AdminUnitList:
    items, total = admin_service.list_units(db, status=status_filter, limit=limit, offset=offset)
    return AdminUnitList(items=items, total=total, limit=limit, offset=offset)


@router.patch("/units/{unit_id}/status", response_model=AdminUnitOut)
def moderate_unit(
    unit_id: uuid.UUID,
    new_status: UnitStatus = Query(..., alias="status"),
    db: Session = Depends(get_db),
):
    unit = admin_service.set_unit_status(db, unit_id, new_status)
    if unit is None:
        raise HTTPException(status_code=404, detail="Unit not found.")
    return AdminUnitOut(
        id=unit.id, title=unit.title, city=unit.city, status=unit.status.value,
        base_price=unit.base_price, currency=unit.currency,
        host_email="", created_at=unit.created_at,
    )


@router.get("/bookings", response_model=AdminBookingList)
def bookings(
    db: Session = Depends(get_db),
    status_filter: BookingStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AdminBookingList:
    items, total = admin_service.list_bookings(db, status=status_filter, limit=limit, offset=offset)
    return AdminBookingList(items=items, total=total, limit=limit, offset=offset)


@router.get("/reviews", response_model=AdminReviewList)
def reviews(
    db: Session = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> AdminReviewList:
    items, total = admin_service.list_reviews(db, limit=limit, offset=offset)
    return AdminReviewList(items=items, total=total, limit=limit, offset=offset)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: uuid.UUID, db: Session = Depends(get_db)) -> Response:
    if not admin_service.delete_review(db, review_id):
        raise HTTPException(status_code=404, detail="Review not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

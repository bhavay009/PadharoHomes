"""Unit (listing) domain logic: CRUD, search/filter, bulk actions.

All operations are scoped to a host_id so a host can only ever touch their own
units.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.unit import Unit, UnitPhoto, UnitStatus


class UnitNotFoundError(Exception):
    """Raised when a unit does not exist for this host (maps to HTTP 404)."""


def create_unit(db: Session, host_id: uuid.UUID, data: dict) -> Unit:
    unit = Unit(host_id=host_id, **data)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


def get_unit(db: Session, host_id: uuid.UUID, unit_id: uuid.UUID) -> Unit:
    unit = db.scalars(
        select(Unit)
        .options(selectinload(Unit.photos))
        .where(Unit.id == unit_id, Unit.host_id == host_id)
    ).first()
    if unit is None:
        raise UnitNotFoundError("Unit not found.")
    return unit


def list_units(
    db: Session,
    host_id: uuid.UUID,
    *,
    q: str | None = None,
    city: str | None = None,
    status: UnitStatus | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Unit], int]:
    """Return (items, total) for the host's units with optional filters."""
    filters = [Unit.host_id == host_id]
    if city:
        filters.append(func.lower(Unit.city) == city.strip().lower())
    if status is not None:
        filters.append(Unit.status == status)
    if q:
        like = f"%{q.strip().lower()}%"
        filters.append(
            or_(
                func.lower(Unit.title).like(like),
                func.lower(Unit.city).like(like),
            )
        )

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


def update_unit(
    db: Session, host_id: uuid.UUID, unit_id: uuid.UUID, data: dict
) -> Unit:
    unit = get_unit(db, host_id, unit_id)
    for key, value in data.items():
        setattr(unit, key, value)
    db.commit()
    db.refresh(unit)
    return unit


def delete_unit(db: Session, host_id: uuid.UUID, unit_id: uuid.UUID) -> list[str]:
    """Delete a unit; return the storage_ids of its photos so the caller can
    remove them from object storage."""
    unit = get_unit(db, host_id, unit_id)
    storage_ids = [p.storage_id for p in unit.photos]
    db.delete(unit)
    db.commit()
    return storage_ids


def bulk_update(
    db: Session,
    host_id: uuid.UUID,
    unit_ids: list[uuid.UUID],
    *,
    status: UnitStatus | None = None,
    base_price: Decimal | None = None,
) -> int:
    """Apply status and/or base_price to a set of the host's units. Returns count."""
    units = list(
        db.scalars(
            select(Unit).where(Unit.host_id == host_id, Unit.id.in_(unit_ids))
        ).all()
    )
    for unit in units:
        if status is not None:
            unit.status = status
        if base_price is not None:
            unit.base_price = base_price
    db.commit()
    return len(units)


def add_photo(
    db: Session,
    unit: Unit,
    *,
    url: str,
    storage_id: str,
) -> UnitPhoto:
    next_order = (
        max((p.sort_order for p in unit.photos), default=-1) + 1
    )
    photo = UnitPhoto(
        unit_id=unit.id, url=url, storage_id=storage_id, sort_order=next_order
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


def get_photo(
    db: Session, host_id: uuid.UUID, unit_id: uuid.UUID, photo_id: uuid.UUID
) -> UnitPhoto:
    unit = get_unit(db, host_id, unit_id)
    photo = db.scalars(
        select(UnitPhoto).where(
            UnitPhoto.id == photo_id, UnitPhoto.unit_id == unit.id
        )
    ).first()
    if photo is None:
        raise UnitNotFoundError("Photo not found.")
    return photo


def delete_photo(db: Session, photo: UnitPhoto) -> None:
    db.delete(photo)
    db.commit()

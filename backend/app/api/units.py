"""Unit (listing) management routes — host-authenticated.

Every route is scoped to the authenticated host; a host can only see/modify
their own units.
"""
from __future__ import annotations

import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_host
from app.core.database import get_db
from app.models.host import Host
from app.models.unit import UnitStatus
from app.schemas.unit import (
    BulkUpdateIn,
    BulkUpdateOut,
    PhotoOut,
    UnitCreate,
    UnitListOut,
    UnitOut,
    UnitUpdate,
)
from app.services import storage, unit_service

router = APIRouter(prefix="/units", tags=["units"])

_MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("", response_model=UnitOut, status_code=status.HTTP_201_CREATED)
def create_unit(
    payload: UnitCreate,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> UnitOut:
    unit = unit_service.create_unit(db, host.id, payload.model_dump())
    return UnitOut.model_validate(unit)


@router.get("", response_model=UnitListOut)
def list_units(
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
    q: str | None = Query(default=None, description="Search title/city"),
    city: str | None = Query(default=None),
    status_filter: UnitStatus | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> UnitListOut:
    items, total = unit_service.list_units(
        db,
        host.id,
        q=q,
        city=city,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return UnitListOut(
        items=[UnitOut.model_validate(u) for u in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/bulk", response_model=BulkUpdateOut)
def bulk_update(
    payload: BulkUpdateIn,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> BulkUpdateOut:
    updated = unit_service.bulk_update(
        db,
        host.id,
        payload.unit_ids,
        status=payload.status,
        base_price=payload.base_price,
    )
    return BulkUpdateOut(updated=updated)


@router.get("/{unit_id}", response_model=UnitOut)
def get_unit(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> UnitOut:
    try:
        unit = unit_service.get_unit(db, host.id, unit_id)
    except unit_service.UnitNotFoundError:
        raise HTTPException(status_code=404, detail="Unit not found.")
    return UnitOut.model_validate(unit)


@router.patch("/{unit_id}", response_model=UnitOut)
def update_unit(
    unit_id: uuid.UUID,
    payload: UnitUpdate,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> UnitOut:
    data = payload.model_dump(exclude_unset=True)
    try:
        unit = unit_service.update_unit(db, host.id, unit_id, data)
    except unit_service.UnitNotFoundError:
        raise HTTPException(status_code=404, detail="Unit not found.")
    return UnitOut.model_validate(unit)


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> Response:
    try:
        storage_ids = unit_service.delete_unit(db, host.id, unit_id)
    except unit_service.UnitNotFoundError:
        raise HTTPException(status_code=404, detail="Unit not found.")
    # Best-effort cleanup of stored assets; DB row is already gone.
    for sid in storage_ids:
        try:
            storage.delete_image(sid)
        except storage.StorageNotConfiguredError:
            break
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{unit_id}/photos",
    response_model=PhotoOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    unit_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> PhotoOut:
    try:
        unit = unit_service.get_unit(db, host.id, unit_id)
    except unit_service.UnitNotFoundError:
        raise HTTPException(status_code=404, detail="Unit not found.")

    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type: {file.content_type}",
        )
    data = await file.read()
    if len(data) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 5 MB limit.")

    try:
        asset = storage.upload_image(data, folder=f"padharo/units/{unit.id}")
    except storage.StorageNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    photo = unit_service.add_photo(
        db, unit, url=asset.url, storage_id=asset.storage_id
    )
    return PhotoOut.model_validate(photo)


@router.delete(
    "/{unit_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_photo(
    unit_id: uuid.UUID,
    photo_id: uuid.UUID,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> Response:
    try:
        photo = unit_service.get_photo(db, host.id, unit_id, photo_id)
    except unit_service.UnitNotFoundError:
        raise HTTPException(status_code=404, detail="Photo not found.")
    storage_id = photo.storage_id
    unit_service.delete_photo(db, photo)
    try:
        storage.delete_image(storage_id)
    except storage.StorageNotConfiguredError:
        pass
    return Response(status_code=status.HTTP_204_NO_CONTENT)

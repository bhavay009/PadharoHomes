"""Host profile: view/update + avatar upload (authenticated)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_host
from app.core.database import get_db
from app.models.host import Host
from app.schemas.profile import HostProfileOut, HostProfileUpdate
from app.services import storage

router = APIRouter(prefix="/me", tags=["profile"])

_MAX_IMAGE_BYTES = 5 * 1024 * 1024
_ALLOWED = {"image/jpeg", "image/png", "image/webp"}


@router.get("/profile", response_model=HostProfileOut)
def get_profile(host: Host = Depends(get_current_host)) -> HostProfileOut:
    return HostProfileOut.model_validate(host)


@router.patch("/profile", response_model=HostProfileOut)
def update_profile(
    payload: HostProfileUpdate,
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> HostProfileOut:
    data = payload.model_dump(exclude_unset=True)
    if "languages" in data and data["languages"] is not None:
        data["languages"] = [s.strip() for s in data["languages"] if s and s.strip()]
    for key, value in data.items():
        setattr(host, key, value)
    db.commit()
    db.refresh(host)
    return HostProfileOut.model_validate(host)


@router.post("/avatar", response_model=HostProfileOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    host: Host = Depends(get_current_host),
) -> HostProfileOut:
    if file.content_type not in _ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {file.content_type}")
    data = await file.read()
    if len(data) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 5 MB limit.")
    try:
        asset = storage.upload_image(data, folder=f"padharo/hosts/{host.id}")
    except storage.StorageNotConfiguredError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Remove the previous avatar from storage if there was one.
    if host.avatar_storage_id:
        try:
            storage.delete_image(host.avatar_storage_id)
        except storage.StorageNotConfiguredError:
            pass

    host.avatar_url = asset.url
    host.avatar_storage_id = asset.storage_id
    db.commit()
    db.refresh(host)
    return HostProfileOut.model_validate(host)

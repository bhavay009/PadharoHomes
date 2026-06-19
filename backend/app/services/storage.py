"""Cloudinary photo storage wrapper.

Credentials come from settings (env). If Cloudinary is not configured, upload
attempts raise a clear error rather than silently faking a stored asset.
"""
from __future__ import annotations

from dataclasses import dataclass

import cloudinary
import cloudinary.uploader

from app.core.config import settings


class StorageNotConfiguredError(RuntimeError):
    """Raised when an upload is attempted without Cloudinary configured."""


@dataclass
class StoredAsset:
    url: str
    storage_id: str  # Cloudinary public_id


def _ensure_configured() -> None:
    if not settings.cloudinary_configured:
        raise StorageNotConfiguredError(
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in backend/.env."
        )
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def upload_image(data: bytes, folder: str) -> StoredAsset:
    """Upload raw image bytes to Cloudinary; return the secure URL + public_id."""
    _ensure_configured()
    result = cloudinary.uploader.upload(
        data, folder=folder, resource_type="image"
    )
    return StoredAsset(url=result["secure_url"], storage_id=result["public_id"])


def delete_image(storage_id: str) -> None:
    """Delete an asset from Cloudinary by public_id."""
    _ensure_configured()
    cloudinary.uploader.destroy(storage_id, resource_type="image")

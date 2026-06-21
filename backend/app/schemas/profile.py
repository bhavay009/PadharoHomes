"""Host profile schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class HostProfileOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    bio: str | None
    avatar_url: str | None
    languages: list[str]
    response_time: str | None
    phone: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class HostProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=1000)
    languages: list[str] | None = None
    response_time: str | None = Field(default=None, max_length=50)
    phone: str | None = Field(default=None, max_length=40)


class PublicHostOut(BaseModel):
    """Host snippet shown to guests on a listing."""

    name: str | None
    avatar_url: str | None
    bio: str | None
    languages: list[str]
    response_time: str | None
    member_since: datetime

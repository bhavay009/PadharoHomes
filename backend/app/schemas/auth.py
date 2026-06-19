"""Auth request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class RequestOtpIn(BaseModel):
    email: EmailStr


class RequestOtpOut(BaseModel):
    detail: str
    # Only populated in non-production (dev) mode so the flow is testable without
    # an email provider. Never returned in production.
    dev_otp: str | None = None


class VerifyOtpIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)


class HostOut(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    host: HostOut

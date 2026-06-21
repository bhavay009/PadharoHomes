"""Auth request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


def _exactly_one(email, phone):
    if bool(email) == bool(phone):
        raise ValueError("Provide either email or phone, not both.")


class RequestOtpIn(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)

    @model_validator(mode="after")
    def _one(self):
        _exactly_one(self.email, self.phone)
        return self


class RequestOtpOut(BaseModel):
    detail: str
    # Only populated in dev mode (no provider) so the flow is testable.
    dev_otp: str | None = None


class VerifyOtpIn(BaseModel):
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    code: str = Field(min_length=4, max_length=12)

    @model_validator(mode="after")
    def _one(self):
        _exactly_one(self.email, self.phone)
        return self


class HostOut(BaseModel):
    id: uuid.UUID
    email: EmailStr | None
    phone: str | None = None
    full_name: str | None
    is_active: bool
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    host: HostOut

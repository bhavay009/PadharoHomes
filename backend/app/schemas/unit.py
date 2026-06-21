"""Unit (listing) request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.unit import UnitStatus


class PhotoOut(BaseModel):
    id: uuid.UUID
    url: str
    sort_order: int

    model_config = {"from_attributes": True}


class UnitBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    property_type: str = Field(default="apartment", max_length=40)
    description: str | None = None
    # Location
    address_line: str | None = Field(default=None, max_length=300)
    city: str = Field(min_length=1, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    country: str = Field(default="India", max_length=120)
    pincode: str | None = Field(default=None, max_length=20)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    # Capacity
    capacity: int = Field(ge=1, default=1)
    bedrooms: int | None = Field(default=None, ge=0)
    beds: int | None = Field(default=None, ge=0)
    bathrooms: int | None = Field(default=None, ge=0)
    amenities: list[str] = Field(default_factory=list)
    house_rules: str | None = None
    # Pricing
    base_price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    weekend_price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    cleaning_fee: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    service_fee: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    security_deposit: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    taxes_percent: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)
    weekly_discount_percent: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)
    monthly_discount_percent: Decimal | None = Field(default=None, ge=0, le=100, max_digits=5, decimal_places=2)
    deposit_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, max_digits=5, decimal_places=2)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    # Availability
    min_stay_nights: int = Field(default=1, ge=1)
    max_stay_nights: int | None = Field(default=None, ge=1)
    instant_book: bool = False
    # House rules
    check_in_time: str | None = Field(default=None, max_length=5)
    check_out_time: str | None = Field(default=None, max_length=5)
    pets_allowed: bool = False
    smoking_allowed: bool = False
    parties_allowed: bool = False
    quiet_hours: str | None = Field(default=None, max_length=100)
    # Safety
    smoke_alarm: bool = False
    fire_extinguisher: bool = False
    first_aid_kit: bool = False
    emergency_contact: str | None = Field(default=None, max_length=100)

    @field_validator("amenities")
    @classmethod
    def _clean_amenities(cls, v: list[str]) -> list[str]:
        return [a.strip() for a in v if a and a.strip()]


class UnitCreate(UnitBase):
    status: UnitStatus = UnitStatus.draft


class UnitUpdate(BaseModel):
    """All fields optional — partial update."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    address_line: str | None = Field(default=None, max_length=300)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    country: str | None = Field(default=None, max_length=120)
    pincode: str | None = Field(default=None, max_length=20)
    capacity: int | None = Field(default=None, ge=1)
    bedrooms: int | None = Field(default=None, ge=0)
    bathrooms: int | None = Field(default=None, ge=0)
    amenities: list[str] | None = None
    house_rules: str | None = None
    base_price: Decimal | None = Field(
        default=None, gt=0, max_digits=10, decimal_places=2
    )
    weekend_price: Decimal | None = Field(
        default=None, gt=0, max_digits=10, decimal_places=2
    )
    deposit_percent: Decimal | None = Field(
        default=None, ge=0, le=100, max_digits=5, decimal_places=2
    )
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    min_stay_nights: int | None = Field(default=None, ge=1)
    status: UnitStatus | None = None


class UnitOut(UnitBase):
    id: uuid.UUID
    host_id: uuid.UUID
    status: UnitStatus
    photos: list[PhotoOut] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class UnitListOut(BaseModel):
    items: list[UnitOut]
    total: int
    limit: int
    offset: int


class BulkUpdateIn(BaseModel):
    unit_ids: list[uuid.UUID] = Field(min_length=1)
    # Provide at least one: set status and/or set base_price across the units.
    status: UnitStatus | None = None
    base_price: Decimal | None = Field(
        default=None, gt=0, max_digits=10, decimal_places=2
    )

    @model_validator(mode="after")
    def _require_one_field(self):
        if self.status is None and self.base_price is None:
            raise ValueError("Provide at least one of: status, base_price.")
        return self


class BulkUpdateOut(BaseModel):
    updated: int

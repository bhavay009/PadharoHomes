"""Public (guest-facing) storefront schemas.

Deliberately omits host-internal fields (host_id, status). Only published units
are ever returned through the public API.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.unit import PhotoOut


class PublicUnitOut(BaseModel):
    id: uuid.UUID
    title: str
    property_type: str
    description: str | None
    city: str
    state: str | None
    country: str
    capacity: int
    bedrooms: int | None
    beds: int | None
    bathrooms: int | None
    instant_book: bool = False
    check_in_time: str | None = None
    check_out_time: str | None = None
    cleaning_fee: Decimal | None = None
    service_fee: Decimal | None = None
    security_deposit: Decimal | None = None
    amenities: list[str]
    base_price: Decimal
    weekend_price: Decimal | None
    deposit_percent: Decimal
    currency: str
    min_stay_nights: int
    photos: list[PhotoOut] = Field(default_factory=list)
    rating: float | None = None
    review_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class PublicUnitListOut(BaseModel):
    items: list[PublicUnitOut]
    total: int
    limit: int
    offset: int

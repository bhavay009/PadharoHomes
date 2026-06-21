"""Admin dashboard schemas."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class AdminStats(BaseModel):
    total_hosts: int
    total_units: int
    units_by_status: dict[str, int]
    total_bookings: int
    bookings_by_status: dict[str, int]
    total_reviews: int
    average_rating: float | None
    gross_booking_value: Decimal
    deposits_collected: Decimal
    currency: str


class AdminHostOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    created_at: datetime
    unit_count: int
    booking_count: int


class AdminUnitOut(BaseModel):
    id: uuid.UUID
    title: str
    city: str
    status: str
    base_price: Decimal
    currency: str
    host_email: str
    created_at: datetime


class AdminBookingOut(BaseModel):
    id: uuid.UUID
    guest_name: str
    guest_email: str
    unit_title: str
    host_email: str
    check_in: date
    check_out: date
    subtotal: Decimal
    status: str


class AdminReviewOut(BaseModel):
    id: uuid.UUID
    guest_name: str
    unit_title: str
    rating: int
    comment: str | None
    created_at: datetime


class _ListMeta(BaseModel):
    total: int
    limit: int
    offset: int


class AdminHostList(_ListMeta):
    items: list[AdminHostOut]


class AdminUnitList(_ListMeta):
    items: list[AdminUnitOut]


class AdminBookingList(_ListMeta):
    items: list[AdminBookingOut]


class AdminReviewList(_ListMeta):
    items: list[AdminReviewOut]

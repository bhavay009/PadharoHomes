"""Booking request/response schemas."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    guest_name: str = Field(min_length=1, max_length=200)
    guest_email: EmailStr
    guest_phone: str | None = Field(default=None, max_length=40)
    check_in: date
    check_out: date

    @model_validator(mode="after")
    def _check_dates(self):
        if self.check_out <= self.check_in:
            raise ValueError("check_out must be after check_in.")
        return self


class BookingOut(BaseModel):
    id: uuid.UUID
    unit_id: uuid.UUID
    guest_name: str
    guest_email: EmailStr
    guest_phone: str | None
    check_in: date
    check_out: date
    nights: int
    currency: str
    subtotal: Decimal
    deposit_percent: Decimal
    deposit_amount: Decimal
    balance_amount: Decimal
    status: BookingStatus
    hold_expires_at: datetime | None
    deposit_paid_at: datetime | None
    balance_collected_at: datetime | None
    created_at: datetime
    # Populated only on the /trips endpoint: whether the guest has reviewed it.
    reviewed: bool | None = None

    model_config = {"from_attributes": True}


class PaymentIntentOut(BaseModel):
    intent_id: str
    gateway: str
    amount: Decimal
    currency: str
    client: dict


class BookingCreateOut(BaseModel):
    booking: BookingOut
    payment: PaymentIntentOut


class HostBookingListOut(BaseModel):
    items: list[BookingOut]
    total: int
    limit: int
    offset: int


class CompleteIn(BaseModel):
    balance_collected: bool = True


class DashboardMetricsOut(BaseModel):
    total_units: int
    published_units: int
    bookings_by_status: dict[str, int]
    revenue_booked: Decimal
    cash_collected: Decimal
    outstanding_balance: Decimal
    commission_saved: Decimal
    ota_commission_percent: Decimal
    currency: str
    occupancy_percent: Decimal
    occupancy_window_days: int

"""Schemas for availability blocks, seasonal rates, quotes, and calendar.

All date ranges are half-open: [start_date, end_date).
"""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator


class _DateRange(BaseModel):
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def _check_order(self):
        if self.end_date <= self.start_date:
            raise ValueError("end_date must be after start_date.")
        return self


class BlockIn(_DateRange):
    reason: str | None = Field(default=None, max_length=200)


class BlockOut(BaseModel):
    id: uuid.UUID
    start_date: date
    end_date: date
    reason: str | None

    model_config = {"from_attributes": True}


class RateIn(_DateRange):
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class RateOut(BaseModel):
    id: uuid.UUID
    start_date: date
    end_date: date
    price: Decimal

    model_config = {"from_attributes": True}


class AvailabilityOut(BaseModel):
    available: bool
    check_in: date
    check_out: date


class NightOut(BaseModel):
    date: date
    price: Decimal
    is_weekend: bool
    source: str  # "base" | "weekend" | "seasonal"


class QuoteOut(BaseModel):
    check_in: date
    check_out: date
    nights: int
    currency: str
    nightly: list[NightOut]
    subtotal: Decimal
    deposit_percent: Decimal
    deposit_due: Decimal
    balance_due: Decimal


class CalendarDayOut(BaseModel):
    date: date
    available: bool
    price: Decimal

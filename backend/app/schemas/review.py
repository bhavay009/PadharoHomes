"""Review request/response schemas."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    booking_id: uuid.UUID
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)


class ReviewOut(BaseModel):
    id: uuid.UUID
    guest_name: str
    rating: int
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReviewListOut(BaseModel):
    items: list[ReviewOut]
    total: int
    average: float | None
    count: int

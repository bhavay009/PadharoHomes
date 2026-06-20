"""Listing (unit) model and its photos.

A unit belongs to a host. Location is stored as attributes (location-agnostic):
a unit may sit in one area or hosts may spread units across cities — guests
filter by city/locality in later phases.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UnitStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    unlisted = "unlisted"


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    host_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("hosts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Location attributes (city indexed for guest filtering in later phases).
    address_line: Mapped[str | None] = mapped_column(String(300), nullable=True)
    city: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    country: Mapped[str] = mapped_column(String(120), nullable=False, default="India")
    pincode: Mapped[str | None] = mapped_column(String(20), nullable=True)

    capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    bedrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bathrooms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    amenities: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    house_rules: Mapped[str | None] = mapped_column(Text, nullable=True)

    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Optional override applied to Saturday/Sunday nights when set.
    weekend_price: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    deposit_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0")
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    min_stay_nights: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1
    )

    status: Mapped[UnitStatus] = mapped_column(
        SAEnum(UnitStatus, name="unit_status"),
        nullable=False,
        default=UnitStatus.draft,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    photos: Mapped[list["UnitPhoto"]] = relationship(
        back_populates="unit",
        cascade="all, delete-orphan",
        order_by="UnitPhoto.sort_order",
    )


class UnitPhoto(Base):
    __tablename__ = "unit_photos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("units.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    url: Mapped[str] = mapped_column(String(600), nullable=False)
    # Cloudinary public_id, kept so we can delete the asset from storage.
    storage_id: Mapped[str] = mapped_column(String(300), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    unit: Mapped["Unit"] = relationship(back_populates="photos")

"""ORM models package.

Importing this package imports every model module so that all tables are
registered on ``Base.metadata`` (used by Alembic autogenerate).
"""
from app.models.availability import AvailabilityBlock, SeasonalRate
from app.models.booking import (
    ACTIVE_BOOKING_STATUSES,
    Booking,
    BookingStatus,
    Payment,
    PaymentStatus,
)
from app.models.host import Host
from app.models.otp import OtpCode
from app.models.unit import Unit, UnitPhoto, UnitStatus

__all__ = [
    "Host",
    "OtpCode",
    "Unit",
    "UnitPhoto",
    "UnitStatus",
    "AvailabilityBlock",
    "SeasonalRate",
    "Booking",
    "BookingStatus",
    "Payment",
    "PaymentStatus",
    "ACTIVE_BOOKING_STATUSES",
]

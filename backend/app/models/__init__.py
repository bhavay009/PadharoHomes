"""ORM models package.

Importing this package imports every model module so that all tables are
registered on ``Base.metadata`` (used by Alembic autogenerate).
"""
from app.models.host import Host
from app.models.otp import OtpCode
from app.models.unit import Unit, UnitPhoto, UnitStatus

__all__ = ["Host", "OtpCode", "Unit", "UnitPhoto", "UnitStatus"]

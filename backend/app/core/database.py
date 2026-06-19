"""Database engine/session wiring (SQLAlchemy 2.x).

The engine is created lazily so the application and unit tests can import this
module without a configured database. Anything that needs a session must call
`get_engine()` / `get_sessionmaker()`, which raise a clear error if
`DATABASE_URL` is not set — we never silently fall back to a fake database.
"""
from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


class DatabaseNotConfiguredError(RuntimeError):
    """Raised when DB access is attempted without DATABASE_URL configured."""


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    if not settings.database_configured:
        raise DatabaseNotConfiguredError(
            "DATABASE_URL is not set. Provide a hosted Postgres connection string "
            "in backend/.env (see .env.example)."
        )
    # pool_pre_ping avoids stale connections against hosted Postgres.
    return create_engine(settings.database_url, pool_pre_ping=True, future=True)


@lru_cache(maxsize=1)
def get_sessionmaker() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)


def get_db() -> "Session":
    """FastAPI dependency that yields a database session."""
    factory = get_sessionmaker()
    db = factory()
    try:
        yield db
    finally:
        db.close()

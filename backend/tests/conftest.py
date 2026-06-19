"""Shared pytest fixtures.

Integration tests run against the real (Neon) database but are fully isolated:
each test runs inside a transaction that is rolled back on teardown, so nothing
is persisted. We use SQLAlchemy's ``join_transaction_mode="create_savepoint"``
so the service layer's own commits become savepoints within the outer rollback.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, get_engine
from app.main import app


@pytest.fixture()
def client() -> TestClient:
    """Plain client with no DB override (used by health/smoke tests)."""
    return TestClient(app)


@pytest.fixture()
def db_session():
    """Transaction-isolated session bound to the real database."""
    if not settings.database_configured:
        pytest.skip("DATABASE_URL not configured")
    engine = get_engine()
    connection = engine.connect()
    trans = connection.begin()
    session = Session(
        bind=connection,
        join_transaction_mode="create_savepoint",
        autoflush=False,
        expire_on_commit=False,
    )
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture()
def client_db(db_session):
    """TestClient whose get_db dependency uses the isolated session."""

    def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)

"""Phase 0 unit tests for configuration behavior."""
from __future__ import annotations

from app.core.config import Settings


def test_database_configured_false_when_empty():
    s = Settings(database_url="", _env_file=None)
    assert s.database_configured is False


def test_database_configured_true_when_set():
    s = Settings(
        database_url="postgresql+psycopg://u:p@host:5432/db",
        _env_file=None,
    )
    assert s.database_configured is True


def test_database_configured_false_for_whitespace():
    s = Settings(database_url="   ", _env_file=None)
    assert s.database_configured is False

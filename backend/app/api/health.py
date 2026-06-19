"""Health endpoints.

- GET /health      : liveness — app is up. No external dependencies.
- GET /health/db   : readiness — verifies a real round-trip to Postgres.
                     Returns 503 if DB is not configured or unreachable.
                     This performs an actual `SELECT 1`; it does not fake success.
"""
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import DatabaseNotConfiguredError, get_engine

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "ok", "env": settings.app_env}


@router.get("/health/db")
def health_db():
    if not settings.database_configured:
        return JSONResponse(
            status_code=503,
            content={"status": "unconfigured", "detail": "DATABASE_URL not set"},
        )
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "reachable"}
    except DatabaseNotConfiguredError:
        return JSONResponse(
            status_code=503,
            content={"status": "unconfigured", "detail": "DATABASE_URL not set"},
        )
    except Exception as exc:  # pragma: no cover - exercised against real outages
        return JSONResponse(
            status_code=503,
            content={"status": "unreachable", "detail": str(exc)},
        )

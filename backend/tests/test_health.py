"""Phase 0 smoke + DB-connectivity tests."""
from __future__ import annotations

from app.core.config import settings


def test_health_smoke(client):
    """App is up: /health returns 200 and ok status."""
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert "env" in body


def test_health_db_connectivity(client):
    """Readiness check.

    If DATABASE_URL is not configured we assert the endpoint *honestly* reports
    that (503 / unconfigured) rather than faking success. If it IS configured,
    we require a real, reachable database (a genuine SELECT 1 round-trip).
    """
    resp = client.get("/health/db")
    body = resp.json()

    if not settings.database_configured:
        assert resp.status_code == 503
        assert body["status"] == "unconfigured"
    else:
        assert resp.status_code == 200, f"DB unreachable: {body}"
        assert body["status"] == "ok"
        assert body["database"] == "reachable"

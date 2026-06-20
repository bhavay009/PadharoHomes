"""Phase 3 concurrency test: the row-lock reservation primitive must prevent
double-booking under genuine parallel access.

This test cannot use the transaction-isolated fixture (that pins everything to a
single connection). Instead it commits real rows, runs two real threads racing
to reserve the SAME overlapping dates on the SAME unit, and asserts exactly one
wins. All created rows are cleaned up afterwards.
"""
from __future__ import annotations

import threading
import uuid
from datetime import date

import pytest
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_engine, get_sessionmaker
from app.models.host import Host
from app.models.unit import Unit, UnitStatus
from app.services import booking_service
from app.services.availability_service import UnavailableError, reserve_block

pytestmark = pytest.mark.skipif(
    not settings.database_configured, reason="DATABASE_URL not configured"
)


def _seed_unit() -> tuple[uuid.UUID, uuid.UUID]:
    Session = get_sessionmaker()
    db = Session()
    try:
        host = Host(email=f"conc_{uuid.uuid4().hex[:10]}@example.com")
        db.add(host)
        db.flush()
        unit = Unit(
            host_id=host.id,
            title="Race Unit",
            city="Goa",
            base_price=1000,
            deposit_percent=0,
        )
        db.add(unit)
        db.commit()
        return host.id, unit.id
    finally:
        db.close()


def _cleanup(host_id: uuid.UUID) -> None:
    with get_engine().begin() as conn:
        # units (and their blocks via FK cascade) then host
        conn.execute(text("DELETE FROM hosts WHERE id = :id"), {"id": str(host_id)})


def _attempt(results: dict, key: str, unit_id: uuid.UUID, barrier: threading.Barrier):
    Session = get_sessionmaker()
    db = Session()
    try:
        barrier.wait(timeout=10)
        reserve_block(db, unit_id, date(2026, 10, 1), date(2026, 10, 5))
        db.commit()
        results[key] = "ok"
    except UnavailableError:
        db.rollback()
        results[key] = "conflict"
    except Exception as exc:  # surface unexpected errors
        db.rollback()
        results[key] = f"error: {exc!r}"
    finally:
        db.close()


def test_concurrent_reservations_serialize_to_one_winner():
    host_id, unit_id = _seed_unit()
    results: dict[str, str] = {}
    barrier = threading.Barrier(2)
    try:
        t1 = threading.Thread(target=_attempt, args=(results, "a", unit_id, barrier))
        t2 = threading.Thread(target=_attempt, args=(results, "b", unit_id, barrier))
        t1.start()
        t2.start()
        t1.join(timeout=20)
        t2.join(timeout=20)

        assert sorted(results.values()) == ["conflict", "ok"], results

        # Exactly one block persisted for those dates.
        with get_engine().connect() as conn:
            count = conn.execute(
                text("SELECT count(*) FROM availability_blocks WHERE unit_id = :u"),
                {"u": str(unit_id)},
            ).scalar()
        assert count == 1
    finally:
        _cleanup(host_id)


def _attempt_booking(results: dict, key: str, unit_id, barrier: threading.Barrier):
    from datetime import date

    Session = get_sessionmaker()
    db = Session()
    try:
        unit = db.get(Unit, unit_id)
        barrier.wait(timeout=10)
        booking_service.create_hold(
            db,
            unit,
            guest_name="Race",
            guest_email=f"{key}@example.com",
            guest_phone=None,
            check_in=date(2028, 3, 1),
            check_out=date(2028, 3, 5),
        )
        db.commit()
        results[key] = "ok"
    except booking_service.BookingUnavailableError:
        db.rollback()
        results[key] = "conflict"
    except Exception as exc:
        db.rollback()
        results[key] = f"error: {exc!r}"
    finally:
        db.close()


def test_concurrent_bookings_serialize_to_one_winner():
    """Two guests race to hold the SAME dates on the SAME unit; exactly one wins."""
    host_id, unit_id = _seed_unit()
    # Publish the unit (not required for create_hold, but mirrors real usage).
    Session = get_sessionmaker()
    db = Session()
    try:
        u = db.get(Unit, unit_id)
        u.status = UnitStatus.published
        db.commit()
    finally:
        db.close()

    results: dict[str, str] = {}
    barrier = threading.Barrier(2)
    try:
        t1 = threading.Thread(target=_attempt_booking, args=(results, "a", unit_id, barrier))
        t2 = threading.Thread(target=_attempt_booking, args=(results, "b", unit_id, barrier))
        t1.start(); t2.start()
        t1.join(timeout=20); t2.join(timeout=20)

        assert sorted(results.values()) == ["conflict", "ok"], results

        with get_engine().connect() as conn:
            count = conn.execute(
                text("SELECT count(*) FROM bookings WHERE unit_id = :u"),
                {"u": str(unit_id)},
            ).scalar()
        assert count == 1
    finally:
        _cleanup(host_id)

"""Phase 3 integration tests: availability blocks, seasonal rates, quote, calendar.

Transaction-isolated against the real DB via `client_db`.
"""
from __future__ import annotations

from datetime import date, timedelta


def _next_weekday(target: int, start: date | None = None) -> date:
    start = start or date(2026, 8, 1)
    return start + timedelta((target - start.weekday()) % 7)


SAT = _next_weekday(5)  # a Saturday
MON = _next_weekday(0, SAT)  # the following Monday


def _create_unit(client, headers, **over):
    payload = {
        "title": "Unit",
        "city": "Goa",
        "base_price": "1000.00",
        "deposit_percent": "20.00",
        **over,
    }
    return client.post("/units", json=payload, headers=headers).json()


def test_block_create_list_delete(client_db, host_auth):
    h = host_auth["headers"]
    uid = _create_unit(client_db, h)["id"]
    start = (MON + timedelta(days=30)).isoformat()
    end = (MON + timedelta(days=33)).isoformat()

    created = client_db.post(
        f"/units/{uid}/blocks", json={"start_date": start, "end_date": end},
        headers=h,
    )
    assert created.status_code == 201, created.text

    listed = client_db.get(f"/units/{uid}/blocks", headers=h).json()
    assert len(listed) == 1

    bid = created.json()["id"]
    assert client_db.delete(f"/units/{uid}/blocks/{bid}", headers=h).status_code == 204
    assert client_db.get(f"/units/{uid}/blocks", headers=h).json() == []


def test_block_rejects_bad_range(client_db, host_auth):
    h = host_auth["headers"]
    uid = _create_unit(client_db, h)["id"]
    resp = client_db.post(
        f"/units/{uid}/blocks",
        json={"start_date": "2026-09-10", "end_date": "2026-09-10"},
        headers=h,
    )
    assert resp.status_code == 422  # end must be after start


def test_overlapping_block_is_conflict(client_db, host_auth):
    h = host_auth["headers"]
    uid = _create_unit(client_db, h)["id"]
    client_db.post(
        f"/units/{uid}/blocks",
        json={"start_date": "2026-09-10", "end_date": "2026-09-15"},
        headers=h,
    )
    overlap = client_db.post(
        f"/units/{uid}/blocks",
        json={"start_date": "2026-09-12", "end_date": "2026-09-18"},
        headers=h,
    )
    assert overlap.status_code == 409


def test_availability_reflects_blocks(client_db, host_auth):
    h = host_auth["headers"]
    uid = _create_unit(client_db, h)["id"]
    client_db.post(
        f"/units/{uid}/blocks",
        json={"start_date": "2026-09-10", "end_date": "2026-09-15"},
        headers=h,
    )
    blocked = client_db.get(
        f"/units/{uid}/availability",
        params={"check_in": "2026-09-11", "check_out": "2026-09-13"},
        headers=h,
    ).json()
    assert blocked["available"] is False

    free = client_db.get(
        f"/units/{uid}/availability",
        params={"check_in": "2026-09-20", "check_out": "2026-09-22"},
        headers=h,
    ).json()
    assert free["available"] is True


def test_quote_base_weekend_and_deposit(client_db, host_auth):
    h = host_auth["headers"]
    uid = _create_unit(
        client_db, h, base_price="1000.00", weekend_price="1500.00",
        deposit_percent="20.00",
    )["id"]

    # One Saturday night -> weekend price.
    sat_quote = client_db.get(
        f"/units/{uid}/quote",
        params={"check_in": SAT.isoformat(), "check_out": (SAT + timedelta(days=1)).isoformat()},
        headers=h,
    ).json()
    assert float(sat_quote["subtotal"]) == 1500.0
    assert sat_quote["nightly"][0]["source"] == "weekend"
    assert float(sat_quote["deposit_due"]) == 300.0
    assert float(sat_quote["balance_due"]) == 1200.0

    # One Monday night -> base price.
    mon_quote = client_db.get(
        f"/units/{uid}/quote",
        params={"check_in": MON.isoformat(), "check_out": (MON + timedelta(days=1)).isoformat()},
        headers=h,
    ).json()
    assert float(mon_quote["subtotal"]) == 1000.0
    assert mon_quote["nightly"][0]["source"] == "base"


def test_quote_min_stay_enforced(client_db, host_auth):
    h = host_auth["headers"]
    uid = _create_unit(client_db, h, min_stay_nights=3)["id"]
    resp = client_db.get(
        f"/units/{uid}/quote",
        params={"check_in": "2026-09-20", "check_out": "2026-09-21"},
        headers=h,
    )
    assert resp.status_code == 400
    assert "Minimum stay" in resp.json()["detail"]


def test_seasonal_rate_overrides_and_overlap(client_db, host_auth):
    h = host_auth["headers"]
    uid = _create_unit(client_db, h, base_price="1000.00")["id"]

    rate = client_db.post(
        f"/units/{uid}/rates",
        json={"start_date": "2026-12-20", "end_date": "2027-01-05", "price": "4000.00"},
        headers=h,
    )
    assert rate.status_code == 201

    # Overlapping rate rejected.
    overlap = client_db.post(
        f"/units/{uid}/rates",
        json={"start_date": "2027-01-01", "end_date": "2027-01-10", "price": "3000.00"},
        headers=h,
    )
    assert overlap.status_code == 409

    # Quote inside the season uses the seasonal price.
    q = client_db.get(
        f"/units/{uid}/quote",
        params={"check_in": "2026-12-22", "check_out": "2026-12-24"},
        headers=h,
    ).json()
    assert float(q["subtotal"]) == 8000.0  # 2 nights * 4000
    assert all(n["source"] == "seasonal" for n in q["nightly"])


def test_calendar_marks_blocked_days(client_db, host_auth):
    h = host_auth["headers"]
    uid = _create_unit(client_db, h)["id"]
    client_db.post(
        f"/units/{uid}/blocks",
        json={"start_date": "2026-09-10", "end_date": "2026-09-12"},
        headers=h,
    )
    cal = client_db.get(
        f"/units/{uid}/calendar",
        params={"start": "2026-09-09", "end": "2026-09-13"},
        headers=h,
    ).json()
    by_date = {d["date"]: d["available"] for d in cal}
    assert by_date["2026-09-09"] is True
    assert by_date["2026-09-10"] is False
    assert by_date["2026-09-11"] is False
    assert by_date["2026-09-12"] is True  # end exclusive

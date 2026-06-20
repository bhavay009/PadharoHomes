"""Phase 4 integration tests: public storefront (no auth).

Units are created via the authenticated host API, then browsed through the
public API with no credentials. Transaction-isolated against the real DB.
"""
from __future__ import annotations


def _create_unit(client, headers, *, publish=False, **over):
    payload = {
        "title": "Listing",
        "city": "Jaipur",
        "base_price": "1000.00",
        "deposit_percent": "20.00",
        "capacity": 2,
        **over,
    }
    unit = client.post("/units", json=payload, headers=headers).json()
    if publish:
        client.patch(f"/units/{unit['id']}", json={"status": "published"}, headers=headers)
        unit["status"] = "published"
    return unit


def test_browse_shows_only_published(client_db, host_auth):
    h = host_auth["headers"]
    _create_unit(client_db, h, title="Draft one")  # draft
    _create_unit(client_db, h, title="Live one", publish=True)

    res = client_db.get("/public/units").json()
    assert res["total"] == 1
    assert res["items"][0]["title"] == "Live one"
    # Public payload must not leak host-internal fields.
    assert "host_id" not in res["items"][0]
    assert "status" not in res["items"][0]


def test_filter_by_city_guests_and_price(client_db, host_auth):
    h = host_auth["headers"]
    _create_unit(client_db, h, city="Jaipur", capacity=2, base_price="1000.00", publish=True)
    _create_unit(client_db, h, city="Udaipur", capacity=6, base_price="3000.00", publish=True)

    assert client_db.get("/public/units", params={"city": "jaipur"}).json()["total"] == 1
    assert client_db.get("/public/units", params={"guests": 5}).json()["total"] == 1
    assert client_db.get("/public/units", params={"max_price": "1500"}).json()["total"] == 1
    assert client_db.get("/public/units", params={"min_price": "2000"}).json()["total"] == 1


def test_dates_filter_excludes_blocked_units(client_db, host_auth):
    h = host_auth["headers"]
    free = _create_unit(client_db, h, title="Free", publish=True)
    blocked = _create_unit(client_db, h, title="Blocked", publish=True)
    client_db.post(
        f"/units/{blocked['id']}/blocks",
        json={"start_date": "2026-11-10", "end_date": "2026-11-15"},
        headers=h,
    )

    # No dates -> both published units show.
    assert client_db.get("/public/units").json()["total"] == 2

    # Overlapping dates -> only the free unit shows.
    res = client_db.get(
        "/public/units",
        params={"check_in": "2026-11-12", "check_out": "2026-11-14"},
    ).json()
    assert res["total"] == 1
    assert res["items"][0]["id"] == free["id"]

    # Non-overlapping dates -> both show again.
    res2 = client_db.get(
        "/public/units",
        params={"check_in": "2026-12-01", "check_out": "2026-12-03"},
    ).json()
    assert res2["total"] == 2


def test_browse_rejects_single_date(client_db, host_auth):
    resp = client_db.get("/public/units", params={"check_in": "2026-11-12"})
    assert resp.status_code == 400


def test_detail_404_for_draft_200_for_published(client_db, host_auth):
    h = host_auth["headers"]
    draft = _create_unit(client_db, h)
    live = _create_unit(client_db, h, publish=True)

    assert client_db.get(f"/public/units/{draft['id']}").status_code == 404
    ok = client_db.get(f"/public/units/{live['id']}")
    assert ok.status_code == 200
    assert ok.json()["title"] == "Listing"


def test_public_quote_and_availability(client_db, host_auth):
    h = host_auth["headers"]
    unit = _create_unit(
        client_db, h, base_price="1000.00", weekend_price="1500.00", publish=True
    )
    uid = unit["id"]
    client_db.post(
        f"/units/{uid}/blocks",
        json={"start_date": "2026-11-10", "end_date": "2026-11-15"},
        headers=h,
    )

    avail = client_db.get(
        f"/public/units/{uid}/availability",
        params={"check_in": "2026-11-11", "check_out": "2026-11-13"},
    ).json()
    assert avail["available"] is False

    # Quote on blocked dates -> 400.
    blocked_quote = client_db.get(
        f"/public/units/{uid}/quote",
        params={"check_in": "2026-11-11", "check_out": "2026-11-13"},
    )
    assert blocked_quote.status_code == 400

    # Quote on free dates -> 200 with a breakdown.
    good = client_db.get(
        f"/public/units/{uid}/quote",
        params={"check_in": "2026-12-01", "check_out": "2026-12-03"},
    )
    assert good.status_code == 200
    assert good.json()["nights"] == 2

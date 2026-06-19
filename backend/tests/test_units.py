"""Phase 2 integration tests for unit (listing) management.

Run against the real DB via the transaction-isolated `client_db`. Photo upload
is exercised against real Cloudinary when configured; otherwise it asserts the
endpoint honestly reports 503 (not configured) rather than faking a stored image.
"""
from __future__ import annotations

import base64

from app.core.config import settings
from tests.conftest import make_host


def _unit_payload(**over):
    base = {
        "title": "Cozy Studio",
        "city": "Jaipur",
        "base_price": "1500.00",
        "deposit_percent": "20.00",
        "capacity": 2,
        "amenities": ["wifi", "ac"],
    }
    base.update(over)
    return base


def test_create_unit(client_db, host_auth):
    resp = client_db.post("/units", json=_unit_payload(), headers=host_auth["headers"])
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["title"] == "Cozy Studio"
    assert body["city"] == "Jaipur"
    assert float(body["base_price"]) == 1500.0
    assert body["status"] == "draft"
    assert body["amenities"] == ["wifi", "ac"]
    assert body["host_id"] == str(host_auth["host"].id)


def test_create_unit_requires_auth(client_db):
    resp = client_db.post("/units", json=_unit_payload())
    assert resp.status_code == 403


def test_create_unit_rejects_invalid_price(client_db, host_auth):
    resp = client_db.post(
        "/units", json=_unit_payload(base_price="0"), headers=host_auth["headers"]
    )
    assert resp.status_code == 422


def test_get_and_update_unit(client_db, host_auth):
    h = host_auth["headers"]
    unit_id = client_db.post("/units", json=_unit_payload(), headers=h).json()["id"]

    got = client_db.get(f"/units/{unit_id}", headers=h)
    assert got.status_code == 200

    upd = client_db.patch(
        f"/units/{unit_id}",
        json={"title": "Renamed", "status": "published"},
        headers=h,
    )
    assert upd.status_code == 200
    assert upd.json()["title"] == "Renamed"
    assert upd.json()["status"] == "published"


def test_delete_unit(client_db, host_auth):
    h = host_auth["headers"]
    unit_id = client_db.post("/units", json=_unit_payload(), headers=h).json()["id"]
    assert client_db.delete(f"/units/{unit_id}", headers=h).status_code == 204
    assert client_db.get(f"/units/{unit_id}", headers=h).status_code == 404


def test_list_filters_by_city_status_and_query(client_db, host_auth):
    h = host_auth["headers"]
    client_db.post("/units", json=_unit_payload(title="A", city="Jaipur"), headers=h)
    client_db.post("/units", json=_unit_payload(title="B", city="Udaipur"), headers=h)
    pub = client_db.post(
        "/units", json=_unit_payload(title="C", city="Jaipur"), headers=h
    ).json()["id"]
    client_db.patch(f"/units/{pub}", json={"status": "published"}, headers=h)

    # All units for this host
    all_resp = client_db.get("/units", headers=h).json()
    assert all_resp["total"] == 3

    # Filter by city
    jaipur = client_db.get("/units", params={"city": "jaipur"}, headers=h).json()
    assert jaipur["total"] == 2

    # Filter by status
    published = client_db.get("/units", params={"status": "published"}, headers=h).json()
    assert published["total"] == 1
    assert published["items"][0]["title"] == "C"

    # Text search on title
    q = client_db.get("/units", params={"q": "Udaipur"}, headers=h).json()
    assert q["total"] == 1


def test_list_pagination(client_db, host_auth):
    h = host_auth["headers"]
    for i in range(3):
        client_db.post("/units", json=_unit_payload(title=f"U{i}"), headers=h)
    page = client_db.get("/units", params={"limit": 2, "offset": 0}, headers=h).json()
    assert page["total"] == 3
    assert len(page["items"]) == 2
    assert page["limit"] == 2


def test_host_cannot_access_another_hosts_unit(client_db, host_auth, db_session):
    h1 = host_auth["headers"]
    unit_id = client_db.post("/units", json=_unit_payload(), headers=h1).json()["id"]

    _, h2 = make_host(db_session)
    assert client_db.get(f"/units/{unit_id}", headers=h2).status_code == 404
    assert client_db.patch(
        f"/units/{unit_id}", json={"title": "x"}, headers=h2
    ).status_code == 404
    assert client_db.delete(f"/units/{unit_id}", headers=h2).status_code == 404
    # And it does not appear in the other host's list.
    assert client_db.get("/units", headers=h2).json()["total"] == 0


def test_bulk_update_status_and_price(client_db, host_auth):
    h = host_auth["headers"]
    ids = [
        client_db.post("/units", json=_unit_payload(title=f"B{i}"), headers=h).json()["id"]
        for i in range(2)
    ]
    resp = client_db.post(
        "/units/bulk",
        json={"unit_ids": ids, "status": "published", "base_price": "2000.00"},
        headers=h,
    )
    assert resp.status_code == 200
    assert resp.json()["updated"] == 2
    for uid in ids:
        got = client_db.get(f"/units/{uid}", headers=h).json()
        assert got["status"] == "published"
        assert float(got["base_price"]) == 2000.0


def test_bulk_update_requires_a_field(client_db, host_auth):
    h = host_auth["headers"]
    uid = client_db.post("/units", json=_unit_payload(), headers=h).json()["id"]
    resp = client_db.post("/units/bulk", json={"unit_ids": [uid]}, headers=h)
    assert resp.status_code == 422


# Minimal valid 1x1 PNG (test fixture data, not application data).
_PNG_1x1 = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


def test_photo_upload(client_db, host_auth):
    h = host_auth["headers"]
    unit_id = client_db.post("/units", json=_unit_payload(), headers=h).json()["id"]

    resp = client_db.post(
        f"/units/{unit_id}/photos",
        files={"file": ("test.png", _PNG_1x1, "image/png")},
        headers=h,
    )

    if not settings.cloudinary_configured:
        # Honest failure: storage not wired yet.
        assert resp.status_code == 503
        assert "Cloudinary" in resp.json()["detail"]
        return

    # Real upload path: a genuine Cloudinary asset URL must come back.
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["url"].startswith("http")
    # Cleanup happens automatically on unit delete (storage_ids removed).
    client_db.delete(f"/units/{unit_id}", headers=h)


def test_photo_upload_rejects_non_image(client_db, host_auth):
    h = host_auth["headers"]
    unit_id = client_db.post("/units", json=_unit_payload(), headers=h).json()["id"]
    resp = client_db.post(
        f"/units/{unit_id}/photos",
        files={"file": ("note.txt", b"hello", "text/plain")},
        headers=h,
    )
    assert resp.status_code == 400

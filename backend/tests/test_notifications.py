"""Phase 7 tests: lifecycle notification emails (via the console/capture adapter).

These assert the right emails are produced for each event. Real Resend delivery
is verified separately (live) once credentials are configured.
"""
from __future__ import annotations

import pytest

from app.services.email import console


@pytest.fixture(autouse=True)
def _clear_email_capture():
    console.clear_sent()
    yield
    console.clear_sent()


def _published_unit(client, headers, **over):
    payload = {
        "title": "Bookable", "city": "Jaipur", "base_price": "1000.00",
        "deposit_percent": "20.00", "capacity": 4, **over,
    }
    u = client.post("/units", json=payload, headers=headers).json()
    client.patch(f"/units/{u['id']}", json={"status": "published"}, headers=headers)
    return u


def _book(client, unit_id, **over):
    body = {"guest_name": "Asha", "guest_email": "asha@example.com",
            "check_in": "2027-03-01", "check_out": "2027-03-03", **over}
    return client.post(f"/public/units/{unit_id}/bookings", json=body).json()["booking"]["id"]


def _to_addresses():
    return [m.to for m in console.sent_messages()]


def _subjects():
    return [m.subject for m in console.sent_messages()]


def test_otp_email_is_sent(client_db):
    console.clear_sent()
    client_db.post("/auth/request-otp", json={"email": "newhost@example.com"})
    assert "newhost@example.com" in _to_addresses()
    assert any("login code" in s.lower() for s in _subjects())


def test_booking_confirmed_emails_guest_and_host(client_db, host_auth):
    host_email = host_auth["host"].email
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = _book(client_db, uid)
    console.clear_sent()  # ignore OTP/host-setup noise

    client_db.post(f"/public/bookings/{bid}/pay")

    tos = _to_addresses()
    assert "asha@example.com" in tos      # guest confirmation
    assert host_email in tos              # host notification
    assert any("confirmed" in s.lower() for s in _subjects())


def test_check_in_emails_guest(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    bid = _book(client_db, uid)
    client_db.post(f"/public/bookings/{bid}/pay")
    console.clear_sent()

    client_db.post(f"/bookings/{bid}/check-in", headers=h)
    assert "asha@example.com" in _to_addresses()
    assert any("check-in" in s.lower() for s in _subjects())


def test_cancellation_emails_guest_and_host(client_db, host_auth):
    host_email = host_auth["host"].email
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = _book(client_db, uid)
    client_db.post(f"/public/bookings/{bid}/pay")
    console.clear_sent()

    client_db.post(f"/public/bookings/{bid}/cancel")
    tos = _to_addresses()
    assert "asha@example.com" in tos
    assert host_email in tos
    assert any("cancel" in s.lower() for s in _subjects())

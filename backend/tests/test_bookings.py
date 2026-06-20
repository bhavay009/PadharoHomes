"""Phase 5 integration tests: booking hold-then-pay flow + state machine.

Guest booking endpoints are public (no auth). Units are created/published via
the host API. Transaction-isolated against the real DB.
"""
from __future__ import annotations

from app.models.booking import BookingStatus
from app.services import booking_service
from tests.conftest import make_host


def _published_unit(client, headers, **over):
    payload = {
        "title": "Bookable",
        "city": "Jaipur",
        "base_price": "1000.00",
        "deposit_percent": "20.00",
        "capacity": 4,
        **over,
    }
    u = client.post("/units", json=payload, headers=headers).json()
    client.patch(f"/units/{u['id']}", json={"status": "published"}, headers=headers)
    return u


def _guest():
    return {"guest_name": "Asha", "guest_email": "asha@example.com"}


def test_create_hold_returns_pending_and_intent(client_db, host_auth):
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    resp = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-03-10", "check_out": "2027-03-12"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["booking"]["status"] == "pending"
    assert body["booking"]["hold_expires_at"] is not None
    assert float(body["booking"]["subtotal"]) == 2000.0
    assert float(body["booking"]["deposit_amount"]) == 400.0
    assert float(body["booking"]["balance_amount"]) == 1600.0
    assert body["payment"]["gateway"] == "mock"
    assert body["payment"]["intent_id"].startswith("mock_")


def test_pay_confirms_booking(client_db, host_auth):
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-03-10", "check_out": "2027-03-12"},
    ).json()["booking"]["id"]

    paid = client_db.post(f"/public/bookings/{bid}/pay")
    assert paid.status_code == 200, paid.text
    b = paid.json()
    assert b["status"] == "confirmed"
    assert b["deposit_paid_at"] is not None
    assert b["hold_expires_at"] is None


def test_confirmed_booking_blocks_dates_everywhere(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-04-01", "check_out": "2027-04-05"},
    ).json()["booking"]["id"]
    client_db.post(f"/public/bookings/{bid}/pay")

    # Public availability + browse must now reflect the booking.
    avail = client_db.get(
        f"/public/units/{uid}/availability",
        params={"check_in": "2027-04-02", "check_out": "2027-04-04"},
    ).json()
    assert avail["available"] is False

    browse = client_db.get(
        "/public/units",
        params={"check_in": "2027-04-02", "check_out": "2027-04-04"},
    ).json()
    assert all(item["id"] != uid for item in browse["items"])


def test_active_hold_prevents_double_booking(client_db, host_auth):
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    first = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-05-01", "check_out": "2027-05-04"},
    )
    assert first.status_code == 201
    # Second guest, overlapping dates, while the first hold is still active.
    second = client_db.post(
        f"/public/units/{uid}/bookings",
        json={"guest_name": "Ravi", "guest_email": "ravi@example.com",
              "check_in": "2027-05-02", "check_out": "2027-05-06"},
    )
    assert second.status_code == 409


def test_cannot_pay_twice(client_db, host_auth):
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-06-01", "check_out": "2027-06-03"},
    ).json()["booking"]["id"]
    client_db.post(f"/public/bookings/{bid}/pay")
    again = client_db.post(f"/public/bookings/{bid}/pay")
    assert again.status_code == 400


def test_cancel_pending_releases_dates(client_db, host_auth):
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-07-01", "check_out": "2027-07-03"},
    ).json()["booking"]["id"]

    cancelled = client_db.post(f"/public/bookings/{bid}/cancel").json()
    assert cancelled["status"] == "cancelled"

    avail = client_db.get(
        f"/public/units/{uid}/availability",
        params={"check_in": "2027-07-01", "check_out": "2027-07-03"},
    ).json()
    assert avail["available"] is True  # dates freed


def test_cancel_confirmed_forfeits_deposit(client_db, host_auth, db_session):
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-08-01", "check_out": "2027-08-03"},
    ).json()["booking"]["id"]
    client_db.post(f"/public/bookings/{bid}/pay")
    cancelled = client_db.post(f"/public/bookings/{bid}/cancel").json()
    assert cancelled["status"] == "cancelled"

    # Deposit forfeited (not refunded).
    from app.models.booking import Booking
    import uuid
    booking = db_session.get(Booking, uuid.UUID(bid))
    assert booking.deposit_refunded is False


def test_booking_below_min_stay_rejected(client_db, host_auth):
    uid = _published_unit(client_db, host_auth["headers"], min_stay_nights=3)["id"]
    resp = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-09-01", "check_out": "2027-09-02"},
    )
    assert resp.status_code == 400
    assert "Minimum stay" in resp.json()["detail"]


def test_booking_on_blocked_dates_conflicts(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    client_db.post(
        f"/units/{uid}/blocks",
        json={"start_date": "2027-10-01", "end_date": "2027-10-10"},
        headers=h,
    )
    resp = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-10-03", "check_out": "2027-10-05"},
    )
    assert resp.status_code == 409


def test_get_booking_and_404(client_db, host_auth):
    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-11-01", "check_out": "2027-11-03"},
    ).json()["booking"]["id"]
    assert client_db.get(f"/public/bookings/{bid}").status_code == 200
    import uuid
    assert client_db.get(f"/public/bookings/{uuid.uuid4()}").status_code == 404


# ---- Service-level state machine (host transitions, exposed in Phase 6) ----
def test_state_machine_transitions(client_db, host_auth, db_session):
    import uuid

    from app.models.booking import Booking

    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2027-12-01", "check_out": "2027-12-03"},
    ).json()["booking"]["id"]
    client_db.post(f"/public/bookings/{bid}/pay")

    booking = db_session.get(Booking, uuid.UUID(bid))

    # confirmed -> checked_in -> completed (balance collected)
    booking_service.check_in(db_session, booking)
    assert booking.status == BookingStatus.checked_in
    booking_service.complete(db_session, booking, balance_collected=True)
    assert booking.status == BookingStatus.completed
    assert booking.balance_collected_at is not None

    # Guard: cannot check in a completed booking.
    try:
        booking_service.check_in(db_session, booking)
        assert False, "expected BookingError"
    except booking_service.BookingError:
        pass


def test_no_show_forfeits(client_db, host_auth, db_session):
    import uuid

    from app.models.booking import Booking

    uid = _published_unit(client_db, host_auth["headers"])["id"]
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={**_guest(), "check_in": "2028-01-01", "check_out": "2028-01-03"},
    ).json()["booking"]["id"]
    client_db.post(f"/public/bookings/{bid}/pay")
    booking = db_session.get(Booking, uuid.UUID(bid))

    booking_service.mark_no_show(db_session, booking)
    assert booking.status == BookingStatus.no_show
    assert booking.deposit_refunded is False

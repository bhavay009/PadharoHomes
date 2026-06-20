"""Phase 6 integration tests: host booking management + dashboard metrics."""
from __future__ import annotations

from datetime import date, timedelta

from tests.conftest import make_host


def _published_unit(client, headers, **over):
    payload = {
        "title": "Bookable", "city": "Jaipur", "base_price": "1000.00",
        "deposit_percent": "20.00", "capacity": 4, **over,
    }
    u = client.post("/units", json=payload, headers=headers).json()
    client.patch(f"/units/{u['id']}", json={"status": "published"}, headers=headers)
    return u


def _book_and_pay(client, unit_id, check_in, check_out, pay=True):
    bid = client.post(
        f"/public/units/{unit_id}/bookings",
        json={"guest_name": "Asha", "guest_email": "asha@example.com",
              "check_in": check_in, "check_out": check_out},
    ).json()["booking"]["id"]
    if pay:
        client.post(f"/public/bookings/{bid}/pay")
    return bid


def test_host_lists_only_own_bookings(client_db, host_auth, db_session):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    _book_and_pay(client_db, uid, "2027-03-01", "2027-03-03")

    listed = client_db.get("/bookings", headers=h).json()
    assert listed["total"] == 1

    _, h2 = make_host(db_session)
    assert client_db.get("/bookings", headers=h2).json()["total"] == 0


def test_host_booking_filter_by_status(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    _book_and_pay(client_db, uid, "2027-04-01", "2027-04-03")          # confirmed
    _book_and_pay(client_db, uid, "2027-05-01", "2027-05-03", pay=False)  # pending

    confirmed = client_db.get("/bookings", params={"status": "confirmed"}, headers=h).json()
    assert confirmed["total"] == 1
    pending = client_db.get("/bookings", params={"status": "pending"}, headers=h).json()
    assert pending["total"] == 1


def test_check_in_complete_collects_balance(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    bid = _book_and_pay(client_db, uid, "2027-06-01", "2027-06-03")

    assert client_db.post(f"/bookings/{bid}/check-in", headers=h).json()["status"] == "checked_in"
    done = client_db.post(
        f"/bookings/{bid}/complete", json={"balance_collected": True}, headers=h
    ).json()
    assert done["status"] == "completed"
    assert done["balance_collected_at"] is not None


def test_cannot_check_in_pending(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    bid = _book_and_pay(client_db, uid, "2027-07-01", "2027-07-03", pay=False)
    assert client_db.post(f"/bookings/{bid}/check-in", headers=h).status_code == 400


def test_host_cannot_touch_other_hosts_booking(client_db, host_auth, db_session):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    bid = _book_and_pay(client_db, uid, "2027-08-01", "2027-08-03")

    _, h2 = make_host(db_session)
    assert client_db.get(f"/bookings/{bid}", headers=h2).status_code == 404
    assert client_db.post(f"/bookings/{bid}/check-in", headers=h2).status_code == 404


def test_no_show_endpoint(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    bid = _book_and_pay(client_db, uid, "2027-09-01", "2027-09-03")
    assert client_db.post(f"/bookings/{bid}/no-show", headers=h).json()["status"] == "no_show"


def test_metrics_revenue_cash_outstanding_commission(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    bid = _book_and_pay(client_db, uid, "2027-10-01", "2027-10-03")  # subtotal 2000

    m = client_db.get("/dashboard/metrics", headers=h).json()
    assert float(m["revenue_booked"]) == 2000.0
    assert float(m["cash_collected"]) == 400.0       # deposit only
    assert float(m["outstanding_balance"]) == 1600.0
    assert float(m["commission_saved"]) == 300.0     # 15% of 2000
    assert m["bookings_by_status"]["confirmed"] == 1

    # Complete with balance collected -> cash rises, outstanding clears.
    client_db.post(f"/bookings/{bid}/check-in", headers=h)
    client_db.post(f"/bookings/{bid}/complete", json={"balance_collected": True}, headers=h)
    m2 = client_db.get("/dashboard/metrics", headers=h).json()
    assert float(m2["cash_collected"]) == 2000.0
    assert float(m2["outstanding_balance"]) == 0.0
    assert m2["bookings_by_status"]["completed"] == 1


def test_metrics_occupancy_in_window(client_db, host_auth):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    # 2-night stay inside the occupancy window (starts in 3 days).
    ci = (date.today() + timedelta(days=3)).isoformat()
    co = (date.today() + timedelta(days=5)).isoformat()
    _book_and_pay(client_db, uid, ci, co)

    m = client_db.get("/dashboard/metrics", headers=h).json()
    # 2 booked nights / (1 unit * 30 days) * 100 = 6.67%
    assert float(m["occupancy_percent"]) > 0
    assert m["occupancy_window_days"] == 30


def test_metrics_empty_host(client_db, host_auth):
    m = client_db.get("/dashboard/metrics", headers=host_auth["headers"]).json()
    assert m["total_units"] == 0
    assert float(m["revenue_booked"]) == 0.0
    assert float(m["occupancy_percent"]) == 0.0

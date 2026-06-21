"""Reviews & ratings tests."""
from __future__ import annotations

from tests.conftest import make_host


def _published_unit(client, headers, **over):
    payload = {"title": "Reviewable", "city": "Goa", "base_price": "1000.00",
               "deposit_percent": "20.00", "capacity": 4, **over}
    u = client.post("/units", json=payload, headers=headers).json()
    client.patch(f"/units/{u['id']}", json={"status": "published"}, headers=headers)
    return u


def _booked_and_paid(client, unit_id, email):
    bid = client.post(
        f"/public/units/{unit_id}/bookings",
        json={"guest_name": "Asha", "guest_email": email,
              "check_in": "2027-03-01", "check_out": "2027-03-03"},
    ).json()["booking"]["id"]
    client.post(f"/public/bookings/{bid}/pay")
    return bid


def test_guest_can_review_their_paid_booking(client_db, host_auth, db_session):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    # A separate logged-in guest who books and reviews.
    guest, gh = make_host(db_session)
    bid = _booked_and_paid(client_db, uid, guest.email)

    resp = client_db.post("/reviews", json={"booking_id": bid, "rating": 5, "comment": "Great stay!"}, headers=gh)
    assert resp.status_code == 201, resp.text
    assert resp.json()["rating"] == 5

    # Aggregate now reflects the review.
    reviews = client_db.get(f"/public/units/{uid}/reviews").json()
    assert reviews["count"] == 1
    assert reviews["average"] == 5.0
    assert reviews["items"][0]["comment"] == "Great stay!"

    # Public unit detail exposes the rating.
    detail = client_db.get(f"/public/units/{uid}").json()
    assert detail["rating"] == 5.0
    assert detail["review_count"] == 1


def test_cannot_review_twice(client_db, host_auth, db_session):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    guest, gh = make_host(db_session)
    bid = _booked_and_paid(client_db, uid, guest.email)
    client_db.post("/reviews", json={"booking_id": bid, "rating": 4}, headers=gh)
    again = client_db.post("/reviews", json={"booking_id": bid, "rating": 3}, headers=gh)
    assert again.status_code == 409


def test_cannot_review_someone_elses_booking(client_db, host_auth, db_session):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    bid = _booked_and_paid(client_db, uid, "someoneelse@example.com")
    _, other = make_host(db_session)
    resp = client_db.post("/reviews", json={"booking_id": bid, "rating": 5}, headers=other)
    assert resp.status_code == 403


def test_cannot_review_unpaid_booking(client_db, host_auth, db_session):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    guest, gh = make_host(db_session)
    # Create hold but do NOT pay.
    bid = client_db.post(
        f"/public/units/{uid}/bookings",
        json={"guest_name": "Asha", "guest_email": guest.email,
              "check_in": "2027-04-01", "check_out": "2027-04-03"},
    ).json()["booking"]["id"]
    resp = client_db.post("/reviews", json={"booking_id": bid, "rating": 5}, headers=gh)
    assert resp.status_code == 400


def test_rating_out_of_range_rejected(client_db, host_auth, db_session):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    guest, gh = make_host(db_session)
    bid = _booked_and_paid(client_db, uid, guest.email)
    assert client_db.post("/reviews", json={"booking_id": bid, "rating": 6}, headers=gh).status_code == 422


def test_trips_show_reviewed_flag(client_db, host_auth, db_session):
    h = host_auth["headers"]
    uid = _published_unit(client_db, h)["id"]
    guest, gh = make_host(db_session)
    bid = _booked_and_paid(client_db, uid, guest.email)

    trips = client_db.get("/trips", headers=gh).json()
    assert trips["items"][0]["reviewed"] is False

    client_db.post("/reviews", json={"booking_id": bid, "rating": 5}, headers=gh)
    trips2 = client_db.get("/trips", headers=gh).json()
    assert trips2["items"][0]["reviewed"] is True

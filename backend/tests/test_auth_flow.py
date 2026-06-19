"""Phase 1 integration tests for the host auth flow.

These hit the real database through the transaction-isolated `client_db`
fixture (rolled back after each test). The OTP is real and verified end-to-end;
nothing is mocked or faked.
"""
from __future__ import annotations

import uuid


def _unique_email() -> str:
    return f"host_{uuid.uuid4().hex[:12]}@example.com"


def test_request_otp_returns_real_dev_code(client_db):
    resp = client_db.post("/auth/request-otp", json={"email": _unique_email()})
    assert resp.status_code == 200
    body = resp.json()
    assert body["dev_otp"] is not None
    assert len(body["dev_otp"]) == 6 and body["dev_otp"].isdigit()


def test_full_login_flow_creates_host_and_returns_token(client_db):
    email = _unique_email()

    otp = client_db.post("/auth/request-otp", json={"email": email}).json()["dev_otp"]

    verify = client_db.post(
        "/auth/verify-otp", json={"email": email, "code": otp}
    )
    assert verify.status_code == 200, verify.text
    data = verify.json()
    assert data["token_type"] == "bearer"
    assert data["host"]["email"] == email
    token = data["access_token"]

    me = client_db.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email


def test_login_is_case_insensitive_on_email(client_db):
    email = _unique_email().upper()
    otp = client_db.post("/auth/request-otp", json={"email": email}).json()["dev_otp"]
    verify = client_db.post("/auth/verify-otp", json={"email": email, "code": otp})
    assert verify.status_code == 200
    # Stored/normalized lowercase.
    assert verify.json()["host"]["email"] == email.lower()


def test_verify_with_wrong_code_is_rejected(client_db):
    email = _unique_email()
    client_db.post("/auth/request-otp", json={"email": email})
    resp = client_db.post("/auth/verify-otp", json={"email": email, "code": "000000"})
    assert resp.status_code == 400


def test_verify_without_request_is_rejected(client_db):
    resp = client_db.post(
        "/auth/verify-otp", json={"email": _unique_email(), "code": "123456"}
    )
    assert resp.status_code == 400


def test_me_requires_authentication(client_db):
    resp = client_db.get("/auth/me")
    assert resp.status_code == 403  # HTTPBearer rejects missing credentials


def test_me_rejects_invalid_token(client_db):
    resp = client_db.get(
        "/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert resp.status_code == 401

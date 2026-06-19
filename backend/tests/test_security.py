"""Phase 1 unit tests for security primitives (no DB)."""
from __future__ import annotations

import jwt
import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    generate_otp,
    hash_otp,
    verify_otp_hash,
)


def test_generate_otp_length_and_digits():
    code = generate_otp(6)
    assert len(code) == 6
    assert code.isdigit()


def test_hash_otp_is_deterministic_and_hex():
    h1 = hash_otp("123456")
    h2 = hash_otp("123456")
    assert h1 == h2
    assert len(h1) == 64  # sha256 hex
    assert hash_otp("123456") != hash_otp("654321")


def test_verify_otp_hash_match_and_mismatch():
    h = hash_otp("428193")
    assert verify_otp_hash("428193", h) is True
    assert verify_otp_hash("000000", h) is False


def test_access_token_roundtrip():
    token = create_access_token(subject="host-123")
    payload = decode_access_token(token)
    assert payload["sub"] == "host-123"
    assert "exp" in payload


def test_decode_rejects_tampered_token():
    token = create_access_token(subject="host-123")
    with pytest.raises(jwt.PyJWTError):
        decode_access_token(token + "tampered")

"""Security primitives: OTP hashing and JWT access tokens.

Secrets come from settings (env); nothing is hardcoded. OTP codes are hashed
with HMAC-SHA256 keyed by SECRET_KEY and compared in constant time.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


class SecretKeyNotConfiguredError(RuntimeError):
    """Raised when an auth operation needs SECRET_KEY but it is not set."""


def _require_secret() -> str:
    if not settings.secret_key.strip():
        raise SecretKeyNotConfiguredError(
            "SECRET_KEY is not set. Add it to backend/.env (see .env.example)."
        )
    return settings.secret_key


def generate_otp(length: int | None = None) -> str:
    """Generate a numeric OTP of the configured length, cryptographically random."""
    n = length or settings.otp_length
    return "".join(secrets.choice("0123456789") for _ in range(n))


def hash_otp(code: str) -> str:
    """HMAC-SHA256 of the code, keyed by SECRET_KEY. Returns hex digest."""
    key = _require_secret().encode("utf-8")
    return hmac.new(key, code.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_otp_hash(code: str, code_hash: str) -> bool:
    """Constant-time comparison of a candidate code against a stored hash."""
    return hmac.compare_digest(hash_otp(code), code_hash)


def create_access_token(subject: str, expires_minutes: int | None = None) -> str:
    """Create a signed JWT for the given subject (host id)."""
    secret = _require_secret()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc)}
    return jwt.encode(payload, secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises jwt.PyJWTError on failure."""
    secret = _require_secret()
    return jwt.decode(token, secret, algorithms=[settings.jwt_algorithm])

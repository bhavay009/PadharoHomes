"""Auth domain logic: OTP lifecycle and host resolution.

Pure-ish service functions that take a Session. No HTTP concerns here.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_otp, hash_otp, verify_otp_hash
from app.models.host import Host
from app.models.otp import OtpCode


def normalize_email(email: str) -> str:
    return email.strip().lower()


class OtpError(Exception):
    """Base class for OTP verification failures (maps to HTTP 400)."""


class OtpNotFoundError(OtpError):
    pass


class OtpExpiredError(OtpError):
    pass


class OtpTooManyAttemptsError(OtpError):
    pass


class OtpInvalidError(OtpError):
    pass


class OtpRateLimitError(Exception):
    """Too many OTP requests for this identifier (maps to HTTP 429)."""


def _enforce_rate_limit(db: Session, identifier: str) -> None:
    window_start = datetime.now(timezone.utc) - timedelta(
        minutes=settings.otp_request_window_minutes
    )
    recent = db.scalar(
        select(func.count())
        .select_from(OtpCode)
        .where(OtpCode.email == identifier, OtpCode.created_at >= window_start)
    ) or 0
    if recent >= settings.otp_max_requests:
        raise OtpRateLimitError(
            "Too many code requests. Please wait a few minutes and try again."
        )


def issue_otp(db: Session, email: str) -> str:
    """Create and persist a new OTP for the email; return the plaintext code.

    The plaintext is returned only so the caller can deliver it (and, in dev
    mode, surface it for testing). Only the hash is stored. Rate-limited per
    identifier to prevent abuse.
    """
    email = normalize_email(email)
    _enforce_rate_limit(db, email)
    code = generate_otp()
    otp = OtpCode(
        email=email,
        code_hash=hash_otp(code),
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=settings.otp_ttl_minutes),
    )
    db.add(otp)
    db.commit()
    return code


def verify_otp(db: Session, email: str, code: str) -> None:
    """Validate the latest unconsumed OTP for the email.

    Raises a specific OtpError subclass on failure. On success the OTP is
    marked consumed.
    """
    email = normalize_email(email)
    now = datetime.now(timezone.utc)

    otp = db.scalars(
        select(OtpCode)
        .where(OtpCode.email == email, OtpCode.consumed_at.is_(None))
        .order_by(OtpCode.created_at.desc())
    ).first()

    if otp is None:
        raise OtpNotFoundError("No active code for this email. Request a new one.")

    if otp.expires_at <= now:
        raise OtpExpiredError("Code has expired. Request a new one.")

    if otp.attempts >= settings.otp_max_attempts:
        raise OtpTooManyAttemptsError("Too many attempts. Request a new code.")

    if not verify_otp_hash(code, otp.code_hash):
        otp.attempts += 1
        db.commit()
        raise OtpInvalidError("Incorrect code.")

    otp.consumed_at = now
    db.commit()


def get_or_create_host(db: Session, email: str) -> Host:
    """Return the host for this email, creating one on first successful login."""
    email = normalize_email(email)
    host = db.scalars(select(Host).where(Host.email == email)).first()
    if host is None:
        host = Host(email=email)
        db.add(host)
        db.commit()
        db.refresh(host)
    return host


def normalize_phone(phone: str) -> str:
    return phone.strip().replace(" ", "")


def get_or_create_host_by_phone(db: Session, phone: str) -> Host:
    """Return the host for this phone, creating one on first successful login."""
    phone = normalize_phone(phone)
    host = db.scalars(select(Host).where(Host.phone == phone)).first()
    if host is None:
        host = Host(phone=phone)
        db.add(host)
        db.commit()
        db.refresh(host)
    return host

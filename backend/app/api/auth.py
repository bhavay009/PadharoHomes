"""Authentication routes: passwordless email OTP login for hosts.

Phase 1 runs in dev-mode delivery: the OTP is real (generated, hashed, stored,
verified) but, since no email provider is wired yet, it is returned in the
response and logged server-side in non-production only. It is never returned in
production.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_host, is_admin as _is_admin
from app.core.config import settings
from app.core.security import create_access_token
from app.core.database import get_db
from app.models.host import Host
from app.schemas.auth import (
    HostOut,
    RequestOtpIn,
    RequestOtpOut,
    TokenOut,
    VerifyOtpIn,
)
from app.services import auth_service, notifications

logger = logging.getLogger("padharo.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


def _identifier(payload):
    """Return (identifier, channel) for an email-or-phone payload."""
    if payload.email:
        return auth_service.normalize_email(payload.email), "email"
    return auth_service.normalize_phone(payload.phone), "phone"


@router.post("/request-otp", response_model=RequestOtpOut)
def request_otp(payload: RequestOtpIn, db: Session = Depends(get_db)) -> RequestOtpOut:
    identifier, channel = _identifier(payload)
    try:
        code = auth_service.issue_otp(db, identifier)
    except auth_service.OtpRateLimitError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)
        ) from exc

    sent_via_dev = notifications.send_otp(identifier, code, channel=channel)

    if sent_via_dev and not settings.is_production:
        return RequestOtpOut(
            detail="Dev mode: code returned in response (no provider configured).",
            dev_otp=code,
        )
    return RequestOtpOut(detail="If the account is valid, a code has been sent.")


@router.post("/verify-otp", response_model=TokenOut)
def verify_otp(payload: VerifyOtpIn, db: Session = Depends(get_db)) -> TokenOut:
    identifier, channel = _identifier(payload)
    try:
        auth_service.verify_otp(db, identifier, payload.code)
    except auth_service.OtpError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    if channel == "email":
        host = auth_service.get_or_create_host(db, identifier)
    else:
        host = auth_service.get_or_create_host_by_phone(db, identifier)
    token = create_access_token(subject=str(host.id))
    host.is_admin = _is_admin(host)
    return TokenOut(access_token=token, host=HostOut.model_validate(host))


@router.get("/me", response_model=HostOut)
def me(current_host: Host = Depends(get_current_host)) -> HostOut:
    current_host.is_admin = _is_admin(current_host)
    return HostOut.model_validate(current_host)

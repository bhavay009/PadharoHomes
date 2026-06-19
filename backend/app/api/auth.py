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

from app.api.deps import get_current_host
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
from app.services import auth_service

logger = logging.getLogger("padharo.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-otp", response_model=RequestOtpOut)
def request_otp(payload: RequestOtpIn, db: Session = Depends(get_db)) -> RequestOtpOut:
    code = auth_service.issue_otp(db, payload.email)
    email = auth_service.normalize_email(payload.email)

    if settings.is_production:
        # Real delivery is wired in a later phase; until then, do not leak codes.
        logger.info("OTP issued for %s (delivery provider not yet configured)", email)
        return RequestOtpOut(detail="If the email is valid, a code has been sent.")

    # Dev mode: surface the real code so the flow is fully testable without a provider.
    logger.info("DEV OTP for %s: %s", email, code)
    return RequestOtpOut(
        detail="Dev mode: code returned in response (no email provider yet).",
        dev_otp=code,
    )


@router.post("/verify-otp", response_model=TokenOut)
def verify_otp(payload: VerifyOtpIn, db: Session = Depends(get_db)) -> TokenOut:
    try:
        auth_service.verify_otp(db, payload.email, payload.code)
    except auth_service.OtpError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    host = auth_service.get_or_create_host(db, payload.email)
    token = create_access_token(subject=str(host.id))
    return TokenOut(access_token=token, host=HostOut.model_validate(host))


@router.get("/me", response_model=HostOut)
def me(current_host: Host = Depends(get_current_host)) -> HostOut:
    return HostOut.model_validate(current_host)

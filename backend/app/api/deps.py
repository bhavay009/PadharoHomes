"""Shared FastAPI dependencies."""
from __future__ import annotations

import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.host import Host

bearer_scheme = HTTPBearer(auto_error=True)

_CREDENTIALS_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_host(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Host:
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if subject is None:
            raise _CREDENTIALS_EXC
        host_id = uuid.UUID(subject)
    except (jwt.PyJWTError, ValueError):
        raise _CREDENTIALS_EXC

    host = db.get(Host, host_id)
    if host is None or not host.is_active:
        raise _CREDENTIALS_EXC
    return host


def is_admin(host: Host) -> bool:
    return host.email in settings.admin_email_set


def get_current_admin(host: Host = Depends(get_current_host)) -> Host:
    if not is_admin(host):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required."
        )
    return host

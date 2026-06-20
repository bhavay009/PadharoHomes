"""Email sender factory.

Returns the real Resend adapter when configured, otherwise the console/dev
adapter. Selected per-call so config/tests can switch behaviour.
"""
from __future__ import annotations

from app.core.config import settings
from app.services.email.base import EmailMessage, EmailSender
from app.services.email.console import ConsoleSender


def get_sender() -> EmailSender:
    if settings.email_real_configured:
        from app.services.email.resend_sender import ResendSender

        return ResendSender()
    return ConsoleSender()


__all__ = ["EmailMessage", "EmailSender", "ConsoleSender", "get_sender"]

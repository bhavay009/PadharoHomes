"""Resend email adapter (real delivery)."""
from __future__ import annotations

import resend

from app.core.config import settings
from app.services.email.base import EmailMessage


class ResendSender:
    name = "resend"
    is_dev = False

    def __init__(self) -> None:
        resend.api_key = settings.resend_api_key
        self._from = settings.email_from

    def send(self, message: EmailMessage) -> None:
        params: resend.Emails.SendParams = {
            "from": self._from,
            "to": [message.to],
            "subject": message.subject,
            "text": message.text,
        }
        if message.html:
            params["html"] = message.html
        resend.Emails.send(params)

"""Console/dev email adapter.

Implements the real EmailSender interface but does not deliver: it logs each
message and captures it in memory so the booking/notification flows are fully
testable without an email provider. `is_dev = True` lets callers (e.g. OTP)
keep the dev-mode fallback while no real provider is configured.
"""
from __future__ import annotations

import logging

from app.services.email.base import EmailMessage

logger = logging.getLogger("padharo.email")

# In-memory capture for tests. Not used as application state.
_SENT: list[EmailMessage] = []


def sent_messages() -> list[EmailMessage]:
    return list(_SENT)


def clear_sent() -> None:
    _SENT.clear()


class ConsoleSender:
    name = "console"
    is_dev = True

    def send(self, message: EmailMessage) -> None:
        _SENT.append(message)
        logger.info("EMAIL [console] to=%s subject=%s", message.to, message.subject)

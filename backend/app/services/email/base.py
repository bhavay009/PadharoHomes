"""Email sender interface."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass
class EmailMessage:
    to: str
    subject: str
    text: str
    html: str | None = None


@runtime_checkable
class EmailSender(Protocol):
    name: str
    is_dev: bool  # True for the console/dev adapter (no real delivery)

    def send(self, message: EmailMessage) -> None: ...

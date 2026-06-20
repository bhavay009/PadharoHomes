"""Payment gateway interface."""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Protocol, runtime_checkable


@dataclass
class PaymentIntent:
    id: str
    amount: Decimal
    currency: str
    status: str  # "created" | "paid" | "failed"
    # Adapter-specific extras the client needs (e.g. a checkout token/redirect).
    client: dict = field(default_factory=dict)


@runtime_checkable
class PaymentGateway(Protocol):
    name: str

    def create_intent(
        self, amount: Decimal, currency: str, metadata: dict
    ) -> PaymentIntent:
        """Create a payment intent for the deposit. Does not capture funds."""
        ...

    def confirm(self, intent_id: str) -> PaymentIntent:
        """Capture/confirm the intent. Raises on failure; returns a paid intent."""
        ...

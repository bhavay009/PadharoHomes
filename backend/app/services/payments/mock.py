"""Mock payment gateway for development.

Implements the real `PaymentGateway` interface. `create_intent` mints an intent
id; `confirm` marks it paid. No real money moves, but the booking flow goes
through exactly the same code path a real adapter will — so nothing is faked as
paid outside the gateway boundary.

The deposit is only ever marked captured when the booking service calls
`confirm()` here, mirroring how a real gateway's webhook/redirect return works.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from app.services.payments.base import PaymentIntent


class PaymentError(Exception):
    """Raised when a payment cannot be confirmed."""


class MockGateway:
    name = "mock"

    def create_intent(
        self, amount: Decimal, currency: str, metadata: dict
    ) -> PaymentIntent:
        intent_id = f"mock_{uuid.uuid4().hex}"
        return PaymentIntent(
            id=intent_id,
            amount=amount,
            currency=currency,
            status="created",
            client={"mock": True, "confirm_url": f"/public/payments/{intent_id}/confirm"},
        )

    def confirm(self, intent_id: str) -> PaymentIntent:
        if not intent_id.startswith("mock_"):
            raise PaymentError("Unknown payment intent.")
        # In the mock, confirmation always succeeds.
        return PaymentIntent(
            id=intent_id, amount=Decimal("0"), currency="", status="paid"
        )

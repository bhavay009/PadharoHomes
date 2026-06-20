"""Payment gateway abstraction.

A single `PaymentGateway` interface that the booking flow depends on. The
concrete adapter is selected by `settings.payment_gateway`. Only the mock
adapter is wired today; Razorpay/Stripe adapters implement the same interface
later without touching the booking logic.

Nothing is ever treated as "paid" except through a gateway's `confirm()`.
"""
from __future__ import annotations

from app.core.config import settings
from app.services.payments.base import PaymentGateway, PaymentIntent
from app.services.payments.mock import MockGateway


def get_gateway() -> PaymentGateway:
    name = settings.payment_gateway.lower()
    if name == "mock":
        return MockGateway()
    raise NotImplementedError(
        f"Payment gateway '{name}' is not wired yet. Set payment_gateway=mock "
        "or add an adapter implementing PaymentGateway."
    )


__all__ = ["PaymentGateway", "PaymentIntent", "MockGateway", "get_gateway"]

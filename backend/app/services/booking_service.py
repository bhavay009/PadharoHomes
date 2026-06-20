"""Booking domain logic: hold-then-pay flow, state machine, cancellation.

Concurrency: `create_hold` takes the unit row lock before checking availability
and inserting the pending booking, so two guests racing for the same dates
serialize — exactly one hold is created.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.booking import Booking, BookingStatus, Payment, PaymentStatus
from app.models.unit import Unit
from app.services import availability_service, pricing_service
from app.services.payments import get_gateway
from app.services.payments.mock import PaymentError


class BookingError(Exception):
    """Invalid booking operation / bad state transition (maps to HTTP 400)."""


class BookingUnavailableError(Exception):
    """Requested dates are not available (maps to HTTP 409)."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_booking(db: Session, booking_id: uuid.UUID) -> Booking | None:
    return db.get(Booking, booking_id)


def is_hold_active(booking: Booking) -> bool:
    return (
        booking.status == BookingStatus.pending
        and booking.hold_expires_at is not None
        and booking.hold_expires_at > _now()
    )


def create_hold(
    db: Session,
    unit: Unit,
    *,
    guest_name: str,
    guest_email: str,
    guest_phone: str | None,
    check_in,
    check_out,
) -> tuple[Booking, Payment, dict]:
    """Create a pending booking holding the dates, plus a deposit payment intent.

    Returns (booking, payment, intent_client) where intent_client is the
    gateway's client payload. Caller commits.
    """
    # Lock the unit so the availability check + insert are atomic vs. other holds.
    if not availability_service.lock_unit(db, unit.id):
        raise BookingUnavailableError("Unit not found.")

    try:
        breakdown = pricing_service.price_breakdown(db, unit, check_in, check_out)
    except pricing_service.QuoteError as exc:
        raise BookingError(str(exc)) from exc

    if not availability_service.is_available(db, unit.id, check_in, check_out):
        raise BookingUnavailableError("Selected dates are not available.")

    booking = Booking(
        unit_id=unit.id,
        host_id=unit.host_id,
        guest_name=guest_name,
        guest_email=guest_email.strip().lower(),
        guest_phone=guest_phone,
        check_in=check_in,
        check_out=check_out,
        nights=breakdown["nights"],
        currency=breakdown["currency"],
        subtotal=breakdown["subtotal"],
        deposit_percent=breakdown["deposit_percent"],
        deposit_amount=breakdown["deposit_due"],
        balance_amount=breakdown["balance_due"],
        status=BookingStatus.pending,
        hold_expires_at=_now() + timedelta(minutes=settings.booking_hold_minutes),
    )
    db.add(booking)
    db.flush()

    gateway = get_gateway()
    intent = gateway.create_intent(
        booking.deposit_amount, booking.currency, {"booking_id": str(booking.id)}
    )
    payment = Payment(
        booking_id=booking.id,
        gateway=gateway.name,
        intent_id=intent.id,
        amount=booking.deposit_amount,
        currency=booking.currency,
        status=PaymentStatus.created,
    )
    db.add(payment)
    db.flush()
    return booking, payment, intent.client


def pay_deposit(db: Session, booking: Booking) -> Booking:
    """Confirm the deposit through the gateway and confirm the booking."""
    if booking.status != BookingStatus.pending:
        raise BookingError(f"Cannot pay a booking in status '{booking.status.value}'.")
    if not is_hold_active(booking):
        booking.status = BookingStatus.expired
        db.commit()
        raise BookingError("Hold has expired. Please start a new booking.")

    payment = db.scalars(
        select(Payment).where(Payment.booking_id == booking.id)
    ).first()
    if payment is None:
        raise BookingError("No payment intent for this booking.")

    gateway = get_gateway()
    try:
        result = gateway.confirm(payment.intent_id)
    except PaymentError as exc:
        payment.status = PaymentStatus.failed
        db.commit()
        raise BookingError(f"Payment failed: {exc}") from exc

    if result.status != "paid":
        payment.status = PaymentStatus.failed
        db.commit()
        raise BookingError("Payment was not completed.")

    now = _now()
    payment.status = PaymentStatus.paid
    payment.paid_at = now
    booking.status = BookingStatus.confirmed
    booking.deposit_paid_at = now
    booking.hold_expires_at = None
    db.commit()
    db.refresh(booking)
    return booking


def cancel(db: Session, booking: Booking) -> Booking:
    """Cancel a pending or confirmed booking.

    Pending: dates released, no forfeit. Confirmed/checked_in: deposit is
    forfeited (per the v1 non-refundable-deposit policy)."""
    if booking.status not in (
        BookingStatus.pending,
        BookingStatus.confirmed,
        BookingStatus.checked_in,
    ):
        raise BookingError(
            f"Cannot cancel a booking in status '{booking.status.value}'."
        )
    booking.status = BookingStatus.cancelled
    booking.cancelled_at = _now()
    # deposit_refunded stays False -> forfeited if a deposit was paid.
    db.commit()
    db.refresh(booking)
    return booking


# ---- Host-side transitions (endpoints exposed in Phase 6) ----
def check_in(db: Session, booking: Booking) -> Booking:
    if booking.status != BookingStatus.confirmed:
        raise BookingError("Only a confirmed booking can be checked in.")
    booking.status = BookingStatus.checked_in
    booking.checked_in_at = _now()
    db.commit()
    db.refresh(booking)
    return booking


def complete(db: Session, booking: Booking, *, balance_collected: bool) -> Booking:
    if booking.status != BookingStatus.checked_in:
        raise BookingError("Only a checked-in booking can be completed.")
    now = _now()
    booking.status = BookingStatus.completed
    booking.completed_at = now
    if balance_collected:
        booking.balance_collected_at = now
    db.commit()
    db.refresh(booking)
    return booking


def mark_no_show(db: Session, booking: Booking) -> Booking:
    if booking.status != BookingStatus.confirmed:
        raise BookingError("Only a confirmed booking can be marked no-show.")
    booking.status = BookingStatus.no_show
    # deposit_refunded stays False -> forfeited.
    db.commit()
    db.refresh(booking)
    return booking

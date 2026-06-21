"""Notification emails for auth + booking lifecycle events.

Each function builds an EmailMessage and sends it through the configured sender.
Sends are best-effort: a delivery failure is logged and never breaks the
underlying operation (booking, etc.).
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.host import Host
from app.models.unit import Unit
from app.services.email import EmailMessage, get_sender

logger = logging.getLogger("padharo.notifications")


def _safe_send(message: EmailMessage) -> None:
    try:
        get_sender().send(message)
    except Exception:  # pragma: no cover - exercised only on real provider outages
        logger.exception("Failed to send email to %s", message.to)


def send_otp(identifier: str, code: str, channel: str = "email") -> bool:
    """Send a login OTP via email or SMS. Returns True if delivered via a *dev*
    channel (so the caller may surface the code), False if a real provider sent it.

    No SMS provider is wired yet, so phone OTPs always run in dev mode.
    """
    if channel == "phone":
        logger.info("DEV SMS OTP for %s: %s (no SMS provider configured)", identifier, code)
        return True

    sender = get_sender()
    msg = EmailMessage(
        to=identifier,
        subject="Your Padharo Homes login code",
        text=f"Your login code is {code}. It expires shortly.",
        html=f"<p>Your login code is <strong>{code}</strong>.</p>",
    )
    try:
        sender.send(msg)
    except Exception:  # pragma: no cover
        logger.exception("Failed to send OTP email to %s", identifier)
    return getattr(sender, "is_dev", False)


def _stay_summary(unit: Unit, booking: Booking) -> str:
    return (
        f"{unit.title} — {booking.check_in} to {booking.check_out} "
        f"({booking.nights} night/s)"
    )


def notify_booking_confirmed(db: Session, booking: Booking) -> None:
    unit = db.get(Unit, booking.unit_id)
    host = db.get(Host, booking.host_id)
    summary = _stay_summary(unit, booking)

    # Guest confirmation
    _safe_send(
        EmailMessage(
            to=booking.guest_email,
            subject="Your booking is confirmed",
            text=(
                f"Hi {booking.guest_name},\n\n"
                f"Your booking is confirmed: {summary}.\n"
                f"Deposit paid: {booking.currency} {booking.deposit_amount}.\n"
                f"Balance due at property: {booking.currency} {booking.balance_amount}.\n\n"
                f"Booking reference: {booking.id}"
            ),
        )
    )
    # Host notification
    if host is not None:
        _safe_send(
            EmailMessage(
                to=host.email,
                subject="New booking confirmed",
                text=(
                    f"New confirmed booking for {summary}.\n"
                    f"Guest: {booking.guest_name} ({booking.guest_email}).\n"
                    f"Deposit received: {booking.currency} {booking.deposit_amount}; "
                    f"balance to collect: {booking.currency} {booking.balance_amount}."
                ),
            )
        )


def notify_check_in(db: Session, booking: Booking) -> None:
    unit = db.get(Unit, booking.unit_id)
    _safe_send(
        EmailMessage(
            to=booking.guest_email,
            subject="Check-in information",
            text=(
                f"Hi {booking.guest_name},\n\n"
                f"You're checked in for {_stay_summary(unit, booking)}.\n"
                f"Address: {unit.address_line or unit.city}.\n"
                f"Balance due at property: {booking.currency} {booking.balance_amount}."
            ),
        )
    )


def notify_booking_cancelled(db: Session, booking: Booking) -> None:
    unit = db.get(Unit, booking.unit_id)
    host = db.get(Host, booking.host_id)
    summary = _stay_summary(unit, booking)

    _safe_send(
        EmailMessage(
            to=booking.guest_email,
            subject="Your booking was cancelled",
            text=(
                f"Hi {booking.guest_name},\n\n"
                f"Your booking has been cancelled: {summary}."
            ),
        )
    )
    if host is not None:
        _safe_send(
            EmailMessage(
                to=host.email,
                subject="Booking cancelled",
                text=f"A booking was cancelled: {summary} (guest {booking.guest_email}).",
            )
        )

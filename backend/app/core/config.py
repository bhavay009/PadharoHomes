"""Application configuration, loaded from environment / .env.

No secrets are hardcoded. `DATABASE_URL` must be supplied via the environment
(see .env.example). It is intentionally optional at import time so the app and
unit tests can run without a database; code paths that need the DB validate it
explicitly.
"""
from __future__ import annotations

from decimal import Decimal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    # Hosted Postgres connection string (e.g. Neon/Supabase). Empty until provided.
    database_url: str = ""

    # Auth / JWT. SECRET_KEY must be supplied via env (.env); never hardcoded.
    secret_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # OTP policy
    otp_length: int = 6
    otp_ttl_minutes: int = 10
    otp_max_attempts: int = 5

    # Cloudinary (photo uploads). Supplied via env; never hardcoded.
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    # Default currency for listings.
    default_currency: str = "INR"

    # Bookings / payments
    booking_hold_minutes: int = 15
    # Active payment gateway: "mock" | "razorpay" | "stripe" (only "mock" wired now).
    payment_gateway: str = "mock"

    # Dashboard: assumed aggregator commission rate (percent) a host avoids by
    # taking direct bookings. Used for the "commission saved" metric. Configurable.
    ota_commission_percent: Decimal = Decimal("15")
    # Rolling window (days) for the occupancy metric.
    occupancy_window_days: int = 30

    # Email. provider: "console" (dev, logs/captures) | "resend".
    email_provider: str = "console"
    resend_api_key: str = ""
    email_from: str = ""  # e.g. "Padharo Homes <bookings@yourdomain.com>"

    @property
    def email_real_configured(self) -> bool:
        return (
            self.email_provider.lower() == "resend"
            and bool(self.resend_api_key.strip())
            and bool(self.email_from.strip())
        )

    @property
    def database_configured(self) -> bool:
        return bool(self.database_url.strip())

    @property
    def cloudinary_configured(self) -> bool:
        return all(
            v.strip()
            for v in (
                self.cloudinary_cloud_name,
                self.cloudinary_api_key,
                self.cloudinary_api_secret,
            )
        )

    # Comma-separated emails granted admin access.
    admin_emails: str = ""

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}

    @property
    def admin_email_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}


settings = Settings()

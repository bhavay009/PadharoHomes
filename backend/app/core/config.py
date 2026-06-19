"""Application configuration, loaded from environment / .env.

No secrets are hardcoded. `DATABASE_URL` must be supplied via the environment
(see .env.example). It is intentionally optional at import time so the app and
unit tests can run without a database; code paths that need the DB validate it
explicitly.
"""
from __future__ import annotations

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

    @property
    def database_configured(self) -> bool:
        return bool(self.database_url.strip())


settings = Settings()

"""
Central application configuration.

All values are overridable via environment variables / a .env file so the
same codebase runs unmodified across local dev, CI, and production.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- General ---
    APP_NAME: str = "AegisPAM"
    ENVIRONMENT: str = "development"  # development | staging | production
    API_V1_PREFIX: str = "/api/v1"

    # --- Database ---
    # Defaults to a local SQLite file so the project runs out of the box
    # for demos/grading without requiring a Postgres instance to be
    # provisioned first. Set DATABASE_URL in .env to point at real Postgres,
    # e.g. postgresql://user:password@localhost:5432/aegispam_db
    DATABASE_URL: str = "sqlite:///./aegispam.db"

    # --- Auth / JWT ---
    SECRET_KEY: str = "CHANGE_ME_DEV_ONLY_32_CHARACTERS_MIN"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Encryption (Secret Vault, Layer 4) ---
    # Must be a valid Fernet key (32 url-safe base64-encoded bytes).
    # Generate one with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    ENCRYPTION_KEY: str = "y2GqU9x1lF3iH8bT6mZ0nC4wA7dS2eR5vK1jP9oX3qY="

    # --- CORS (frontend origin) ---
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # --- Session / access policy ---
    MAX_ACCESS_DURATION_MINUTES: int = 480  # 8 hours hard cap on JIT sessions
    MIN_ACCESS_DURATION_MINUTES: int = 5

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()

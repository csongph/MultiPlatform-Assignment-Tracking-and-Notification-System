from functools import lru_cache
from urllib.parse import urlsplit, urlunsplit

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str
    REDIS_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    TOKEN_ENCRYPTION_KEY: str

    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    GOOGLE_OAUTH_REDIRECT_URI: str = "http://localhost:8000/api/v1/oauth/google_classroom/callback"

    MICROSOFT_OAUTH_CLIENT_ID: str = ""
    MICROSOFT_OAUTH_CLIENT_SECRET: str = ""
    MICROSOFT_OAUTH_TENANT: str = "organizations"
    MICROSOFT_OAUTH_REDIRECT_URI: str = "http://localhost:8000/api/v1/oauth/microsoft_teams/callback"

    # Where the browser is sent back to after onboarding finishes (your frontend app)
    FRONTEND_ORIGIN: str = "http://localhost:5500"
    FRONTEND_ORIGINS: str = ""
    FRONTEND_ONBOARDING_SUCCESS_PATH: str = "/pages/onboarding.html"
    FRONTEND_ONBOARDING_ERROR_PATH: str = "/pages/onboarding.html"

    SYNC_INTERVAL_MINUTES: int = 10
    NOTIFICATION_POLL_INTERVAL_SECONDS: int = 60
    NOTIFICATION_MAX_RETRIES: int = 3

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "KMAPS"
    SMTP_USE_TLS: bool = True
    PASSWORD_RESET_COOLDOWN_SECONDS: int = 60
    PASSWORD_RESET_OTP_TTL_MINUTES: int = 10
    PASSWORD_RESET_MAX_OTP_ATTEMPTS: int = 5
    FORWARDED_ALLOW_IPS: str = "127.0.0.1"
    TOKEN_REFRESH_LEAD_MINUTES: int = 15
    CACHE_TTL_SECONDS: int = 300

    @field_validator("JWT_SECRET_KEY", "TOKEN_ENCRYPTION_KEY")
    @classmethod
    def validate_security_secret(cls, value: str) -> str:
        if len(value) < 32 or value.lower().startswith(("replace-", "your-", "change-")):
            raise ValueError("Security secrets must be configured with unique values of at least 32 characters")
        return value

    @field_validator("REDIS_URL")
    @classmethod
    def normalize_local_redis_host(cls, value: str) -> str:
        parsed = urlsplit(value)
        if parsed.hostname != "localhost":
            return value

        credentials = parsed.netloc.rsplit("@", 1)
        auth = f"{credentials[0]}@" if len(credentials) == 2 else ""
        port = f":{parsed.port}" if parsed.port is not None else ""
        return urlunsplit(parsed._replace(netloc=f"{auth}127.0.0.1{port}"))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

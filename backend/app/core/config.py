from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    MICROSOFT_OAUTH_TENANT: str = "common"
    MICROSOFT_OAUTH_REDIRECT_URI: str = "http://localhost:8000/api/v1/oauth/microsoft_teams/callback"

    # Where the browser is sent back to after onboarding finishes (your frontend app)
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    FRONTEND_ONBOARDING_SUCCESS_PATH: str = "/onboarding/success"
    FRONTEND_ONBOARDING_ERROR_PATH: str = "/onboarding/error"

    SYNC_INTERVAL_MINUTES: int = 10
    NOTIFICATION_POLL_INTERVAL_SECONDS: int = 60
    TOKEN_REFRESH_LEAD_MINUTES: int = 15
    CACHE_TTL_SECONDS: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

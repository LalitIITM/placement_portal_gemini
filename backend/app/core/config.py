from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Placement, Training & Career Platform"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://placement_user:placement_password@localhost:5432/placement_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-production-super-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    GOOGLE_CLIENT_ID: str = ""
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "https://*.vercel.app"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

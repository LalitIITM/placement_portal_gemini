from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Centralized Placement & Career Platform"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    DATABASE_URL: str = (
        "postgresql+asyncpg://placement_user:placement_password@localhost:5432/placement_db"
    )
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "dev-secret-key"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
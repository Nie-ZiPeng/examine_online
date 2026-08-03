from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    UPLOAD_DIR: str = "./uploads"
    AI_BASE_URL: str | None = None
    AI_API_KEY: str | None = None
    AI_MODEL: str | None = None
    AI_TIMEOUT_SECONDS: int = 60
    AI_MAX_RETRIES: int = 2
    AI_WORKER_POLL_SECONDS: float = 1.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

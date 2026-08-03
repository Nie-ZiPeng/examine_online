from app.config import Settings


def test_ai_settings_use_safe_defaults():
    settings = Settings(
        _env_file=None,
        DATABASE_URL="sqlite+aiosqlite://",
        REDIS_URL="redis://x",
        JWT_SECRET_KEY="x",
    )

    assert settings.AI_BASE_URL is None
    assert settings.AI_TIMEOUT_SECONDS == 60
    assert settings.AI_MAX_RETRIES == 2

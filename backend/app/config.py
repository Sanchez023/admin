"""
Configuration Management
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # App
    APP_NAME: str = "Claw Admin Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./claw_admin.db"

    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Password
    PASSWORD_MIN_LENGTH: int = 6

    # CORS
    CORS_ORIGINS: list = ["*"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings"""
    return Settings()


settings = get_settings()

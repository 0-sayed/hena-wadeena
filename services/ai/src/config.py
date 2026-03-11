"""Environment configuration validated with Pydantic."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """AI service settings — loaded from environment variables."""

    service_name: str = "ai"
    port: int = 8005
    environment: str = "development"
    log_level: str = "info"

    # Database — required, see .env.example for setup instructions
    database_url: str

    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_key_prefix: str = "ai:"

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection_name: str = "hena_knowledge_base"

    # Gemini
    gemini_api_key: str = ""
    gemini_chat_model: str = "gemini-2.0-flash-lite"
    gemini_embedding_model: str = "text-embedding-004"

    # JWT (for validating tokens from other services)
    jwt_access_secret: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()

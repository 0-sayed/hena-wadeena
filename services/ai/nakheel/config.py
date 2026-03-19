import secrets
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    APP_NAME: str = "Nakheel RAG Chatbot"
    APP_ENV: str = "development"
    APP_PORT: int = 7000
    APP_VERSION: str = "1.0.0"
    APP_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "nakheel_db"

    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_API_KEY: str | None = None
    QDRANT_COLLECTION: str = "nakheel_chunks"
    QDRANT_USE_HTTPS: bool = False

    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    OPENAI_EMBEDDING_DIMENSIONS: int = 1024
    OPENAI_MAX_TOKENS: int = 1024
    OPENAI_TEMPERATURE: float = 0.3

    BGE_RERANKER_MODEL: str = "BAAI/bge-reranker-v2-m3"
    BGE_USE_FP16: bool = False

    PDF_PARSER_BACKEND: str = "pypdf"
    PDF_ENABLE_OCR: bool = False
    PDF_ENABLE_TABLE_STRUCTURE: bool = False

    CHUNK_MAX_TOKENS: int = 512
    CHUNK_MIN_TOKENS: int = 50
    CHUNK_OVERLAP_RATIO: float = 0.20

    DENSE_TOP_K: int = 20
    SPARSE_TOP_K: int = 20
    RRF_K: int = 60
    RRF_TOP_N: int = 10
    RERANKER_TOP_K: int = 5
    RELEVANCE_THRESHOLD: float = 0.35
    DENSE_WEIGHT: float = 0.7
    SPARSE_WEIGHT: float = 0.3

    SESSION_MAX_MESSAGES: int = 10
    SESSION_TTL_HOURS: int = 24
    TOKEN_BUDGET_HISTORY: int = 2000

    MAX_FILE_SIZE_MB: int = 50
    TEMP_DIR: Path = Field(default=Path("./tmp/nakheel"))
    PARSED_FILE_TTL_HOURS: int = 2

    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 30
    RATE_LIMIT_INJECT_PER_HOUR: int = 10


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
    return settings


from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from jwt import ExpiredSignatureError, InvalidTokenError
import jwt

from nakheel.config import Settings
from nakheel.core.generation.llm_client import LLMClient
from nakheel.core.generation.prompt_builder import PromptBuilder
from nakheel.core.ingestion.indexer import DocumentIndexer
from nakheel.core.retrieval.hybrid_search import HybridSearchService
from nakheel.core.retrieval.query_processor import QueryProcessor
from nakheel.core.retrieval.reranker import RerankerService
from nakheel.core.session.session_manager import SessionManager
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase


class AuthenticatedUser(BaseModel):
    user_id: str
    email: str | None = None
    role: str | None = None


bearer_scheme = HTTPBearer(auto_error=False)


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_mongo(request: Request) -> MongoDatabase:
    return request.app.state.mongo


def get_qdrant(request: Request) -> QdrantDatabase:
    return request.app.state.qdrant


def get_indexer(request: Request) -> DocumentIndexer:
    return request.app.state.indexer


def get_query_processor(request: Request) -> QueryProcessor:
    return request.app.state.query_processor


def get_hybrid_search(request: Request) -> HybridSearchService:
    return request.app.state.hybrid_search


def get_reranker(request: Request) -> RerankerService:
    return request.app.state.reranker


def get_llm_client(request: Request) -> LLMClient:
    return request.app.state.llm_client


def get_prompt_builder(request: Request) -> PromptBuilder:
    return request.app.state.prompt_builder


def get_session_manager(request: Request) -> SessionManager:
    return request.app.state.session_manager


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    if not settings.JWT_ACCESS_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="JWT validation is not configured",
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_ACCESS_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False},
        )
    except ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        ) from exc
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    email = payload.get("email")
    role = payload.get("role")

    return AuthenticatedUser(
        user_id=user_id,
        email=email if isinstance(email, str) else None,
        role=role if isinstance(role, str) else None,
    )

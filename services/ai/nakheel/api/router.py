from fastapi import APIRouter

from nakheel.api.endpoints.chat import router as chat_router
from nakheel.api.endpoints.documents import router as documents_router
from nakheel.api.endpoints.health import router as health_router
from nakheel.api.endpoints.legacy_ai import router as legacy_ai_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(documents_router, tags=["documents"])
api_router.include_router(chat_router, tags=["chat"])
api_router.include_router(legacy_ai_router, tags=["ai-legacy"])

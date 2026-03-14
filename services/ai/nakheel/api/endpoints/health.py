from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from nakheel.api.deps import get_llm_client, get_mongo, get_qdrant, get_settings
from nakheel.config import Settings
from nakheel.core.generation.llm_client import LLMClient
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase

router = APIRouter()


@router.get("/health")
async def health(
    request: Request,
    settings: Settings = Depends(get_settings),
    mongo: MongoDatabase = Depends(get_mongo),
    qdrant: QdrantDatabase = Depends(get_qdrant),
    llm_client: LLMClient = Depends(get_llm_client),
):
    mongo_ok = await mongo.ping()
    qdrant_ok = qdrant.ping()
    return {
        "status": "healthy" if mongo_ok and qdrant_ok else "degraded",
        "version": settings.APP_VERSION,
        "services": {
            "mongodb": "connected" if mongo_ok else "disconnected",
            "qdrant": "connected" if qdrant_ok else "disconnected",
            "openai": "configured" if llm_client.is_available() else "not_configured",
            "bge_model": "loaded_or_fallback",
        },
        "startup_checks": getattr(request.app.state, "startup_checks", {}),
    }

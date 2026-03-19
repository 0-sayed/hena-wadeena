from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.concurrency import run_in_threadpool

from nakheel.api.deps import get_llm_client, get_mongo, get_qdrant, get_settings
from nakheel.config import Settings
from nakheel.core.generation.llm_client import LLMClient
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase

router = APIRouter()


@router.get("/health")
async def health(
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
    mongo: MongoDatabase = Depends(get_mongo),
    qdrant: QdrantDatabase = Depends(get_qdrant),
    llm_client: LLMClient = Depends(get_llm_client),
):
    """Report current dependency reachability plus the last startup validation results."""

    mongo_ok = await mongo.ping()
    qdrant_ok = await run_in_threadpool(qdrant.ping)
    healthy = mongo_ok and qdrant_ok
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {
        "status": "healthy" if healthy else "degraded",
        "version": settings.APP_VERSION,
        "services": {
            "mongodb": "connected" if mongo_ok else "disconnected",
            "qdrant": "connected" if qdrant_ok else "disconnected",
            "openai": "configured" if llm_client.is_available() else "not_configured",
            "embedding_backend": "openai_or_fallback",
        },
        "startup_checks": getattr(request.app.state, "startup_checks", {}),
    }

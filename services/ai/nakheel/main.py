from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger

from nakheel.api.router import api_router
from nakheel.config import get_settings
from nakheel.core.generation.llm_client import LLMClient
from nakheel.core.generation.prompt_builder import PromptBuilder
from nakheel.core.ingestion.embedder import DenseEmbedder
from nakheel.core.ingestion.indexer import DocumentIndexer
from nakheel.core.ingestion.parser import DocumentParser
from nakheel.core.ingestion.sparse_embedder import SparseEmbedder
from nakheel.core.retrieval.hybrid_search import HybridSearchService
from nakheel.core.retrieval.query_processor import QueryProcessor
from nakheel.core.retrieval.reranker import RerankerService
from nakheel.core.session.session_manager import SessionManager
from nakheel.db.mongo import MongoDatabase
from nakheel.db.qdrant import QdrantDatabase
from nakheel.exceptions import NakheelBaseException


@dataclass(slots=True)
class StartupCheck:
    """Represents the result of a single startup dependency validation."""

    ok: bool
    detail: str


async def validate_startup_dependencies(
    mongo: MongoDatabase,
    qdrant: QdrantDatabase,
    dense_embedder: DenseEmbedder,
    reranker: RerankerService,
    llm_client: LLMClient,
) -> dict[str, dict[str, str | bool]]:
    """Run all critical readiness checks before the app accepts traffic."""

    mongo_ok = await mongo.ping()
    qdrant_ok = await asyncio.to_thread(qdrant.ping)
    embedder_check, reranker_check, llm_check = await asyncio.gather(
        dense_embedder.startup_check_async(),
        reranker.startup_check_async(),
        llm_client.startup_check_async(),
    )
    checks = {
        "mongodb": StartupCheck(ok=mongo_ok, detail="connected" if mongo_ok else "unreachable"),
        "qdrant": StartupCheck(ok=qdrant_ok, detail="connected" if qdrant_ok else "unreachable"),
        "embedder": StartupCheck(**embedder_check),
        "reranker": StartupCheck(**reranker_check),
        "llm": StartupCheck(**llm_check),
    }
    return {name: asdict(check) for name, check in checks.items()}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create shared services once and fail fast if a critical dependency is unavailable."""

    settings = get_settings()
    mongo = MongoDatabase(settings)
    qdrant = QdrantDatabase(settings)
    await mongo.connect()
    qdrant.connect()
    await mongo.ensure_indexes()
    qdrant.ensure_collection()

    dense_embedder = DenseEmbedder(settings)
    sparse_embedder = SparseEmbedder()
    parser = DocumentParser(settings)
    query_processor = QueryProcessor(dense_embedder, sparse_embedder)
    reranker = RerankerService(settings)
    llm_client = LLMClient(settings)
    prompt_builder = PromptBuilder()
    session_manager = SessionManager(mongo, settings)
    hybrid_search = HybridSearchService(settings, qdrant, mongo)
    indexer = DocumentIndexer(
        settings=settings,
        mongo=mongo,
        qdrant=qdrant,
        parser=parser,
        dense_embedder=dense_embedder,
        sparse_embedder=sparse_embedder,
    )

    startup_checks = await validate_startup_dependencies(
        mongo=mongo,
        qdrant=qdrant,
        dense_embedder=dense_embedder,
        reranker=reranker,
        llm_client=llm_client,
    )
    failed_checks = [
        name
        for name, status in startup_checks.items()
        if not status["ok"] and name in {"mongodb", "qdrant", "embedder", "llm"}
    ]
    if failed_checks:
        await mongo.close()
        qdrant.close()
        raise RuntimeError(
            "Startup validation failed: "
            + ", ".join(f"{name}={startup_checks[name]['detail']}" for name in failed_checks)
        )

    app.state.settings = settings
    app.state.mongo = mongo
    app.state.qdrant = qdrant
    app.state.indexer = indexer
    app.state.query_processor = query_processor
    app.state.hybrid_search = hybrid_search
    app.state.reranker = reranker
    app.state.llm_client = llm_client
    app.state.prompt_builder = prompt_builder
    app.state.session_manager = session_manager
    app.state.startup_checks = startup_checks
    app.state.document_batch_tasks = set()

    logger.info("Nakheel app started with validated dependencies")
    try:
        yield
    finally:
        batch_tasks = list(getattr(app.state, "document_batch_tasks", set()))
        for task in batch_tasks:
            task.cancel()
        if batch_tasks:
            await asyncio.gather(*batch_tasks, return_exceptions=True)
        await mongo.close()
        qdrant.close()
        logger.info("Nakheel app stopped")


app = FastAPI(title=get_settings().APP_NAME, version=get_settings().APP_VERSION, lifespan=lifespan)
app.include_router(api_router, prefix=get_settings().API_V1_PREFIX)


@app.exception_handler(NakheelBaseException)
async def nakheel_exception_handler(_, exc: NakheelBaseException) -> JSONResponse:
    """Return domain exceptions in RFC 7807-compatible JSON form."""

    payload = {
        "type": f"https://httpstatuses.com/{exc.status_code}",
        "title": exc.title,
        "status": exc.status_code,
        "detail": exc.detail,
        "error": exc.error_code,
        **exc.extras,
    }
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError) -> JSONResponse:
    """Normalize framework validation errors to the same response shape."""

    return JSONResponse(
        status_code=422,
        content={
            "type": "https://httpstatuses.com/422",
            "title": "Validation Error",
            "status": 422,
            "detail": "Request validation failed",
            "error": "VALIDATION_ERROR",
            "errors": exc.errors(include_input=False),
        },
    )

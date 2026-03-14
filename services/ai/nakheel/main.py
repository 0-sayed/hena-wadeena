from __future__ import annotations

from contextlib import asynccontextmanager

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


@asynccontextmanager
async def lifespan(app: FastAPI):
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

    mongo_ok = await mongo.ping()
    qdrant_ok = qdrant.ping()
    embedder_check = dense_embedder.startup_check()
    reranker_check = reranker.startup_check()
    llm_check = llm_client.startup_check()
    startup_checks = {
        "mongodb": {"ok": mongo_ok, "detail": "connected" if mongo_ok else "unreachable"},
        "qdrant": {"ok": qdrant_ok, "detail": "connected" if qdrant_ok else "unreachable"},
        "embedder": embedder_check,
        "reranker": reranker_check,
        "llm": llm_check,
    }
    failed_checks = [name for name, status in startup_checks.items() if not status["ok"]]
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

    logger.info("Nakheel app started with validated dependencies")
    try:
        yield
    finally:
        await mongo.close()
        qdrant.close()
        logger.info("Nakheel app stopped")


app = FastAPI(title=get_settings().APP_NAME, version=get_settings().APP_VERSION, lifespan=lifespan)
app.include_router(api_router, prefix=get_settings().API_V1_PREFIX)


@app.exception_handler(NakheelBaseException)
async def nakheel_exception_handler(_, exc: NakheelBaseException) -> JSONResponse:
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
    return JSONResponse(
        status_code=422,
        content={
            "type": "https://httpstatuses.com/422",
            "title": "Validation Error",
            "status": 422,
            "detail": "Request validation failed",
            "error": "VALIDATION_ERROR",
            "errors": exc.errors(),
        },
    )

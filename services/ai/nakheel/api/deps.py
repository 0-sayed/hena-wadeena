from fastapi import Request

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

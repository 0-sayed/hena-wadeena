from __future__ import annotations

import math
import time

from fastapi import APIRouter, Depends

from nakheel.api.deps import (
    get_hybrid_search,
    get_llm_client,
    get_prompt_builder,
    get_query_processor,
    get_reranker,
    get_session_manager,
)
from nakheel.config import get_settings
from nakheel.core.generation.context_builder import build_context
from nakheel.core.generation.domain_guard import is_domain_relevant, localized_refusal, post_process_response
from nakheel.core.generation.llm_client import LLMClient
from nakheel.core.generation.prompt_builder import PromptBuilder
from nakheel.core.retrieval.hybrid_search import HybridSearchService
from nakheel.core.retrieval.query_processor import QueryProcessor
from nakheel.core.retrieval.reranker import RerankerService
from nakheel.core.session.session_manager import SessionManager
from nakheel.models.api import CreateSessionRequest, SendMessageRequest
from nakheel.models.message import MessageRole, RetrievedChunkRef

router = APIRouter(prefix="/chat")


def _map_sources(retrieved_chunks: list[RetrievedChunkRef]) -> list[dict]:
    """Convert internal chunk references to API response payloads."""

    return [
        {
            "chunk_id": chunk.chunk_id,
            "doc_id": chunk.doc_id,
            "section_title": chunk.section_title,
            "relevance_score": chunk.score,
            "text_snippet": chunk.text_snippet,
        }
        for chunk in retrieved_chunks
    ]


def _build_retrieved_refs(reranked_results) -> list[RetrievedChunkRef]:
    """Flatten reranked chunks into the persisted source-reference model."""

    return [
        RetrievedChunkRef(
            chunk_id=result.chunk.chunk.chunk_id,
            doc_id=result.chunk.chunk.doc_id,
            section_title=result.chunk.chunk.section_title,
            score=result.score,
            text_snippet=result.chunk.chunk.text[:200],
        )
        for result in reranked_results
    ]


@router.post("/sessions", status_code=201)
async def create_session(
    payload: CreateSessionRequest,
    session_manager: SessionManager = Depends(get_session_manager),
):
    """Create a new chat session and return the localized greeting."""

    session = await session_manager.create_session(
        user_id=payload.user_id,
        language_preference=payload.language_preference,
        metadata=payload.metadata,
    )
    return {
        "session_id": session.session_id,
        "user_id": session.user_id,
        "created_at": session.created_at,
        "language_preference": payload.language_preference,
        "message_count": session.message_count,
        "is_active": session.is_active,
        "welcome_message": session_manager.welcome_message(payload.language_preference),
    }


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    payload: SendMessageRequest,
    session_manager: SessionManager = Depends(get_session_manager),
    query_processor: QueryProcessor = Depends(get_query_processor),
    hybrid_search: HybridSearchService = Depends(get_hybrid_search),
    reranker: RerankerService = Depends(get_reranker),
    llm_client: LLMClient = Depends(get_llm_client),
    prompt_builder: PromptBuilder = Depends(get_prompt_builder),
):
    """Handle the full chat pipeline from retrieval to grounded response generation."""

    started = time.perf_counter()
    session = await session_manager.get_session(session_id)
    language = session_manager.detect_or_prefer_language(session.language or payload.language, payload.content)
    await session_manager.save_message(
        session_id=session_id,
        role=MessageRole.USER,
        content=payload.content,
        language=language,
    )

    processed = await query_processor.process_async(payload.content)
    candidates = await hybrid_search.search(processed)
    reranked = await reranker.rerank_async(processed.normalized_text, candidates)
    domain_relevant = is_domain_relevant(reranked, get_settings().RELEVANCE_THRESHOLD)

    retrieved_refs = _build_retrieved_refs(reranked)
    latency_ms = int((time.perf_counter() - started) * 1000)

    if not domain_relevant:
        content = localized_refusal(language)
        assistant_message = await session_manager.save_message(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=content,
            language=language,
            retrieved_chunks=retrieved_refs,
            domain_relevant=False,
            llm_model=None,
            latency_ms=latency_ms,
        )
        return {
            "message_id": assistant_message.message_id,
            "session_id": session_id,
            "role": "assistant",
            "content": content,
            "language": language,
            "created_at": assistant_message.created_at,
            "sources": [],
            "domain_relevant": False,
            "latency_ms": latency_ms,
        }

    context = build_context(reranked)
    system_prompt = prompt_builder.build_system_prompt(language)
    user_prompt = prompt_builder.build_user_prompt(payload.content, context)
    history = await session_manager.build_context_window(session_id, user_prompt)
    messages = [{"role": "system", "content": system_prompt}, *history]
    llm_response = await llm_client.complete_async(messages)
    content = post_process_response(llm_response.content, language)
    assistant_message = await session_manager.save_message(
        session_id=session_id,
        role=MessageRole.ASSISTANT,
        content=content,
        language=language,
        retrieved_chunks=retrieved_refs,
        domain_relevant=True,
        llm_model=llm_response.model,
        prompt_tokens=llm_response.prompt_tokens,
        completion_tokens=llm_response.completion_tokens,
        latency_ms=latency_ms,
    )
    return {
        "message_id": assistant_message.message_id,
        "session_id": session_id,
        "role": "assistant",
        "content": content,
        "language": language,
        "created_at": assistant_message.created_at,
        "sources": _map_sources(retrieved_refs),
        "domain_relevant": True,
        "latency_ms": latency_ms,
    }


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    page: int = 1,
    per_page: int = 20,
    session_manager: SessionManager = Depends(get_session_manager),
):
    """Return paginated session details and stored message history."""

    session = await session_manager.get_session(session_id)
    messages, total = await session_manager.get_messages(session_id, page=page, per_page=per_page)
    return {
        "session_id": session.session_id,
        "user_id": session.user_id,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
        "is_active": session.is_active,
        "message_count": session.message_count,
        "messages": [
            {
                "message_id": message.message_id,
                "role": message.role.value,
                "content": message.content,
                "language": message.language,
                "created_at": message.created_at,
                "sources": _map_sources(message.retrieved_chunks),
            }
            for message in messages
        ],
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_messages": total,
            "total_pages": max(1, math.ceil(total / per_page)),
        },
    }


@router.delete("/sessions/{session_id}")
async def close_session(
    session_id: str,
    session_manager: SessionManager = Depends(get_session_manager),
):
    """Close an existing session without deleting its stored history."""

    session = await session_manager.close_session(session_id)
    return {
        "session_id": session.session_id,
        "closed": True,
        "message_count": session.message_count,
        "closed_at": session.updated_at,
    }

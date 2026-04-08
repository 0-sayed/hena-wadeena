from __future__ import annotations

import json
import math
import time
from datetime import date, datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from nakheel.api.deps import (
    AuthenticatedUser,
    get_current_user,
    get_hybrid_search,
    get_llm_client,
    get_prompt_builder,
    get_query_processor,
    get_reranker,
    get_session_manager,
)
from nakheel.config import get_settings
from nakheel.core.generation.context_builder import build_context
from nakheel.core.generation.domain_guard import (
    is_domain_relevant,
    localized_refusal,
    post_process_response,
)
from nakheel.core.generation.llm_client import LLMClient
from nakheel.core.generation.prompt_builder import PromptBuilder
from nakheel.core.retrieval.hybrid_search import HybridSearchService
from nakheel.core.retrieval.query_processor import QueryProcessor
from nakheel.core.retrieval.reranker import RerankerService
from nakheel.core.session.session_manager import SessionManager
from nakheel.models.api import CreateSessionRequest, SendMessageRequest
from nakheel.models.message import MessageRole, RetrievedChunkRef
from nakheel.models.session import Session

router = APIRouter(prefix="/chat")
STREAM_ERROR_MESSAGE = "Unable to send your message right now. Please try again."


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


def _build_chat_response(
    *,
    assistant_message,
    session_id: str,
    content: str,
    language: str,
    retrieved_refs: list[RetrievedChunkRef],
    domain_relevant: bool,
    llm_model: str | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    latency_ms: int | None = None,
) -> dict:
    return {
        "message_id": assistant_message.message_id,
        "session_id": session_id,
        "role": "assistant",
        "content": content,
        "language": language,
        "created_at": assistant_message.created_at,
        "sources": _map_sources(retrieved_refs) if domain_relevant else [],
        "domain_relevant": domain_relevant,
        "latency_ms": latency_ms,
        "llm_model": llm_model,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
    }


def _json_default(value: object) -> str:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _serialize_stream_event(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, default=_json_default) + "\n"


async def process_user_message(
    *,
    session: Session,
    session_id: str,
    payload: SendMessageRequest,
    session_manager: SessionManager,
    query_processor: QueryProcessor,
    hybrid_search: HybridSearchService,
    reranker: RerankerService,
    llm_client: LLMClient,
    prompt_builder: PromptBuilder,
) -> dict:
    """Shared pipeline used by native and legacy chat endpoints."""

    started = time.perf_counter()
    settings = get_settings()
    language = session_manager.detect_or_prefer_language(session.language or payload.language, payload.content)
    user_message = await session_manager.save_message(
        session_id=session_id,
        role=MessageRole.USER,
        content=payload.content,
        language=language,
    )

    processed = await query_processor.process_async(payload.content)
    candidates = await hybrid_search.search(processed)
    reranked = await reranker.rerank_async(processed.normalized_text, candidates)
    domain_relevant = is_domain_relevant(reranked, settings.RELEVANCE_THRESHOLD)

    retrieved_refs = _build_retrieved_refs(reranked)

    if not domain_relevant:
        content = localized_refusal(language)
        latency_ms = int((time.perf_counter() - started) * 1000)
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
        return _build_chat_response(
            assistant_message=assistant_message,
            session_id=session_id,
            content=content,
            language=language,
            retrieved_refs=retrieved_refs,
            domain_relevant=False,
            latency_ms=latency_ms,
        )

    context = build_context(reranked, token_budget=settings.TOKEN_BUDGET_CONTEXT)
    system_prompt = prompt_builder.build_system_prompt(language)
    user_prompt = prompt_builder.build_user_prompt(payload.content, context)
    history = await session_manager.build_context_window(
        session_id,
        user_prompt,
        exclude_message_id=user_message.message_id,
    )
    messages = [{"role": "system", "content": system_prompt}, *history]
    llm_response = await llm_client.complete_async(messages)
    content = post_process_response(llm_response.content, language)
    latency_ms = int((time.perf_counter() - started) * 1000)
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
    return _build_chat_response(
        assistant_message=assistant_message,
        session_id=session_id,
        content=content,
        language=language,
        retrieved_refs=retrieved_refs,
        domain_relevant=True,
        llm_model=llm_response.model,
        prompt_tokens=llm_response.prompt_tokens,
        completion_tokens=llm_response.completion_tokens,
        latency_ms=latency_ms,
    )


@router.post("/sessions", status_code=201)
async def create_session(
    force_new: bool = False,
    payload: CreateSessionRequest | None = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager),
):
    """Get or create a chat session and return the localized greeting."""

    request_payload = payload or CreateSessionRequest()
    session = await session_manager.get_or_create_active_session(
        user_id=current_user.user_id,
        language_preference=request_payload.language_preference,
        metadata=request_payload.metadata,
        force_new=force_new,
    )
    return {
        "session_id": session.session_id,
        "user_id": session.user_id,
        "created_at": session.created_at,
        "language_preference": request_payload.language_preference,
        "message_count": session.message_count,
        "is_active": session.is_active,
        "welcome_message": session_manager.welcome_message(request_payload.language_preference),
    }


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    payload: SendMessageRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager),
    query_processor: QueryProcessor = Depends(get_query_processor),
    hybrid_search: HybridSearchService = Depends(get_hybrid_search),
    reranker: RerankerService = Depends(get_reranker),
    llm_client: LLMClient = Depends(get_llm_client),
    prompt_builder: PromptBuilder = Depends(get_prompt_builder),
):
    """Handle one user message in an existing session."""

    session = await session_manager.get_session(session_id, user_id=current_user.user_id)
    return await process_user_message(
        session=session,
        session_id=session_id,
        payload=payload,
        session_manager=session_manager,
        query_processor=query_processor,
        hybrid_search=hybrid_search,
        reranker=reranker,
        llm_client=llm_client,
        prompt_builder=prompt_builder,
    )


@router.post("/sessions/{session_id}/messages/stream")
async def stream_message(
    session_id: str,
    payload: SendMessageRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager),
    query_processor: QueryProcessor = Depends(get_query_processor),
    hybrid_search: HybridSearchService = Depends(get_hybrid_search),
    reranker: RerankerService = Depends(get_reranker),
    llm_client: LLMClient = Depends(get_llm_client),
    prompt_builder: PromptBuilder = Depends(get_prompt_builder),
):
    """Stream assistant tokens while preserving the final stored chat message."""

    session = await session_manager.get_session(session_id, user_id=current_user.user_id)
    settings = get_settings()

    async def event_stream():
        try:
            started = time.perf_counter()
            language = session_manager.detect_or_prefer_language(
                session.language or payload.language,
                payload.content,
            )
            user_message = await session_manager.save_message(
                session_id=session_id,
                role=MessageRole.USER,
                content=payload.content,
                language=language,
            )

            processed = await query_processor.process_async(payload.content)
            candidates = await hybrid_search.search(processed)
            reranked = await reranker.rerank_async(processed.normalized_text, candidates)
            domain_relevant = is_domain_relevant(reranked, settings.RELEVANCE_THRESHOLD)
            retrieved_refs = _build_retrieved_refs(reranked)

            if not domain_relevant:
                content = localized_refusal(language)
                latency_ms = int((time.perf_counter() - started) * 1000)
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
                yield _serialize_stream_event({"type": "token", "delta": content})
                yield _serialize_stream_event(
                    {
                        "type": "complete",
                        "message": _build_chat_response(
                            assistant_message=assistant_message,
                            session_id=session_id,
                            content=content,
                            language=language,
                            retrieved_refs=retrieved_refs,
                            domain_relevant=False,
                            latency_ms=latency_ms,
                        ),
                    }
                )
                return

            context = build_context(reranked, token_budget=settings.TOKEN_BUDGET_CONTEXT)
            system_prompt = prompt_builder.build_system_prompt(language)
            user_prompt = prompt_builder.build_user_prompt(payload.content, context)
            history = await session_manager.build_context_window(
                session_id,
                user_prompt,
                exclude_message_id=user_message.message_id,
            )
            messages = [{"role": "system", "content": system_prompt}, *history]

            streamed_parts: list[str] = []
            llm_response = None
            async for event in llm_client.stream_async(messages):
                if event.type == "token":
                    streamed_parts.append(event.delta)
                    yield _serialize_stream_event({"type": "token", "delta": event.delta})
                    continue
                llm_response = event.response

            final_response = llm_response or await llm_client.complete_async(messages)
            content = post_process_response(final_response.content or "".join(streamed_parts), language)
            latency_ms = int((time.perf_counter() - started) * 1000)
            assistant_message = await session_manager.save_message(
                session_id=session_id,
                role=MessageRole.ASSISTANT,
                content=content,
                language=language,
                retrieved_chunks=retrieved_refs,
                domain_relevant=True,
                llm_model=final_response.model,
                prompt_tokens=final_response.prompt_tokens,
                completion_tokens=final_response.completion_tokens,
                latency_ms=latency_ms,
            )
            yield _serialize_stream_event(
                {
                    "type": "complete",
                    "message": _build_chat_response(
                        assistant_message=assistant_message,
                        session_id=session_id,
                        content=content,
                        language=language,
                        retrieved_refs=retrieved_refs,
                        domain_relevant=True,
                        llm_model=final_response.model,
                        prompt_tokens=final_response.prompt_tokens,
                        completion_tokens=final_response.completion_tokens,
                        latency_ms=latency_ms,
                    ),
                }
            )
        except Exception:
            yield _serialize_stream_event({"type": "error", "message": STREAM_ERROR_MESSAGE})

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager),
):
    """Return paginated session details and stored message history."""

    session = await session_manager.get_session(session_id, user_id=current_user.user_id)
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
    current_user: AuthenticatedUser = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager),
):
    """Close an existing session without deleting its stored history."""

    session = await session_manager.close_session(session_id, user_id=current_user.user_id)
    return {
        "session_id": session.session_id,
        "closed": True,
        "message_count": session.message_count,
        "closed_at": session.updated_at,
    }

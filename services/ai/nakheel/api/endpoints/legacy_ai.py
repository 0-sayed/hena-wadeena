from __future__ import annotations

from fastapi import APIRouter, Depends

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
from nakheel.api.endpoints.chat import process_user_message
from nakheel.core.generation.llm_client import LLMClient
from nakheel.core.generation.prompt_builder import PromptBuilder
from nakheel.core.retrieval.hybrid_search import HybridSearchService
from nakheel.core.retrieval.query_processor import QueryProcessor
from nakheel.core.retrieval.reranker import RerankerService
from nakheel.core.session.session_manager import SessionManager
from nakheel.models.api import LegacyChatRequest, SendMessageRequest

router = APIRouter(prefix="/ai")


@router.post("/chat", deprecated=True)
async def legacy_chat(
    payload: LegacyChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager),
    query_processor: QueryProcessor = Depends(get_query_processor),
    hybrid_search: HybridSearchService = Depends(get_hybrid_search),
    reranker: RerankerService = Depends(get_reranker),
    llm_client: LLMClient = Depends(get_llm_client),
    prompt_builder: PromptBuilder = Depends(get_prompt_builder),
):
    """Temporary compatibility shim for legacy /ai/chat clients."""

    session = None
    conversation_id = payload.conversation_id

    if conversation_id:
        session = await session_manager.get_session(conversation_id, user_id=current_user.user_id)
    else:
        session = await session_manager.get_or_create_active_session(
            user_id=current_user.user_id,
            language_preference=payload.language,
            metadata={},
            force_new=False,
        )
        conversation_id = session.session_id

    response = await process_user_message(
        session=session,
        session_id=conversation_id,
        payload=SendMessageRequest(content=payload.message, language=payload.language),
        session_manager=session_manager,
        query_processor=query_processor,
        hybrid_search=hybrid_search,
        reranker=reranker,
        llm_client=llm_client,
        prompt_builder=prompt_builder,
    )

    return {
        "success": True,
        "data": {
            "response": response["content"],
            "conversation_id": conversation_id,
            "sources": response["sources"],
        },
    }

from __future__ import annotations

from nakheel.core.retrieval.reranker import ScoredChunk
from nakheel.utils.token_counter import count_tokens


def build_context(chunks: list[ScoredChunk], token_budget: int = 3000) -> str:
    sections: list[str] = []
    budget = 0
    for scored in chunks:
        snippet = f"[{scored.chunk.chunk.section_title or 'Context'}]\n{scored.chunk.chunk.text}"
        token_count = count_tokens(snippet)
        if sections and budget + token_count > token_budget:
            break
        sections.append(snippet)
        budget += token_count
    return "\n\n---\n\n".join(sections)


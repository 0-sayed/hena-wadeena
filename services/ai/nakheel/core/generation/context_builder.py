from __future__ import annotations

from nakheel.core.retrieval.reranker import ScoredChunk
from nakheel.utils.token_counter import count_tokens


def build_context(chunks: list[ScoredChunk], token_budget: int = 3000) -> str:
    sections: list[str] = []
    budget = 0
    separator = "\n\n---\n\n"
    separator_tokens = count_tokens(separator)
    for scored in chunks:
        snippet = f"[{scored.chunk.chunk.section_title or 'Context'}]\n{scored.chunk.chunk.text}"
        token_count = count_tokens(snippet)
        additional_tokens = token_count + (separator_tokens if sections else 0)
        if budget + additional_tokens > token_budget:
            if sections:
                break
            continue
        sections.append(snippet)
        budget += additional_tokens
    return separator.join(sections)

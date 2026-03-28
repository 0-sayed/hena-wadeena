from __future__ import annotations

from nakheel.utils.token_counter import count_tokens


def trim_history(messages: list[dict[str, str]], max_messages: int, token_budget: int) -> list[dict[str, str]]:
    if max_messages <= 0:
        return []

    trimmed = messages[-max_messages:]
    total_tokens = sum(count_tokens(item["content"]) for item in trimmed)

    while trimmed and total_tokens > token_budget:
        total_tokens -= count_tokens(trimmed[0]["content"])
        trimmed = trimmed[1:]

    return trimmed
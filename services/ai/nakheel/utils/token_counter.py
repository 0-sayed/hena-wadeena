from __future__ import annotations

import re


try:
    import tiktoken
except ImportError:  # pragma: no cover
    tiktoken = None


def count_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    if not text:
        return 0
    if tiktoken is not None:
        try:
            try:
                encoding = tiktoken.encoding_for_model(model)
            except KeyError:
                encoding = tiktoken.get_encoding("o200k_base")
            return len(encoding.encode(text))
        except Exception:
            pass
    return len(re.findall(r"\S+", text))

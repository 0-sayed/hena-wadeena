from __future__ import annotations

import unicodedata


def slugify(text: str) -> str:
    """Generate a stable kebab-case slug while preserving Arabic letters and digits."""

    normalized = unicodedata.normalize("NFKC", text).lower().strip()
    slug_chars: list[str] = []
    previous_hyphen = False

    for char in normalized:
        if char.isalnum():
            slug_chars.append(char)
            previous_hyphen = False
            continue

        if char.isspace() or char in {"-", "_", "/"}:
            if slug_chars and not previous_hyphen:
                slug_chars.append("-")
                previous_hyphen = True

    return "".join(slug_chars).strip("-")

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass

from loguru import logger

from nakheel.core.generation.llm_client import LLMClient
from nakheel.utils.slug import slugify
from nakheel.utils.text_cleaning import clean_text

MAX_CURATED_ENTRIES = 40
DESCRIPTION_LIMIT = 180
HEADING_TERMINATORS = {".", "!", "?", "؟", ":", "؛"}


@dataclass(slots=True)
class CuratedKnowledgeDraft:
    slug: str
    title: str
    description: str
    content: str
    tags: list[str]
    language: str = "ar"

    def to_dict(self) -> dict:
        return asdict(self)


def normalize_curated_entries(
    raw_entries: list[dict],
    *,
    default_language: str = "ar",
) -> list[CuratedKnowledgeDraft]:
    """Validate and normalize curated entries coming from either the LLM or the admin UI."""

    normalized: list[CuratedKnowledgeDraft] = []
    seen_slugs: set[str] = set()

    for index, raw_entry in enumerate(raw_entries[:MAX_CURATED_ENTRIES], start=1):
        if not isinstance(raw_entry, dict):
            continue

        content = clean_text(str(raw_entry.get("content", "")))
        if not content:
            continue

        title = clean_text(str(raw_entry.get("title", ""))) or _derive_title(content)
        slug_source = clean_text(str(raw_entry.get("slug", ""))) or title
        slug = _ensure_unique_slug(slugify(slug_source) or f"section-{index}", seen_slugs)
        seen_slugs.add(slug)

        description = clean_text(str(raw_entry.get("description", ""))) or _derive_description(content)
        language = clean_text(str(raw_entry.get("language", default_language))) or default_language
        tags = _normalize_tags(raw_entry.get("tags"))

        normalized.append(
            CuratedKnowledgeDraft(
                slug=slug,
                title=title,
                description=description,
                content=content,
                tags=tags,
                language=language,
            )
        )

    return normalized


async def compose_curated_documents(
    text: str,
    *,
    llm_client: LLMClient,
    default_language: str = "ar",
) -> tuple[str, list[CuratedKnowledgeDraft]]:
    """Compose topic-separated curated RAG entries, preferring the LLM with a deterministic fallback."""

    cleaned = clean_text(text)
    if not cleaned:
        return "fallback", []

    fallback_entries = _fallback_compose(cleaned, default_language=default_language)

    if not llm_client.is_available():
        return "fallback", fallback_entries

    try:
        response = await llm_client.complete_async(
            [
                {
                    "role": "system",
                    "content": (
                        "You are a knowledge-base editor for a retrieval-augmented chatbot. "
                        "Split the provided report into an array of standalone topic entries. "
                        "Each entry must cover one distinct subject, keep enough context from its heading, "
                        "and use exactly these keys: slug, title, description, content, tags, language. "
                        "Return JSON only. Slugs must be kebab-case and unique."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Return a JSON array only.\n"
                        "Guidelines:\n"
                        "- Keep each content field focused on one subject.\n"
                        "- Include the heading context inside the content when needed.\n"
                        "- Keep descriptions short.\n"
                        "- Use language 'ar' unless the text is clearly another language.\n\n"
                        f"Text:\n{cleaned}"
                    ),
                },
            ]
        )
        llm_entries = normalize_curated_entries(
            _load_llm_payload(response.content),
            default_language=default_language,
        )
        if llm_entries:
            return "llm", llm_entries
        logger.warning("Curated composer received an empty LLM payload; using fallback")
    except Exception as exc:
        logger.opt(exception=exc).warning("Curated composer fell back to heuristic splitting")

    return "fallback", fallback_entries


def _load_llm_payload(content: str) -> list[dict]:
    payload_text = content.strip()
    if payload_text.startswith("```"):
        parts = payload_text.split("```")
        payload_text = parts[1] if len(parts) > 1 else payload_text
        payload_text = payload_text.replace("json", "", 1).strip()

    array_start = payload_text.find("[")
    array_end = payload_text.rfind("]")
    if array_start >= 0 and array_end > array_start:
        payload_text = payload_text[array_start : array_end + 1]

    parsed = json.loads(payload_text)
    if isinstance(parsed, list):
        return [item for item in parsed if isinstance(item, dict)]
    if isinstance(parsed, dict):
        entries = parsed.get("entries")
        if isinstance(entries, list):
            return [item for item in entries if isinstance(item, dict)]
    raise ValueError("LLM response did not contain a JSON array")


def _fallback_compose(text: str, *, default_language: str) -> list[CuratedKnowledgeDraft]:
    blocks = [clean_text(block) for block in re.split(r"\n{2,}", text) if clean_text(block)]
    raw_entries: list[dict] = []
    current_heading: str | None = None
    current_body: list[str] = []

    def flush() -> None:
        nonlocal current_heading, current_body
        if current_heading and current_body:
            body = "\n\n".join(current_body)
            raw_entries.append(
                {
                    "title": current_heading,
                    "description": _derive_description(body),
                    "content": f"{current_heading}\n\n{body}",
                    "tags": [],
                    "language": default_language,
                }
            )
        elif current_body:
            for body in current_body:
                raw_entries.append(
                    {
                        "title": _derive_title(body),
                        "description": _derive_description(body),
                        "content": body,
                        "tags": [],
                        "language": default_language,
                    }
                )
        current_heading = None
        current_body = []

    for block in blocks:
        if _looks_like_heading(block):
            flush()
            current_heading = block.rstrip(":")
            continue
        current_body.append(block)

    flush()

    if not raw_entries and text:
        raw_entries = [
            {
                "title": _derive_title(text),
                "description": _derive_description(text),
                "content": text,
                "tags": [],
                "language": default_language,
            }
        ]

    return normalize_curated_entries(raw_entries, default_language=default_language)


def _looks_like_heading(block: str) -> bool:
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    if len(lines) != 1:
        return False

    heading = lines[0]
    words = heading.split()
    if len(words) < 2 or len(words) > 14 or len(heading) > 120:
        return False

    return heading[-1] not in HEADING_TERMINATORS


def _normalize_tags(raw_tags: object) -> list[str]:
    if isinstance(raw_tags, list):
        candidates = [str(tag).strip() for tag in raw_tags]
    elif isinstance(raw_tags, str):
        candidates = [tag.strip() for tag in raw_tags.split(",")]
    else:
        candidates = []

    normalized: list[str] = []
    seen: set[str] = set()
    for candidate in candidates:
        if not candidate:
            continue
        key = candidate.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(candidate)
    return normalized[:8]


def _derive_title(content: str) -> str:
    first_line = next((line.strip() for line in content.splitlines() if line.strip()), "")
    if not first_line:
        return "Untitled section"
    words = first_line.split()
    if len(words) <= 12:
        return first_line[:120]
    return " ".join(words[:12]).strip()


def _derive_description(content: str) -> str:
    compact = " ".join(content.split())
    if len(compact) <= DESCRIPTION_LIMIT:
        return compact
    return compact[: DESCRIPTION_LIMIT - 1].rstrip() + "…"


def _ensure_unique_slug(slug: str, seen_slugs: set[str]) -> str:
    if slug not in seen_slugs:
        return slug

    suffix = 2
    while f"{slug}-{suffix}" in seen_slugs:
        suffix += 1
    return f"{slug}-{suffix}"

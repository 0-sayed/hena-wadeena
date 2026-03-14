from __future__ import annotations

from dataclasses import dataclass

from openai import OpenAI

from nakheel.config import Settings
from nakheel.exceptions import LLMError


@dataclass(slots=True)
class LLMResponse:
    content: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    model: str | None = None


class LLMClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None

    def is_available(self) -> bool:
        return self.client is not None

    def complete(self, messages: list[dict[str, str]]) -> LLMResponse:
        if self.client is None:
            return LLMResponse(
                content="I don't have enough information about this in my knowledge base.",
                model="fallback",
            )
        try:
            response = self.client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=messages,
                temperature=self.settings.OPENAI_TEMPERATURE,
                max_tokens=self.settings.OPENAI_MAX_TOKENS,
            )
            choice = response.choices[0].message.content or ""
            usage = response.usage
            return LLMResponse(
                content=choice,
                prompt_tokens=getattr(usage, "prompt_tokens", None),
                completion_tokens=getattr(usage, "completion_tokens", None),
                model=response.model,
            )
        except Exception as exc:
            raise LLMError("Failed to generate response") from exc

    def startup_check(self) -> dict[str, str | bool]:
        if self.client is None:
            return {"ok": False, "detail": "OPENAI_API_KEY is not configured"}
        try:
            response = self.client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": "Reply with OK"}],
                temperature=0,
                max_tokens=3,
            )
            content = (response.choices[0].message.content or "").strip()
            return {"ok": bool(content), "detail": f"LLM responded: {content}"}
        except Exception as exc:
            return {"ok": False, "detail": f"LLM startup check failed: {exc}"}

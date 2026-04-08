from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import AsyncIterator, Literal

from openai import AsyncOpenAI, OpenAI

from nakheel.config import Settings
from nakheel.exceptions import LLMError


@dataclass(slots=True)
class LLMResponse:
    content: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    model: str | None = None


@dataclass(slots=True)
class LLMStreamEvent:
    type: Literal["token", "done"]
    delta: str = ""
    response: LLMResponse | None = None


class LLMClient:
    """Thin wrapper around the OpenAI client with async-friendly entry points."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        timeout = settings.OPENAI_TIMEOUT_SECONDS
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY, timeout=timeout) if settings.OPENAI_API_KEY else None
        self.async_client = (
            AsyncOpenAI(api_key=settings.OPENAI_API_KEY, timeout=timeout)
            if settings.OPENAI_API_KEY
            else None
        )

    def is_available(self) -> bool:
        return self.async_client is not None

    @staticmethod
    def _fallback_response() -> LLMResponse:
        return LLMResponse(
            content="I don't have enough information about this in my knowledge base.",
            model="fallback",
        )

    def complete(self, messages: list[dict[str, str]]) -> LLMResponse:
        """Send a chat completion request synchronously."""

        if self.client is None:
            return self._fallback_response()
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

    async def complete_async(self, messages: list[dict[str, str]]) -> LLMResponse:
        """Send an async chat completion request."""

        if self.async_client is None:
            return self._fallback_response()
        try:
            response = await self.async_client.chat.completions.create(
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

    async def stream_async(self, messages: list[dict[str, str]]) -> AsyncIterator[LLMStreamEvent]:
        """Stream chat completion tokens and emit a final metadata payload."""

        if self.async_client is None:
            fallback = self._fallback_response()
            yield LLMStreamEvent(type="token", delta=fallback.content)
            yield LLMStreamEvent(type="done", response=fallback)
            return

        try:
            stream = await self.async_client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=messages,
                temperature=self.settings.OPENAI_TEMPERATURE,
                max_tokens=self.settings.OPENAI_MAX_TOKENS,
                stream=True,
                stream_options={"include_usage": True},
            )

            chunks: list[str] = []
            prompt_tokens: int | None = None
            completion_tokens: int | None = None
            model: str | None = None

            async for chunk in stream:
                model = getattr(chunk, "model", None) or model
                usage = getattr(chunk, "usage", None)
                if usage is not None:
                    prompt_tokens = getattr(usage, "prompt_tokens", prompt_tokens)
                    completion_tokens = getattr(usage, "completion_tokens", completion_tokens)

                if not chunk.choices:
                    continue

                delta = chunk.choices[0].delta.content or ""
                if not delta:
                    continue

                chunks.append(delta)
                yield LLMStreamEvent(type="token", delta=delta)

            yield LLMStreamEvent(
                type="done",
                response=LLMResponse(
                    content="".join(chunks),
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    model=model or self.settings.OPENAI_MODEL,
                ),
            )
        except Exception as exc:
            raise LLMError("Failed to generate response") from exc

    def startup_check(self) -> dict[str, str | bool]:
        """Verify that the configured model can answer a minimal probe request."""

        if self.client is None:
            return {"ok": True, "detail": "OPENAI_API_KEY is not configured; using fallback responses"}
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

    async def startup_check_async(self) -> dict[str, str | bool]:
        """Async wrapper for startup readiness validation."""

        if self.async_client is None:
            return {"ok": True, "detail": "OPENAI_API_KEY is not configured; using fallback responses"}
        try:
            response = await self.async_client.chat.completions.create(
                model=self.settings.OPENAI_MODEL,
                messages=[{"role": "user", "content": "Reply with OK"}],
                temperature=0,
                max_tokens=3,
            )
            content = (response.choices[0].message.content or "").strip()
            return {"ok": bool(content), "detail": f"LLM responded: {content}"}
        except Exception as exc:
            return {"ok": False, "detail": f"LLM startup check failed: {exc}"}

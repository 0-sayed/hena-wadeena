FROM python:3.12-slim AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.5.26 /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

COPY main.py ./
COPY nakheel/ nakheel/
COPY src/ src/

ENV PORT=8005
EXPOSE 8005

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
  CMD curl -sf http://localhost:8005/health || exit 1

RUN groupadd --gid 1001 appuser && \
    useradd --uid 1001 --gid appuser --shell /bin/sh --create-home appuser && \
    chown -R appuser:appuser /app
USER appuser

CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8005"]

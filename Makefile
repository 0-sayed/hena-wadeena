.PHONY: help setup infra infra-down dev web ai build test validate health logs seed clean

DC = docker compose -f docker-compose.yml -f docker-compose.dev.yml

help:
	@echo ""
	@echo "  setup       install deps + build shared packages"
	@echo "  infra       start postgres, redis, qdrant"
	@echo "  infra-down  stop infrastructure containers"
	@echo "  dev         run all NestJS services (hot-reload)"
	@echo "  web         run React frontend (hot-reload, :8080)"
	@echo "  ai          run Python AI service (hot-reload)"
	@echo "  build       build all packages + services"
	@echo "  test        run all tests"
	@echo "  validate    lint + typecheck + test + knip + audit + build"
	@echo "  health      ping all /health endpoints"
	@echo "  logs        tail infrastructure container logs"
	@echo "  seed        seed all service databases"
	@echo "  clean       stop containers, remove volumes + dist folders"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────
setup:
	pnpm install
	pnpm --filter @hena-wadeena/types build
	pnpm --filter @hena-wadeena/nest-common build

# ── Infrastructure ────────────────────────────────────────────────────────────
infra:
	$(DC) up -d postgres redis qdrant

infra-down:
	$(DC) down

logs:
	$(DC) logs -f postgres redis qdrant

# ── Development ───────────────────────────────────────────────────────────────
dev:
	pnpm dev

web:
	pnpm --filter @hena-wadeena/web dev

ai:
	cd services/ai && uv sync && uv run uvicorn src.main:app --reload --port 8005

# ── Build & Quality ───────────────────────────────────────────────────────────
build:
	pnpm build

test:
	pnpm test

validate:
	pnpm validate

# ── Health ────────────────────────────────────────────────────────────────────
health:
	@echo "── identity     " && curl -sf --max-time 5 http://localhost:8001/health && echo "OK" || echo "FAIL"
	@echo "── market       " && curl -sf --max-time 5 http://localhost:8002/health && echo "OK" || echo "FAIL"
	@echo "── guide-booking" && curl -sf --max-time 5 http://localhost:8003/health && echo "OK" || echo "FAIL"
	@echo "── map          " && curl -sf --max-time 5 http://localhost:8004/health && echo "OK" || echo "FAIL"
	@echo "── ai           " && curl -sf --max-time 5 http://localhost:8005/health && echo "OK" || echo "FAIL"

# ── Database ──────────────────────────────────────────────────────────────────
seed:
	pnpm --filter @hena-wadeena/identity run db:seed
	pnpm --filter @hena-wadeena/market run db:seed
	pnpm --filter @hena-wadeena/guide-booking run db:seed
	pnpm --filter @hena-wadeena/map run db:seed

# ── Cleanup ───────────────────────────────────────────────────────────────────
clean:
	$(DC) down -v
	find . -path ./node_modules -prune -o -name dist -type d -print | xargs rm -rf

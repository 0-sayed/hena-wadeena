# PR #81 — chore(docker): add compose profiles for local dev isolation

> Generated: 2026-03-31 | Branch: chore/docker-compose-profiles | Last updated: 2026-03-31 08:00

## Worth Fixing

- [x] `:?` mandatory vars on profiled mongodb service break `docker compose up` — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M538_GF -->
  > **docker-compose.yml:102**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-28e3c37198aa4d3d93fd1d4a42a86b3c_0001", "file_path": "docker-compose.yml", "start_line": 99, "end_line": 102, "side": "RIGHT"} -->
  >
  > 🟡 **Required env vars (`:?`) on profiled mongodb service defeat the profile isolation strategy**
  >
  > The PR adds `profiles: [ai]` to `mongodb` so it doesn't start during plain `docker compose up` for local dev. However, `mongodb` still uses `${MONGO_INITDB_ROOT_USERNAME:?…}` and `${MONGO_INITDB_ROOT_PASSWORD:?…}` (lines 101–102). Docker Compose evaluates variable substitution — including `:?` mandatory-variable checks — at file parse time for **all** services, before profile filtering. This means `docker compose up` (intended to start only postgres/redis/qdrant per the profile strategy comment on lines 26–27) will still fail with `"MONGO_INITDB_ROOT_USERNAME is not set"` if those vars are unset or empty, even though mongodb won't be started.
  >
  > The `.env.example` ships these vars as empty (`MONGO_INITDB_ROOT_USERNAME=`), so a developer who copies the template, fills in only infra-required vars (POSTGRES_PASSWORD, REDIS_PASSWORD), and runs `docker compose up` will hit this error — directly contradicting the stated profile strategy.

- [x] Bare `${VAR}` refs in healthcheck and MONGODB_URI cause credential mismatch with new defaults — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M53-CBM -->
  > **docker-compose.yml:102**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-9f52fcafe4e34ac9b85de8be45fa5c58_0001", "file_path": "docker-compose.yml", "start_line": 101, "end_line": 102, "side": "RIGHT"} -->
  >
  > 🔴 **MongoDB default credentials cause mismatch with ai service and healthcheck when env vars are unset**
  >
  > Changing `MONGO_INITDB_ROOT_USERNAME`/`MONGO_INITDB_ROOT_PASSWORD` from required (`:?`) to having defaults (`:-admin`/`:-changeme`) introduces a credential mismatch. Docker Compose interpolates **all** `${VAR}` references at parse time from host env / `.env` file. When these variables are unset:
  >
  > - **mongodb** container gets `admin`/`changeme` (from `:-` defaults on lines 101–102)
  > - **mongodb healthcheck** (`docker-compose.yml:109`) uses bare `${MONGO_INITDB_ROOT_USERNAME}` / `${MONGO_INITDB_ROOT_PASSWORD}` → resolves to empty → healthcheck fails → container stuck in `unhealthy` state
  > - **ai service** (`docker-compose.yml:207`) `MONGODB_URI` uses bare `${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}` → resolves to empty → `mongodb://:@mongodb:27017/…` → authentication failure
  >
  > Since `ai` depends on `mongodb: condition: service_healthy`, and the healthcheck itself fails due to the same empty-credential issue, the entire `ai` profile is broken when these env vars are unset.

## Not Worth Fixing

_None found._

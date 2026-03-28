# Code Review Issues

> **25 code-review issues** found across **67 files** (Cubic AI + Devin Review) · **3 CI/CD build failures** (ESLint + Vitest) · **102 ESLint warnings** across the monorepo.

---

## Table of Contents

- [Priority Legend](#priority-legend)
- [P1 — Critical Issues](#p1--critical-issues)
- [P2 — Major Issues](#p2--major-issues)
- [P3 — Minor Issues](#p3--minor-issues)
- [Devin Review Findings](#devin-review-findings)
- [CI/CD Pipeline Failures](#cicd-pipeline-failures)
  - [ESLint — Build-Breaking Errors](#eslint--build-breaking-errors)
  - [ESLint — Warnings (102 total)](#eslint--warnings-102-total)
  - [Vitest — Failed Test Suite](#vitest--failed-test-suite)

---

## Priority Legend

| Label | Meaning |
|-------|---------|
| 🔴 P1 | Critical — causes crashes, data loss, or security vulnerabilities |
| 🟡 P2 | Major — incorrect behavior, deprecated APIs, or reproducibility risk |
| 🟢 P3 | Minor — localization, style, or UX consistency |

---

## P1 — Critical Issues

---

### 1. `reranker.py` — `compute_score` returns a float for single-element input
**File:** `services/ai/nakheel/core/retrieval/reranker.py:83`

`compute_score` returns a bare `float` (not a `list`) when `pairs` contains a single element. The subsequent `zip(candidates, scores)` will raise `TypeError` because `float` is not iterable. Normalize `scores` to always be a list, as done in `startup_check`.

**Suggested fix:**
```python
scores = _run_quietly(self._model.compute_score, pairs, normalize=True)
# Add:
if not isinstance(scores, list):
    scores = [scores]
```

---

### 2. `chunker.py` — Overlap prefix duplicated when merging small chunks
**File:** `services/ai/nakheel/core/ingestion/chunker.py:67`

When a small chunk is merged back into the previous chunk, the overlap prefix (tail of the previous chunk's text) gets embedded as duplicate content in the merged result. Use `raw_piece` instead of `text` when merging back to avoid duplicating the overlap within the same chunk.

**Suggested fix:**
```python
# Before:
chunks[-1].text = f"{chunks[-1].text}\n\n{text}".strip()
# After:
chunks[-1].text = f"{chunks[-1].text}\n\n{raw_piece}".strip()
```

---

### 3. `session_manager.py` — User message appears twice in LLM context window
**File:** `services/ai/nakheel/core/session/session_manager.py:153`

`save_message` persists the raw user message to DB **before** `build_context_window` is called. The DB query includes the just-saved user message in `history_records`, and then `current_user_message` (the RAG-enhanced prompt) is appended again. The LLM receives both the raw question from history and the enhanced prompt as consecutive user turns.

**Fix options:**
- Exclude the just-saved user message from the history query (e.g., fetch only messages before the current one), or
- Don't append `current_user_message` here and let the caller handle it.

---

### 4. `docker-compose.yml` — MongoDB deployed without authentication
**File:** `docker-compose.yml:76`

MongoDB is deployed without authentication, unlike PostgreSQL and Redis which both require passwords. Set `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` to be consistent with the security posture of the other infrastructure services and prevent unauthenticated access from any container on the internal network.

---

### 5. `ChatWidget.tsx` — Infinite retry loop on bootstrap failure
**File:** `apps/web/src/components/ai/ChatWidget.tsx:93`

If `bootstrapSession()` fails, the `finally` block resets `bootstrapping` to `false`, which re-triggers this `useEffect` (since `bootstrapping` is a dependency and `sessionId` is still `undefined`). This creates an unbounded retry loop on any transient API failure.

**Fix:** Add an error state to break the cycle, or remove `bootstrapping` from the dependency array and call the bootstrap only on `open`/auth changes.

```tsx
const [bootstrapError, setBootstrapError] = useState(false);
// In the effect guard:
if (!open || !isAuthenticated || sessionId || bootstrapping || bootstrapError) return;
```

---

### 6. `ChatWidget.tsx` — User message lost during session retry
**File:** `apps/web/src/components/ai/ChatWidget.tsx:126`

When `sendToSession` fails with `403/404/410`, `bootstrapSession(true)` resets `messages` to only the welcome message, wiping the user's message that was already appended. After the retry succeeds, the conversation shows `[welcome, assistant_reply]` with no user message.

**Fix:** Save the user message before calling `bootstrapSession` and re-insert it after the new session is created, or refactor `bootstrapSession` to not call `setMessages` when invoked from the retry path.

---

### 7. `chat.py` — `per_page=0` causes `ZeroDivisionError`
**File:** `services/ai/nakheel/api/endpoints/chat.py:214`

`per_page=0` causes a `ZeroDivisionError` at `math.ceil(total / per_page)`. Add validation constraints on both `page` and `per_page`.

**Suggested fix:**
```python
page: int = Query(default=1, ge=1),
per_page: int = Query(default=20, ge=1, le=100),
```

---

### 8. `services/ai-service` — Git submodule missing `.gitmodules` entry
**File:** `services/ai-service:1`

This adds a git submodule at `services/ai-service` without a corresponding `.gitmodules` entry, so other developers cannot clone or initialize it. The submodule pattern also conflicts with the project's monorepo architecture — all services (`identity`, `market`, `guide-booking`, `map`, `ai`) are kept in-repo per the project conventions.

**Fix options:**
1. Add the chatbot code directly into the monorepo (e.g., within `services/ai/` or as a new `services/ai-service/` directory with source files committed directly), or
2. If a submodule is truly needed, add a proper `.gitmodules` file with the remote URL.

---

### 9. `documents.py` — Background task exceptions silently swallowed
**File:** `services/ai/nakheel/api/endpoints/documents.py:90`

When `process_document_batch` fails, the done callback only removes the task from the set — no logging or error handling occurs. Failed ingestion batches are silently lost.

**Suggested fix:**
```python
def _on_task_done(task: asyncio.Task) -> None:
    batch_tasks.discard(task)
    if not task.cancelled() and task.exception():
        logger.error("Document batch processing failed", exc_info=task.exception())

task.add_done_callback(_on_task_done)
```

---

### 10. `.github/workflows/codex.yml` — Mutable action tag is a supply-chain risk
**File:** `.github/workflows/codex.yml:15`

`openai/codex-action@v1` is a mutable tag. A compromised tag could exfiltrate the `OPENAI_API_KEY` secret. Pin to the full commit SHA of the current v1 release and add a version comment for maintainability.

```yaml
# Before:
uses: openai/codex-action@v1
# After (example):
uses: openai/codex-action@<full-commit-sha> # v1
```

---

### 11. `indexer.py` — `_mark_document_failed` swallows original exception (line 394)
**File:** `services/ai/nakheel/core/ingestion/indexer.py:394`

If MongoDB is unreachable when `_mark_document_failed` is called, the `IndexingError` with the `doc_id` context is never raised. The call should be wrapped in `try/except` to preserve the intended error.

---

### 12. `indexer.py` — Audit-log insert failure aborts already-indexed document (line 510)
**File:** `services/ai/nakheel/core/ingestion/indexer.py:510`

Audit-log insert failures should be handled separately so indexing does not return an error after the document has already been marked indexed.

---

### 13. `indexer.py` — `_mark_document_failed` swallows original exception (line 537)
**File:** `services/ai/nakheel/core/ingestion/indexer.py:537`

If `_mark_document_failed` throws (e.g., MongoDB is unreachable), the original indexing exception is swallowed and `raise` is never reached. The Qdrant rollback two lines above is already wrapped in `try/except` for exactly this reason — apply the same protection here.

```python
if not document_marked_indexed:
    try:
        await self._mark_document_failed(doc_id, self._error_detail(exc))
    except Exception:
        pass
raise
```

---

## P2 — Major Issues

---

### 14. `mongo.py` — `close()` doesn't reset client references to `None`
**File:** `services/ai/nakheel/db/mongo.py:27`

`close()` doesn't reset `self.client` and `self.db` to `None`. Subsequent calls to `collection()` or `ping()` will bypass the not-connected guard and fail with opaque connection errors instead of a clear "not connected" message.

**Suggested fix:**
```python
async def close(self) -> None:
    if self.client is not None:
        self.client.close()
        self.client = None
        self.db = None
```

---

### 15. `embedder.py` — Embeddings not sorted by index
**File:** `services/ai/nakheel/core/ingestion/embedder.py:30`

`response.data` should be sorted by `item.index` before extracting embeddings. The OpenAI embeddings API includes an `index` field on each result object to indicate the corresponding input position; iterating without sorting risks silently mismatching embeddings to text chunks.

**Suggested fix:**
```python
sorted_data = sorted(response.data, key=lambda item: item.index)
vectors.extend([list(item.embedding) for item in sorted_data])
```

---

### 16. `chunker.py` — Large section unconditionally merged into small buffer
**File:** `services/ai/nakheel/core/ingestion/chunker.py:101`

A large section that follows a small (buffered) section is unconditionally merged into the buffer, losing its own `title` and `parent_title`. The buffer should be flushed first when the incoming section is already large enough on its own.

---

### 17. `prompt_builder.py` — `datetime.utcnow()` is deprecated
**File:** `services/ai/nakheel/core/generation/prompt_builder.py:12`

`datetime.utcnow()` is deprecated since Python 3.12 and scheduled for removal. Use `datetime.now(timezone.utc)` instead, which returns a timezone-aware datetime.

**Suggested fix:**
```python
# Before:
today = datetime.utcnow().date().isoformat()
# After:
from datetime import datetime, timezone
today = datetime.now(timezone.utc).date().isoformat()
```

---

### 18. `api.py` — `closed_at` field not nullable
**File:** `services/ai/nakheel/models/api.py:79`

`closed_at` should be `datetime | None = None` since `closed: bool` implies the session might not be closed, in which case no `closed_at` timestamp exists.

**Suggested fix:**
```python
# Before:
closed_at: datetime
# After:
closed_at: datetime | None = None
```

---

### 19. `Dockerfile` — `--frozen` removed from `uv sync`
**File:** `services/ai/Dockerfile:11`

Removing `--frozen` from `uv sync` means the Docker build will silently regenerate the lockfile if `pyproject.toml` and `uv.lock` diverge, instead of failing fast. This undermines reproducible builds.

**Suggested fix:**
```dockerfile
# Before:
RUN uv sync --no-dev
# After:
RUN uv sync --frozen --no-dev
```

---

### 20. `chat.py` — `latency_ms` only captures retrieval time, not full pipeline
**File:** `services/ai/nakheel/api/endpoints/chat.py:97`

`latency_ms` is captured before the LLM generation step, so it only measures retrieval time for domain-relevant queries. Move the measurement to after the full pipeline completes (or compute it separately for each branch) so `latency_ms` accurately reflects end-to-end processing time.

---

### 21. `main.py` — `exc.extras` can silently overwrite RFC 7807 fields
**File:** `services/ai/nakheel/main.py:167`

`**exc.extras` is unpacked after the standard RFC 7807 fields, so any overlapping key in `extras` (e.g., `"status"`, `"detail"`) silently overwrites the canonical value. Unpack extras first so the standard fields always win, or filter out reserved keys.

**Suggested fix:**
```python
payload = {
    **exc.extras,  # extras first — standard fields below take precedence
    "type": f"https://httpstatuses.com/{exc.status_code}",
    "title": exc.title,
    "status": exc.status_code,
    "detail": exc.detail,
    "error": exc.error_code,
}
```

---

### 22. `documents.py` — `page` and `per_page` lack bounds validation
**File:** `services/ai/nakheel/api/endpoints/documents.py:204`

`page=0` produces a negative `skip`, crashing the query. Add FastAPI `Query` constraints.

**Suggested fix:**
```python
# Before:
page: int = 1,
per_page: int = 20,
# After:
page: int = Query(default=1, ge=1),
per_page: int = Query(default=20, ge=1, le=100),
```

---

### 23. `context_window.py` — O(n²) token counting in trim loop
**File:** `services/ai/nakheel/core/session/context_window.py:10`

Token count is recomputed for every remaining message on each loop iteration, making this O(n²) in `count_tokens` calls. Since `count_tokens` runs tiktoken encoding under the hood, this is expensive. Compute the total once and subtract incrementally.

**Suggested fix:**
```python
trimmed = messages[-max_messages:]
total_tokens = sum(count_tokens(item["content"]) for item in trimmed)
while trimmed and total_tokens > token_budget:
    total_tokens -= count_tokens(trimmed[0]["content"])
    trimmed = trimmed[1:]
return trimmed
```

---

### 24. `.env.example` — Docker service name used instead of `localhost`
**File:** `.env.example:34`

Using the Docker service name `mongodb` in `.env.example` won't resolve outside of Docker and breaks out-of-the-box local development. Use `localhost` to be consistent with the rest of the file.

**Suggested fix:**
```env
# Before:
MONGODB_URI=mongodb://mongodb:27017
# After:
MONGODB_URI=mongodb://localhost:27017
```

---

## P3 — Minor Issues

---

### 25. `session_manager.py` — Arabic welcome message not in Arabic script
**File:** `services/ai/nakheel/core/session/session_manager.py:160`

The Arabic welcome text is returned as transliterated Latin characters rather than Arabic script, which is inconsistent for Arabic-language users.

**Suggested fix:**
```python
if language_preference.startswith("ar"):
    return "أهلاً! أنا نخيل، مساعدك في أسئلة الوادي الجديد."
```

---

## Devin Review Findings

The following issues were flagged separately by Devin Review. Several overlap with the Cubic findings above; new ones are noted below.

---

### D1. 🔴 `reranker.py` — scalar `compute_score` causes `TypeError` in `zip()`
*(Same as Issue #1 above)*
`FlagReranker.compute_score` returns a scalar for a single pair. The `startup_check` method already handles this with `isinstance(score, list)`, confirming the dual return type — but `rerank()` does not guard against it.

---

### D2. 🔴 `chat.py` / `session_manager.py` — Duplicate user message in LLM prompt
*(Same as Issue #3 above)*
The user message is saved to MongoDB before `build_context_window` is called, which fetches all messages (including the just-saved one) and then appends the enriched prompt again, sending two consecutive user-role messages to the LLM.

---

### D3. 🔴 `ChatWidget.tsx` — Infinite API retry loop on bootstrap failure
*(Same as Issue #5 above)*
A failing `bootstrapSession()` resets `bootstrapping` to `false` without setting `sessionId`, causing the `useEffect` to re-trigger indefinitely. Can fire dozens of requests per second against an already-struggling server.

---

### D4. 🟡 `ChatWidget.tsx` — User message wiped during session recovery
*(Same as Issue #6 above)*
`bootstrapSession(true)` called from inside `sendMessage`'s retry block resets the `messages` state, losing the user's current message. The chat shows `welcome → assistant reply` with the user's question missing.

---

### D5. 🔴 `documents.py` — Document endpoints lack authentication
**File:** `services/ai/nakheel/api/endpoints/documents.py` (all endpoints)

All document management endpoints (`inject`, `parse`, `inject-text`, `delete`, `list`, `batches`) have no `get_current_user` dependency, unlike the chat endpoints which require JWT authentication. While the nginx gateway only routes `(chat|ai)/` paths externally, the AI service port is exposed directly in dev (`docker-compose.dev.yml:77`), making all document endpoints completely unauthenticated when accessed at `localhost:8005`. Any user with network access can inject, delete, or list documents.

**Fix:** Add `current_user: AuthenticatedUser = Depends(get_current_user)` to all document router endpoints.

---

---

## CI/CD Pipeline Failures

The following failures were produced by the GitHub Actions pipeline (`pnpm lint` and `pnpm test`). The web app lint step runs with `--max-warnings 0`, so any warning is treated as an error.

---

### ESLint — Build-Breaking Errors

These **2 errors + 1 warning** in `apps/web` caused the pipeline to exit with code 1.

| # | File | Line | Rule | Message |
|---|------|------|------|---------|
| E1 | `apps/web/src/components/ai/__tests__/ChatWidget.spec.tsx` | 15:18 | `@typescript-eslint/no-unsafe-return` | Unsafe return of a value of type `any` |
| E2 | `apps/web/src/components/ai/__tests__/ChatWidget.spec.tsx` | 64:81 | `@typescript-eslint/require-await` | Async arrow function has no `await` expression |
| W1 | `apps/web/src/components/ai/ChatWidget.tsx` | 93:6 | `react-hooks/exhaustive-deps` | `useEffect` has a missing dependency: `bootstrapSession` |

**E1 — Unsafe `any` return in test file**
The mock factory returns a value typed as `any`. Add an explicit return type or narrow the mock's return type.

**E2 — `async` function without `await`**
An async arrow function in the test file performs no async work. Remove the `async` keyword or add a real `await`.

**W1 — Missing `useEffect` dependency**
`bootstrapSession` is used inside the effect but omitted from the dependency array. This is also related to the infinite-retry-loop bug (Issue #5 above). Fixing that bug (adding an `bootstrapError` guard and removing `bootstrapping` from deps) should resolve this warning too.

---

### ESLint — Warnings (102 total)

These warnings do **not** fail the root lint step (no `--max-warnings 0` there), but they represent real type-safety gaps. Grouped by rule and service below.

#### `@typescript-eslint/no-unsafe-type-assertion` — 101 warnings

All warnings share the same root cause: a type assertion (`as SomeType`) where the asserted type is narrower than the actual inferred type. This typically happens when Drizzle ORM or raw DB query results are typed as `unknown`/`any` and cast directly to a domain type without validation.

**Recommended global fix:** Use [Zod](https://zod.dev/) `.parse()` or a type guard instead of bare `as` casts for any value coming from the database or external API.

| Service / Package | File(s) | # Warnings | Example assertion |
|---|---|---|---|
| `packages/nest-common` | `bootstrap.ts`, `redis-streams.service.ts` | 3 | `as any`, `as StreamEventHandler<...>`, `as [string, ...][]` |
| `packages/types` | `identity/notifications.ts` | 1 | import order (see below) |
| `services/guide-booking` | `app.module.ts`, `bookings.service.ts`, `guides.service.ts`, `reviews.service.ts`, `tour-packages.service.ts`, `query.ts` | 8 | `as StringValue`, `as "pending" \| "confirmed" \| ...`, `as { total: number }`, `as Partial<T>` |
| `services/identity` | `admin/dto/*.ts`, `auth/*.ts`, `kyc/*.ts`, `notifications/*.ts`, `users.service.ts` | 21 | `as [string, ...string[]]`, `as StringValue`, `as Record<string, string>`, `as "pending" \| ...`, `as never` |
| `services/map` | `app.module.ts`, `carpool.service.ts` | 2 | `as StringValue`, `as { code: string }` |
| `services/market` | `business-directory/*.ts`, `commodity-prices/*.ts`, `investment-applications/*.ts`, `investment-opportunities/*.ts`, `listings/*.ts`, `reviews.service.ts`, `search.service.ts`, `shared/test-helpers.ts` | 66 | `as PaginatedResponse<...>`, `as "real_estate" \| ...`, `as never`, `as UserRole`, `as Opportunity`, `as MockDbChain` |

**Patterns that appear most frequently:**

1. **`as [string, ...string[]]`** — Used in many DTO files to extract enum values for `@IsIn()` validators. Replace with a typed helper:
   ```typescript
   // Instead of:
   Object.values(MyEnum) as [string, ...string[]]
   // Use:
   Object.values(MyEnum) as unknown as [string, ...string[]]
   // Or better — create a typed helper:
   function enumValues<T extends Record<string, string>>(e: T): [T[keyof T], ...T[keyof T][]] {
     return Object.values(e) as [T[keyof T], ...T[keyof T][]];
   }
   ```

2. **`as StringValue`** — JWT expiry values cast from `string` config. Validate at config load time so the cast is safe.

3. **`as { total: number }`** — Raw Drizzle aggregate results. Type them with `.$dynamic()` or use `z.object({ total: z.number() }).parse(result)`.

4. **`as never`** — Likely exhaustiveness checks that broke when the union was extended. Review each `never` cast for correctness.

5. **`as PaginatedResponse<...>` / `as SearchResponse`** — Drizzle query results cast to paginated response shapes. Add a mapping/validation layer.

---

#### `import/order` — 1 warning

| File | Line | Message |
|------|------|---------|
| `packages/types/src/identity/notifications.ts` | 2:1 | `../dto/pagination` type import should occur before type import of `../enums` |

**Fix:** Reorder the imports so `../dto/pagination` comes before `../enums`.

```typescript
// Before:
import type { ... } from '../enums';
import type { ... } from '../dto/pagination';

// After:
import type { ... } from '../dto/pagination';
import type { ... } from '../enums';
```

---

### Vitest — Failed Test Suite

**1 test file failed** out of 7; **38/38 individual tests passed** in the files that ran.

**File:** `apps/web/src/components/ai/__tests__/ChatWidget.spec.tsx`

**Error:**
```
ReferenceError: Cannot access 'mockCreateSession' before initialization
  at ChatWidget.spec.tsx:32:22
```

**Root cause:** The test file uses `vi.mock(...)` with a factory function that references a `const mockCreateSession` variable declared in the module scope. Vitest hoists `vi.mock()` calls to the top of the file at compile time — before any `const`/`let` declarations are initialized — causing a Temporal Dead Zone (TDZ) error.

**Fix:** Use `vi.hoisted()` to declare mock variables so they are available when the hoisted `vi.mock` factory runs:

```typescript
// Before (broken):
const mockCreateSession = vi.fn();
vi.mock('@/services/api', () => ({
  aiAPI: { createSession: mockCreateSession },  // ❌ TDZ error
  ApiError: class ApiError extends Error {},
}));

// After (correct):
const { mockCreateSession } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  aiAPI: { createSession: mockCreateSession },  // ✅ safe
  ApiError: class ApiError extends Error {},
}));
```

This also resolves the `@typescript-eslint/no-unsafe-return` error (E1 above) if the mock factory is given a proper return type.

---

*Last updated: 2026-03-28*

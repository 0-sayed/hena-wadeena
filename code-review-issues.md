# New Unresolved Issues — Devin Review (2026-03-28)

> **3 new issues** discovered in the latest Devin Review pass.
> Previously flagged issues have been marked ✅ resolved in the PR comments and are **not** included here.

---

## Previously Resolved (for reference)

| Issue | Status |
|-------|--------|
| `reranker.py` — scalar `compute_score` crashes `zip()` | ✅ Fixed — `isinstance(scores, list)` guard added |
| `chat.py` — duplicate user message in LLM context | ✅ Fixed — `exclude_message_id` passed to `build_context_window` |
| `ChatWidget.tsx` — infinite bootstrap retry loop | ✅ Fixed — `bootstrapError` guard added to `useEffect` |
| `ChatWidget.tsx` — user message lost during session retry | ✅ Fixed — `bootstrapSession(true, { preserveMessages: true })` |
| `documents.py` — unauthenticated document endpoints | ✅ Fixed — `get_current_user` dependency added to all endpoints |

---

## New Unresolved Issues

---

### 1. 🔴 Nginx gateway has no route for `/api/v1/documents/` — endpoints dead in production

**File:** `gateway/nginx.conf.template:146`
**Related:** `services/ai/nakheel/api/router.py:10`

The PR registers a new `documents` router (prefix `/documents`) in the AI service, creating endpoints such as:
- `POST /api/v1/documents/inject`
- `POST /api/v1/documents/parse`
- `GET /api/v1/documents/{doc_id}`
- etc.

However, the nginx gateway only routes requests matching `^/api/v1/(chat|ai)/` to the AI service. The `documents` prefix is not included, so all document management requests hit the default `location /` block and return a bare `404`. **All document endpoints are effectively dead in any production deployment using the nginx gateway.**

**Suggested fix** — `gateway/nginx.conf.template:146`:
```nginx
# Before:
location ~ ^/api/v1/(chat|ai)/ {

# After:
location ~ ^/api/v1/(chat|ai|documents)/ {
```

---

### 2. 🟡 Audit log insert failure swallows the original delete error

**File:** `services/ai/nakheel/api/endpoints/documents.py:203–216`

In the `delete_document` exception handler, if MongoDB is unreachable when the `document_delete_failed` audit log is being persisted, `insert_one` raises its own exception. This prevents the original `raise` from ever executing, so the caller and any error-tracking tools receive a misleading MongoDB connection error instead of the actual partial-delete failure.

**Current (broken) code:**
```python
except Exception as exc:
    logger.exception("Partial delete failure for document {}", doc_id)
    await mongo.collection("audit_logs").insert_one({
        "event": "document_delete_failed",
        ...
        "error": str(exc),
    })
    raise  # ❌ never reached if insert_one fails
```

**Suggested fix:**
```python
except Exception as exc:
    logger.exception("Partial delete failure for document {}", doc_id)
    try:
        await mongo.collection("audit_logs").insert_one({
            "event": "document_delete_failed",
            "doc_id": doc_id,
            "created_at": deleted_at,
            "partial_failure": True,
            "qdrant_ids": qdrant_ids,
            "qdrant_deleted": qdrant_deleted,
            "error": str(exc),
        })
    except Exception:
        pass  # audit log failure must not suppress the original error
    raise  # ✅ always reached
```

---

### 3. 🟡 Session restore shows the oldest 20 messages instead of the most recent

**File:** `apps/web/src/components/ai/ChatWidget.tsx:80`

When `ChatWidget` restores a session from `localStorage`, it calls `aiAPI.getSession(savedSessionId)` with default pagination (`page=1, perPage=20`). The backend sorts messages by `created_at` ascending and returns the **first** page — the oldest 20 messages. For any session with more than 20 messages (10+ back-and-forth exchanges, which is realistic given the 168-hour `SESSION_TTL_HOURS`), the user sees the beginning of their conversation but the most recent exchanges are missing.

**Fix options (pick one):**

**Option A — Simple:** Fetch a large batch to cover most sessions:
```typescript
const session = await aiAPI.getSession(savedSessionId, 1, 200);
```

**Option B — Correct pagination:** Use the pagination metadata to fetch the last page:
```typescript
const first = await aiAPI.getSession(savedSessionId, 1, 20);
const totalPages = first.pagination.total_pages;
const session = totalPages > 1
  ? await aiAPI.getSession(savedSessionId, totalPages, 20)
  : first;
```
> Note: with this approach, messages on the last page should be reversed for display if the sort order is ascending.

**Option C — Backend change:** Add a `latest` mode to `session_manager.get_messages` that sorts descending and returns the most recent messages, then reverses them before returning to the client.

---

*Last updated: 2026-03-28*

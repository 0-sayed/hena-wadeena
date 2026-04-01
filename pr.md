# PR #83 — fix: attraction map, KYC viewer, and seed data

> Generated: 2026-04-01 | Branch: fix/attraction-map-kyc-viewer-and-seeds | Last updated: 2026-04-01 09:45

## Worth Fixing

- [x] Add sandbox attribute to iframe for security — @codoki-pr-intelligence, @gemini-code-assist, @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54JM68 --> <!-- thread:PRRT_kwDORjaF4M54JNGN --> <!-- thread:PRRT_kwDORjaF4M54JUs8 -->
  > **apps/web/src/components/admin/DocumentViewerDialog.tsx:77**
  >
  > <!-- CODOKI_INLINE -->
  > :warning: **High**: Security: The iframe embeds an untrusted URL without sandboxing, which allows a malicious page (e.g., served as text/html with a .pdf suffix) to navigate the top window or run scripts. Also, file-type checks above will fail for URLs with query strings (e.g., file.pdf?sig=123) causing incorrect rendering paths. Add sandbox/referrerPolicy to the iframe to prevent top-level navigation, and normalize the URL when computing isPdf/isImage (strip query/fragment) so legitimate files preview correctly.
  >
  > ```suggestion
  >               src={documentUrl} sandbox="allow-same-origin" referrerPolicy="no-referrer"
  > ```

  > **apps/web/src/components/admin/DocumentViewerDialog.tsx:80**
  >
  > ![security-high](https://www.gstatic.com/codereviewagent/security-high-priority.svg) ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > When embedding documents in an "iframe", especially user-uploaded content, it is a security best practice to use the "sandbox" attribute. This prevents the document from executing scripts or accessing cookies/storage on your domain, which is critical if a malicious user uploads an HTML file disguised as a PDF. Note that some browser PDF viewers might require "allow-scripts" to function correctly, so test accordingly.
  >
  > ```
  >             <iframe
  >               src={documentUrl}
  >               className="w-full h-full min-h-[500px] rounded border"
  >               title="Document preview"
  >               sandbox="allow-scripts allow-same-origin"
  >             />
  > ```

  > **apps/web/src/components/admin/DocumentViewerDialog.tsx:76**
  >
  > <!-- metadata:{"confidence":8} -->
  > P1: Add `sandbox` attribute to the iframe to prevent script execution in user-uploaded content. Since this renders KYC documents submitted by users in an admin moderation view, a crafted document URL could execute scripts. Use `sandbox="allow-same-origin"` to allow PDF rendering while blocking script execution.

- [x] Strip query string before checking file extension — @codoki-pr-intelligence, @gemini-code-assist, @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54JM68 --> <!-- thread:PRRT_kwDORjaF4M54JNGU --> <!-- thread:PRRT_kwDORjaF4M54JUtA -->
  > **apps/web/src/components/admin/DocumentViewerDialog.tsx:34**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The current method of checking file extensions using "endsWith" and a simple regex on the full URL is fragile. If the "documentUrl" contains query parameters (e.g., from an S3 signed URL or a CDN with cache-busting tokens), these checks will fail. It's better to strip the query string before checking the extension.
  >
  > ```suggestion
  >   const urlPath = documentUrl.split('?')[0];
  >   const isPdf = urlPath.toLowerCase().endsWith('.pdf');
  >   const isImage = /\\.(jpg|jpeg|png|gif|webp)$/i.test(urlPath);
  > ```

  > **apps/web/src/components/admin/DocumentViewerDialog.tsx:33**
  >
  > <!-- metadata:{"confidence":9} -->
  > P2: File extension detection will fail when `documentUrl` contains query parameters (e.g., S3 signed URLs or CDN cache-busting tokens). Strip the query string before checking the extension.

- [x] Count query should mirror innerJoin from data query — @gemini-code-assist, @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M54JNGk --> <!-- thread:PRRT_kwDORjaF4M54JPDE -->
  > **services/identity/src/kyc/kyc.service.ts:82**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The count query should mirror the joins and filters of the main data query to ensure consistency in the pagination metadata. While the foreign key constraint with "onDelete: 'cascade'" mitigates some risks, an "innerJoin" in the main query acts as a filter. If a user record is missing or filtered out (e.g., due to soft deletes if implemented later), the count will be inaccurate compared to the actual results returned.
  >
  > ```suggestion
  >       this.db.select({ count: count() }).from(userKyc).innerJoin(users, eq(userKyc.userId, users.id)).where(whereClause),
  > ```

  > **services/identity/src/kyc/kyc.service.ts:82**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-fb23fef56fac42888fedc8e4c04b37eb_0002", "file_path": "services/identity/src/kyc/kyc.service.ts", "start_line": 82, "end_line": 82, "side": "RIGHT"} -->
  >
  > :yellow_circle: **Count query in findPending diverges from data query after innerJoin was added**
  >
  > The data query in `findPending` now uses `innerJoin(users, ...)` (line 77), but the parallel count query at line 82 still counts from `userKyc` alone without the join. While the FK cascade on `user_kyc.user_id` prevents orphaned records today, these two queries are no longer semantically equivalent. If filtering on `users` columns is later added (e.g., excluding soft-deleted users via `users.deletedAt IS NULL`), the count will silently diverge from the data result, producing incorrect pagination metadata.
  >
  > ```suggestion
  >       this.db.select({ count: count() }).from(userKyc).innerJoin(users, eq(userKyc.userId, users.id)).where(whereClause),
  > ```

- [x] Reset zoom state when documentUrl changes — @devin-ai-integration, @coderabbitai <!-- thread:PRRT_kwDORjaF4M54JPCG --> <!-- thread:PRRT_kwDORjaF4M54JVdL -->
  > **apps/web/src/components/admin/DocumentViewerDialog.tsx:29**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-fb23fef56fac42888fedc8e4c04b37eb_0001", "file_path": "apps/web/src/components/admin/DocumentViewerDialog.tsx", "start_line": 29, "end_line": 29, "side": "RIGHT"} -->
  >
  > :yellow_circle: **Zoom state persists across different document views**
  >
  > The `zoom` state in `DocumentViewerDialog` is initialized once via `useState(1)` and never reset when a new document is opened. The component instance persists in the React tree (it's always rendered at `AdminModeration.tsx:365`), so when the dialog is closed (`viewDocument` set to `null`), the early `return null` at line 31 prevents rendering but does not unmount the component—React preserves hook state. When a different document is opened, the stale zoom level from the previous document is used (e.g., user zooms to 200% on doc A, closes, then opens doc B—doc B shows at 200%).
  >
  > <details>
  > <summary>Prompt for agents</summary>
  >
  > ```
  > In apps/web/src/components/admin/DocumentViewerDialog.tsx, add a useEffect that resets the zoom state to 1 whenever the documentUrl changes. For example, add after line 29:
  >
  > useEffect(() => { setZoom(1); }, [documentUrl]);
  >
  > This ensures each new document opens at 100% zoom regardless of what the previous document was zoomed to. Alternatively, you could reset zoom when the open prop transitions to true.
  > ```
  >
  > </details>

  > **apps/web/src/components/admin/DocumentViewerDialog.tsx:31**
  >
  > _:warning: Potential issue_ | _:yellow_circle: Minor_
  >
  > **Zoom state persists across documents.**
  >
  > When switching between documents, `zoom` state isn't reset. If a user zooms in on one image then views another, the new image will also be zoomed. Consider resetting zoom when `documentUrl` changes.
  >
  >
  > <details>
  > <summary>Proposed fix</summary>
  >
  > ```diff
  > +import { useState, useEffect } from 'react';
  > -import { useState } from 'react';
  > ...
  > export function DocumentViewerDialog({
  >   open,
  >   onOpenChange,
  >   documentUrl,
  >   documentType,
  >   userName,
  > }: DocumentViewerDialogProps) {
  >   const [zoom, setZoom] = useState(1);
  >
  > +  useEffect(() => {
  > +    setZoom(1);
  > +  }, [documentUrl]);
  >
  >   if (!documentUrl) return null;
  > ```
  > </details>

- [x] Early return bypasses Dialog onOpenChange binding — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54JUs- -->
  > **apps/web/src/components/admin/DocumentViewerDialog.tsx:31**
  >
  > <!-- metadata:{"confidence":7} -->
  > P2: Early `return null` when `documentUrl` is null bypasses the `<Dialog>` entirely, so `onOpenChange` is never wired up. If the parent's `open` is `true` while `documentUrl` is momentarily null (race condition, stale state), the dialog silently unmounts without resetting the parent's open state. Move the null guard inside the dialog content instead.

## Not Worth Fixing

- [x] ~~Use DROP INDEX CONCURRENTLY for migration — @codoki-pr-intelligence~~ <!-- thread:PRRT_kwDORjaF4M54JOHu -->
  - _Reason: This is a generated Drizzle migration file. Project rules (CLAUDE.md) explicitly forbid manually editing generated migrations — fix forward with new migrations instead. For local dev, non-concurrent drops are fine._
  > **services/identity/drizzle/20260401040844_late_phalanx.sql:1**
  >
  > <!-- CODOKI_INLINE -->
  > :warning: **High**: Dropping and recreating this GIN index without CONCURRENTLY can block writes to identity.users during the migration, causing downtime under load. Use CONCURRENTLY for both DROP and CREATE to avoid long-lived locks; note these must run outside a transaction (your statement-breakpoints help split statements). Also update the CREATE INDEX below accordingly.
  >
  > ```suggestion
  > DROP INDEX CONCURRENTLY "identity"."idx_users_full_name_trgm";--> statement-breakpoint
  > ```

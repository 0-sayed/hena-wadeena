# PR #84 — docs: comprehensive documentation update with Makefile shortcuts

> Generated: 2026-04-01 | Branch: chore/update-docs | Last updated: 2026-04-01 14:27

## Worth Fixing

- [ ] LLM/Embeddings tech stack mismatch between root and AI service docs — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M54Lko1 -->
  > **README.md:24**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > There is a significant discrepancy between the root `README.md` and the AI service documentation. The root README lists Gemini for LLM and Embeddings, while `services/ai/README.md` (lines 33-34 and 85-87) specifies OpenAI (`gpt-4o-mini` and `text-embedding-3-small`). Please update the root README to reflect the actual tech stack used in the implementation.
  >
  > ```suggestion
  > | LLM / Embeddings     | OpenAI gpt-4o-mini / text-embedding-3-small |
  > ```

- [ ] API Gateway docs inconsistency: Nginx + Caddy vs Nginx only — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M54LkpD --> <!-- thread:PRRT_kwDORjaF4M54LkpL -->
  > **README.md:30**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The root `README.md` mentions "Nginx + Caddy" for the API Gateway, but the dedicated `gateway/README.md` only describes an Nginx-based gateway (line 18). If Caddy is part of the architecture, its role should be documented in the gateway README; otherwise, it should be removed from the root README to avoid confusion.
  >
  > ```suggestion
  > | API Gateway          | Nginx                                        |
  > ```

  > **README.md:159**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > This line mentions Caddy in the project structure description, which contradicts the `gateway/README.md` documentation that only specifies Nginx. Please ensure the project structure description matches the actual gateway implementation.
  >
  > ```suggestion
  > ├── gateway/               # Nginx config                                 :8000
  > ```

- [ ] AI service entry point should use nakheel.main:app not src.main:app — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M54LkpG -->
  > **README.md:92**
  >
  > ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > The manual command for running the AI service uses `src.main:app`, but `services/ai/README.md` identifies `nakheel.main:app` as the primary entry point (line 149) and refers to `src/main.py` only as a compatibility entrypoint (line 210). It is recommended to use the primary entry point for consistency.
  >
  > ```suggestion
  > cd services/ai && uv sync && uv run uvicorn nakheel.main:app --reload --port 8005
  > ```

- [ ] pnpm version requirement mismatch: should be 9+ not 10+ — @devin-ai-integration, @coderabbitai <!-- thread:PRRT_kwDORjaF4M54Ll8O --> <!-- thread:PRRT_kwDORjaF4M54LnuZ -->
  > **services/market/README.md:85**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-44052c8c4d5e4032b3804dbc1b849a32_0001", "file_path": "services/market/README.md", "start_line": 85, "end_line": 85, "side": "RIGHT"} -->
  >
  > 🟡 **Market README specifies wrong pnpm version requirement (10+ instead of 9+)**
  >
  > The Market service README states `pnpm 10+` as a prerequisite, but the project actually uses pnpm 9.x. The root `package.json` declares `"packageManager": "pnpm@9.15.0"` and `"pnpm": ">=9.0.0"`. The root `README.md:39` and all other service READMEs (`services/identity/README.md:105`, `services/guide-booking/README.md:68`, `services/map/README.md:60`) consistently say `pnpm 9+`. This incorrect version requirement could block new contributors who have pnpm 9 installed.
  >
  > ```suggestion
  > - pnpm 9+
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/84" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

  > **services/market/README.md:85**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Prerequisite version conflicts with root docs.**
  >
  > Line 85 requires `pnpm 10+`, while the root README states `pnpm 9+`. Align these to a single minimum supported version to avoid onboarding errors.
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@services/market/README.md` at line 85, The prerequisite version in
  > services/market/README.md currently states "pnpm 10+" which conflicts with the
  > root README's "pnpm 9+"; update the services/market README to use the same
  > minimum pnpm version as the root (choose and document a single minimum, e.g.,
  > change the "pnpm 10+" string to "pnpm 9+" or update the root README to "pnpm
  > 10+"), and ensure both README files contain the identical phrase so onboarding
  > docs are consistent.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:triton:hawk:c70f4359-e6e3-4948-a6bf-526e78d6d32a -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [ ] Identity README missing 4 user roles from enum — @devin-ai-integration <!-- thread:PRRT_kwDORjaF4M54Ll9q -->
  > **services/identity/README.md:320**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-44052c8c4d5e4032b3804dbc1b849a32_0002", "file_path": "services/identity/README.md", "start_line": 320, "end_line": 320, "side": "RIGHT"} -->
  >
  > 🟡 **Identity README documents only 6 of 10 user roles in the `user_role` enum**
  >
  > The Identity README lists the `user_role` enum as having only 6 values: `admin`, `tourist`, `investor`, `merchant`, `guide`, `student`. However, the actual `UserRole` enum in `packages/types/src/enums/index.ts:1-12` defines 10 roles including `resident`, `driver`, `moderator`, and `reviewer` which are all missing from the documentation. This could mislead developers about the supported roles in the system.
  >
  > ```suggestion
  > - **`user_role`**: `admin`, `tourist`, `resident`, `investor`, `merchant`, `guide`, `student`, `driver`, `moderator`, `reviewer`
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/84" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

- [ ] PaginatedResponse examples use nested meta object instead of flat structure — @coderabbitai <!-- thread:PRRT_kwDORjaF4M54LnuH -->
  > **packages/types/README.md:65**
  >
  > _⚠️ Potential issue_ | _🟠 Major_
  >
  > **Several TypeScript examples don't match current exported types.**
  >
  > Line 57 and Line 213 use `PaginatedResponse` with `meta`, but the actual interface is flat (`total/page/limit/hasMore`).  
  > Also, imports on Line 73, Line 93, and Line 123 reference symbols that are not currently exported, so copy-paste examples will fail type-check.
  >
  >
  >
  >
  > Also applies to: 73-74, 93-94, 123-126, 213-216
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@packages/types/README.md` around lines 57 - 65, The README examples use
  > PaginatedResponse with a nested meta object but the actual exported
  > PaginatedResponse interface is flat (properties total, page, limit, hasMore);
  > update every example (e.g., the snippet using PaginatedResponse<User>) to remove
  > the meta wrapper and place total/page/limit/hasMore at the top level to match
  > the interface. Also audit the example import statements that the reviewer called
  > out and either change them to the actual exported symbol names or re-export the
  > missing symbols from the package so copy-paste examples type-check; search for
  > usages of PaginatedResponse and the problematic import symbols in the README and
  > make the imports and shape consistent with the current package exports.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:triton:hawk:c70f4359-e6e3-4948-a6bf-526e78d6d32a -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [ ] Guide-booking setup docs mention Qdrant but command doesn't include it — @coderabbitai, @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54LnuU --> <!-- thread:PRRT_kwDORjaF4M54L2wK -->
  > **services/guide-booking/README.md:91**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Setup instruction and command are inconsistent.**
  >
  > Line 90 says Qdrant is started, but Line 91 starts only `postgres redis`. Please either include `qdrant` in the command or remove it from the description.
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ```
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@services/guide-booking/README.md` around lines 90 - 91, The README heading "#
  > Start PostgreSQL, Redis, and Qdrant" and the following docker-compose command
  > are inconsistent: the command currently only brings up postgres and redis.
  > Update the command or the heading so they match; e.g., add "qdrant" to the
  > docker compose invocation (change "up -d postgres redis" to "up -d postgres
  > redis qdrant") or remove "and Qdrant" from the heading; locate this text in
  > services/guide-booking/README.md by the header string and the docker compose
  > line to apply the fix.
  > ```
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:triton:hawk:c70f4359-e6e3-4948-a6bf-526e78d6d32a -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

  > **services/guide-booking/README.md:90**
  >
  > <!-- metadata:{"confidence":9} -->
  > P3: The comment mentions Qdrant but the command doesn't start it. Either remove "and Qdrant" from the comment or add `qdrant` to the command. Since this service doesn't use Qdrant (only the AI service does), dropping it from the comment is likely correct.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At services/guide-booking/README.md, line 90:
  >
  > <comment>The comment mentions Qdrant but the command doesn't start it. Either remove "and Qdrant" from the comment or add `qdrant` to the command. Since this service doesn't use Qdrant (only the AI service does), dropping it from the comment is likely correct.</comment>
  >
  > <file context>
  > @@ -0,0 +1,505 @@
  > +### 2. Start Infrastructure
  > +
  > +```bash
  > +# Start PostgreSQL, Redis, and Qdrant
  > +docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis
  > +```
  > </file context>
  > ```
  >
  > </details>

- [ ] Bug in PaginatedResponse hasMore calculation example — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54L2wH -->
  > **packages/types/README.md:213**
  >
  > <!-- metadata:{"confidence":9} -->
  > P2: Bug in code example: `hasMore: offset + limit < total` compares a number to an array (the query result). Should be `offset + limit < total[0].count`.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At packages/types/README.md, line 213:
  >
  > <comment>Bug in code example: `hasMore: offset + limit < total` compares a number to an array (the query result). Should be `offset + limit < total[0].count`.</comment>
  >
  > <file context>
  > @@ -0,0 +1,290 @@
  > +    const users = await this.db.select().from(usersTable).limit(limit).offset(offset);
  > +    const total = await this.db.select({ count: count() }).from(usersTable);
  > +    
  > +    return {
  > +      data: users,
  > +      meta: { total: total[0].count, offset, limit, hasMore: offset + limit < total },
  > </file context>
  > ```
  >
  > </details>

- [ ] Duplicate "guides" in identity README search description — @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54L2wN -->
  > **services/identity/README.md:55**
  >
  > <!-- metadata:{"confidence":9} -->
  > P3: Duplicate item: `guides` is listed twice in the search description. The second `guides` should likely be a different entity.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At services/identity/README.md, line 55:
  >
  > <comment>Duplicate item: `guides` is listed twice in the search description. The second `guides` should likely be a different entity.</comment>
  >
  > <file context>
  > @@ -0,0 +1,548 @@
  > +- Review KYC submissions
  > +
  > +### Search (`/search`)
  > +- Unified cross-service search (markets, guides, attractions, guides)
  > +- Arabic text normalization
  > +- Fuzzy matching with pg_trgm
  > </file context>
  > ```
  >
  > </details>

## Not Worth Fixing

- [ ] ~~Missing markdown language tag in nest-common README — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54LnuC -->
  - _Reason: Project has no markdownlint config and doesn't enforce MD040 rule in CI. This is a style suggestion the project hasn't opted into._
  > **packages/nest-common/README.md:19**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Add a language tag to the fenced block to satisfy markdown lint.**
  >
  > Line 19 uses a fence without a language, which triggers `MD040`.
  >
  > <details>
  > <summary>Suggested patch</summary>
  >
  > ```diff
  > -```
  > +```text
  > [ ] **ID** Task Name · Size · ← deps ·
  >                         S/M/L   task IDs
  > ```
  > ```
  > </details>
  >
  >   
  > As per coding guidelines `**/*.{js,ts,tsx,json,md,css}: Use Prettier for formatting`.
  >
  > <details>
  > <summary>🧰 Tools</summary>
  >
  > <details>
  > <summary>🪛 markdownlint-cli2 (0.22.0)</summary>
  >
  > [warning] 19-19: Fenced code blocks should have a language specified
  >
  > (MD040, fenced-code-language)
  >
  > </details>
  >
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ````
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@packages/nest-common/README.md` at line 19, The fenced code block that
  > currently starts with ``` is missing a language tag which triggers MD040; update
  > the fenced block (the block containing "[ ] **ID** Task Name · Size · ← deps ·
  > ...") to use a language tag such as ```text so the fence becomes ```text and
  > satisfies markdown lint/Prettier rules, ensuring the example block is properly
  > annotated.
  > ````
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:triton:hawk:c70f4359-e6e3-4948-a6bf-526e78d6d32a -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [ ] ~~Missing markdown language tags in types README — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54LnuN -->
  - _Reason: Project has no markdownlint config and doesn't enforce MD040 rule in CI._
  > **packages/types/README.md:137**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Add language tags to these fenced blocks (`MD040`).**
  >
  > Line 137 and Line 236 use unlabeled fenced code blocks, which can fail markdown lint.
  >
  >   
  > As per coding guidelines `**/*.{js,ts,tsx,json,md,css}: Use Prettier for formatting`.
  >
  >
  > Also applies to: 236-236
  >
  > <details>
  > <summary>🧰 Tools</summary>
  >
  > <details>
  > <summary>🪛 markdownlint-cli2 (0.22.0)</summary>
  >
  > [warning] 137-137: Fenced code blocks should have a language specified
  >
  > (MD040, fenced-code-language)
  >
  > </details>
  >
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ````
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@packages/types/README.md` at line 137, Two fenced code blocks are unlabeled
  > (just ```), causing MD040 markdown-lint failures; update each unlabeled fenced
  > block to include the appropriate language tag (e.g., ```js, ```ts, ```json, or
  > ```md as appropriate for the block contents) so the linter recognizes the
  > language and Prettier can format them—locate the backtick-only fences (the
  > triple-backtick tokens) and replace them with language-tagged fences matching
  > the snippet content.
  > ````
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:triton:hawk:c70f4359-e6e3-4948-a6bf-526e78d6d32a -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [ ] ~~Missing markdown language tags in root README — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54LnuR -->
  - _Reason: Project has no markdownlint config and doesn't enforce MD040 rule in CI._
  > **README.md:123**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Fix unlabeled code fences to avoid markdownlint failures.**
  >
  > Line 123 and Line 147 start fenced blocks without language identifiers (`MD040`).
  >
  >   
  > As per coding guidelines `**/*.{js,ts,tsx,json,md,css}: Use Prettier for formatting`.
  >
  >
  > Also applies to: 147-147
  >
  > <details>
  > <summary>🧰 Tools</summary>
  >
  > <details>
  > <summary>🪛 markdownlint-cli2 (0.22.0)</summary>
  >
  > [warning] 123-123: Fenced code blocks should have a language specified
  >
  > (MD040, fenced-code-language)
  >
  > </details>
  >
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ````
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@README.md` at line 123, Two fenced code blocks in README.md are missing
  > language identifiers (causing markdownlint MD040); locate the code fence
  > openings that correspond to the closing fences near the shown diff (around the
  > blocks that end at the current closing ```), and add appropriate language tags
  > (e.g., ```json, ```js, ```bash, etc.) to the opening fences so each fenced block
  > is labeled; ensure both occurrences (the block ending at the shown closing fence
  > and the similar block at the other reported location) are updated to remove the
  > MD040 lint errors.
  > ````
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:triton:hawk:c70f4359-e6e3-4948-a6bf-526e78d6d32a -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

- [ ] ~~Missing markdown language tags in guide-booking README — @coderabbitai~~ <!-- thread:PRRT_kwDORjaF4M54LnuY -->
  - _Reason: Project has no markdownlint config and doesn't enforce MD040 rule in CI._
  > **services/guide-booking/README.md:159**
  >
  > _⚠️ Potential issue_ | _🟡 Minor_
  >
  > **Label fenced code blocks to satisfy markdownlint (`MD040`).**
  >
  > These fences are missing language identifiers and may fail docs linting.
  >
  >   
  > As per coding guidelines `**/*.{js,ts,tsx,json,md,css}: Use Prettier for formatting`.
  >
  >
  > Also applies to: 221-221, 235-235, 245-245, 256-256
  >
  > <details>
  > <summary>🧰 Tools</summary>
  >
  > <details>
  > <summary>🪛 markdownlint-cli2 (0.22.0)</summary>
  >
  > [warning] 159-159: Fenced code blocks should have a language specified
  >
  > (MD040, fenced-code-language)
  >
  > </details>
  >
  > </details>
  >
  > <details>
  > <summary>🤖 Prompt for AI Agents</summary>
  >
  > ````
  > Verify each finding against the current code and only fix it if needed.
  >
  > In `@services/guide-booking/README.md` at line 159, Several fenced code blocks in
  > README.md (for example the block containing the repository tree line "└── *.sql 
  > # Migration files" and the other blocks flagged in the comment) are missing
  > language identifiers, which triggers markdownlint MD040; update each fenced
  > block by adding an appropriate language tag (e.g., "text" for directory tree
  > snippets, "sql" for SQL examples, "bash" for shell commands) to the opening ```
  > fence so the linter recognizes the block type and formatting remains consistent.
  > ````
  >
  > </details>
  >
  > <!-- fingerprinting:phantom:triton:hawk:c70f4359-e6e3-4948-a6bf-526e78d6d32a -->
  >
  > <!-- This is an auto-generated comment by CodeRabbit -->

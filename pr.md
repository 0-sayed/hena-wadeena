# PR #89 — feat: migrate frontend to contabo

> Generated: 2026-04-02 | Branch: feat/frontend-contabo-migration-v2 | Last updated: 2026-04-02 02:00

## Worth Fixing

- [x] StrictHostKeyChecking=no disables MITM protection during deploy — @codoki-pr-intelligence, @augmentcode, @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54YuVu --> <!-- thread:PRRT_kwDORjaF4M54YukZ --> <!-- thread:PRRT_kwDORjaF4M54Yxer -->
  > **.github/workflows/deploy-frontend.yml:82**
  >
  > <!-- CODOKI_INLINE -->
  > 🛑 **Critical**: StrictHostKeyChecking=no disables host verification and enables MITM during deploy; combined with root SSH and a hardcoded public IP, this is a high-risk path for server compromise. Use a pinned host key (checked into a secure secret/var) and a non-root deploy user with limited permissions. Also externalize the host and user into GitHub vars or environments to avoid hardcoding infra details.

  > **.github/workflows/deploy-frontend.yml:82**
  >
  > `.github/workflows/deploy-frontend.yml:82` Using `-o StrictHostKeyChecking=no` disables host key verification (MITM protection) and makes the prior `ssh-keyscan` step ineffective for security.
  >
  > **Severity: high**
  >
  >
  >
  > <details open>
  > <summary>Other Locations</summary>
  >
  > - `.github/workflows/deploy-frontend.yml:87`
  > </details>
  >
  > [![Fix This in Augment](https://public.augment-assets.com/code-review/fix-in-augment.svg "Fix This in Augment")](https://app.augmentcode.com/open-chat?mode=agent&prompt=%23%23%20Review%20Comment%20Fix%20Request%0A%0APlease%20help%20me%20address%20this%20specific%20review%20comment%20from%20PR%3A%20https%3A%2F%2Fgithub.com%2F0-sayed%2Fhena-wadeena%2Fpull%2F89%0A%0A%23%23%23%20Review%20Comment%20Details%3A%0A-%20%2A%2AFile%20Location%2A%2A%3A%20.github%2Fworkflows%2Fdeploy-frontend.yml%0A-%20%2A%2ALocation%2A%2A%3A%20Line%2082%0A-%20%2A%2AComment%2A%2A%3A%20%22%60.github%2Fworkflows%2Fdeploy-frontend.yml%3A82%60%20Using%20%60-o%20StrictHostKeyChecking%3Dno%60%20disables%20host%20key%20verification%20%28MITM%20protection%29%20and%20makes%20the%20prior%20%60ssh-keyscan%60%20step%20ineffective%20for%20security.%22%0A%0A%23%23%23%20Steps%20to%20Follow%3A%0A%0A1.%20%2A%2ADetermine%20Github%20Branch%2A%2A%3A%20Use%20%60git%20branch%20--show-current%60%20to%20get%20the%20current%20branch%2C%20then%20fetch%20PR%20details%20from%20the%20Github%20API%20to%20determine%20the%20correct%20branch%20for%20this%20PR%0A2.%20%2A%2ABranch%20Verification%2A%2A%3A%20Ask%20the%20user%20to%20switch%20branches%20if%20they%20are%20not%20on%20the%20correct%20branch%0A3.%20%2A%2AAddress%20Comment%2A%2A%3A%20Help%20me%20fix%20the%20issue%20described%20in%20the%20review%20comment%20above%0A%0APlease%20start%20by%20checking%20the%20current%20branch%20and%20PR%20details.)
  >
  >
  > <h2></h2>
  >
  > <sub>🤖 Was this useful? React with 👍 or 👎, or 🚀 if it prevented an incident/outage.</sub>

  > **.github/workflows/deploy-frontend.yml:82**
  >
  > <!-- metadata:{"confidence":9} -->
  > P1: `StrictHostKeyChecking=no` disables host-key verification, making the `ssh-keyscan` step on line 76 pointless and opening the deploy to MITM attacks. Since `known_hosts` is already populated by `ssh-keyscan`, remove the `-o StrictHostKeyChecking=no` flag from both the `rsync` and `ssh` commands.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At .github/workflows/deploy-frontend.yml, line 82:
  >
  > <comment>`StrictHostKeyChecking=no` disables host-key verification, making the `ssh-keyscan` step on line 76 pointless and opening the deploy to MITM attacks. Since `known_hosts` is already populated by `ssh-keyscan`, remove the `-o StrictHostKeyChecking=no` flag from both the `rsync` and `ssh` commands.</comment>
  >
  > <file context>
  > @@ -0,0 +1,93 @@
  > +      - name: Deploy via rsync
  > +        run: |
  > +          rsync -avz --delete \
  > +            -e "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no" \
  > +            dist/ root@158.220.105.104:/var/www/hena-wadeena/
  > +
  > </file context>
  > ```
  >
  > </details>

- [ ] Deploying as root increases blast radius if SSH key is compromised — @augmentcode, @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54Yukc --> <!-- thread:PRRT_kwDORjaF4M54Yxev -->
  > **.github/workflows/deploy-frontend.yml:83**
  >
  > `.github/workflows/deploy-frontend.yml:83` Deploying and reloading services as `root@...` significantly increases blast radius if the CI SSH key is ever leaked or misused.
  >
  > **Severity: high**
  >
  >
  >
  > <details open>
  > <summary>Other Locations</summary>
  >
  > - `.github/workflows/deploy-frontend.yml:88`
  > </details>
  >
  > [![Fix This in Augment](https://public.augment-assets.com/code-review/fix-in-augment.svg "Fix This in Augment")](https://app.augmentcode.com/open-chat?mode=agent&prompt=%23%23%20Review%20Comment%20Fix%20Request%0A%0APlease%20help%20me%20address%20this%20specific%20review%20comment%20from%20PR%3A%20https%3A%2F%2Fgithub.com%2F0-sayed%2Fhena-wadeena%2Fpull%2F89%0A%0A%23%23%23%20Review%20Comment%20Details%3A%0A-%20%2A%2AFile%20Location%2A%2A%3A%20.github%2Fworkflows%2Fdeploy-frontend.yml%0A-%20%2A%2ALocation%2A%2A%3A%20Line%2083%0A-%20%2A%2AComment%2A%2A%3A%20%22%60.github%2Fworkflows%2Fdeploy-frontend.yml%3A83%60%20Deploying%20and%20reloading%20services%20as%20%60root%40...%60%20significantly%20increases%20blast%20radius%20if%20the%20CI%20SSH%20key%20is%20ever%20leaked%20or%20misused.%22%0A%0A%23%23%23%20Steps%20to%20Follow%3A%0A%0A1.%20%2A%2ADetermine%20Github%20Branch%2A%2A%3A%20Use%20%60git%20branch%20--show-current%60%20to%20get%20the%20current%20branch%2C%20then%20fetch%20PR%20details%20from%20the%20Github%20API%20to%20determine%20the%20correct%20branch%20for%20this%20PR%0A2.%20%2A%2ABranch%20Verification%2A%2A%3A%20Ask%20the%20user%20to%20switch%20branches%20if%20they%20are%20not%20on%20the%20correct%20branch%0A3.%20%2A%2AAddress%20Comment%2A%2A%3A%20Help%20me%20fix%20the%20issue%20described%20in%20the%20review%20comment%20above%0A%0APlease%20start%20by%20checking%20the%20current%20branch%20and%20PR%20details.)
  >
  >
  > <h2></h2>
  >
  > <sub>🤖 Was this useful? React with 👍 or 👎, or 🚀 if it prevented an incident/outage.</sub>

  > **.github/workflows/deploy-frontend.yml:83**
  >
  > <!-- metadata:{"confidence":8} -->
  > P2: Deploying and running `nginx -t && systemctl reload nginx` as `root` via CI SSH significantly increases the blast radius if the `CONTABO_SSH_KEY` secret is ever compromised. Use a dedicated deploy user with limited sudo permissions (e.g., only `systemctl reload nginx`) instead.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At .github/workflows/deploy-frontend.yml, line 83:
  >
  > <comment>Deploying and running `nginx -t && systemctl reload nginx` as `root` via CI SSH significantly increases the blast radius if the `CONTABO_SSH_KEY` secret is ever compromised. Use a dedicated deploy user with limited sudo permissions (e.g., only `systemctl reload nginx`) instead.</comment>
  >
  > <file context>
  > @@ -0,0 +1,93 @@
  > +        run: |
  > +          rsync -avz --delete \
  > +            -e "ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no" \
  > +            dist/ root@158.220.105.104:/var/www/hena-wadeena/
  > +
  > +      - name: Reload Nginx
  > </file context>
  > ```
  >
  > </details>

- [ ] Duplicate CORS headers break API requests — @augmentcode, @gemini-code-assist, @devin-ai-integration, @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54Yuke --> <!-- thread:PRRT_kwDORjaF4M54YuqW --> <!-- thread:PRRT_kwDORjaF4M54YvLK --> <!-- thread:PRRT_kwDORjaF4M54Yxes -->
  > **docs/contabo/nginx-hena-wadeena.conf:24**
  >
  > `docs/contabo/nginx-hena-wadeena.conf:24` These server-level `Access-Control-*` headers are set with `always`, so they'll also be added to proxied `/api` responses and may conflict with the gateway's own CORS headers (potentially breaking CORS if duplicates/mismatched origins occur).
  >
  > **Severity: high**
  >
  > [![Fix This in Augment](https://public.augment-assets.com/code-review/fix-in-augment.svg "Fix This in Augment")](https://app.augmentcode.com/open-chat?mode=agent&prompt=%23%23%20Review%20Comment%20Fix%20Request%0A%0APlease%20help%20me%20address%20this%20specific%20review%20comment%20from%20PR%3A%20https%3A%2F%2Fgithub.com%2F0-sayed%2Fhena-wadeena%2Fpull%2F89%0A%0A%23%23%23%20Review%20Comment%20Details%3A%0A-%20%2A%2AFile%20Location%2A%2A%3A%20docs%2Fcontabo%2Fnginx-hena-wadeena.conf%0A-%20%2A%2ALocation%2A%2A%3A%20Line%2024%0A-%20%2A%2AComment%2A%2A%3A%20%22%60docs%2Fcontabo%2Fnginx-hena-wadeena.conf%3A24%60%20These%20server-level%20%60Access-Control-%2A%60%20headers%20are%20set%20with%20%60always%60%2C%20so%20they%E2%80%99ll%20also%20be%20added%20to%20proxied%20%60%2Fapi%60%20responses%20and%20may%20conflict%20with%20the%20gateway%E2%80%99s%20own%20CORS%20headers%20%28potentially%20breaking%20CORS%20if%20duplicates%2Fmismatched%20origins%20occur%29.%22%0A%0A%23%23%23%20Steps%20to%20Follow%3A%0A%0A1.%20%2A%2ADetermine%20Github%20Branch%2A%2A%3A%20Use%20%60git%20branch%20--show-current%60%20to%20get%20the%20current%20branch%2C%20then%20fetch%20PR%20details%20from%20the%20Github%20API%20to%20determine%20the%20correct%20branch%20for%20this%20PR%0A2.%20%2A%2ABranch%20Verification%2A%2A%3A%20Ask%20the%20user%20to%20switch%20branches%20if%20they%20are%20not%20on%20the%20correct%20branch%0A3.%20%2A%2AAddress%20Comment%2A%2A%3A%20Help%20me%20fix%20the%20issue%20described%20in%20the%20review%20comment%20above%0A%0APlease%20start%20by%20checking%20the%20current%20branch%20and%20PR%20details.)
  >
  >
  > <h2></h2>
  >
  > <sub>🤖 Was this useful? React with 👍 or 👎, or 🚀 if it prevented an incident/outage.</sub>

  > **docs/contabo/nginx-hena-wadeena.conf:27**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The `gateway` service (upstream) is already configured to handle CORS headers (see `gateway/nginx.conf.template`). Because Nginx `add_header` directives are inherited by location blocks unless the block defines its own, these headers will be appended to the API responses, resulting in duplicate CORS headers. Most modern browsers will reject API requests if multiple `Access-Control-Allow-Origin` headers are present. Furthermore, since the frontend and API are now served from the same origin, these headers are redundant for static assets.
  >
  > ```
  >     # CORS handled by gateway
  > ```

  > **docs/contabo/nginx-hena-wadeena.conf:27**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-6dfb32b85da9457bad1e5e29adea9150_0003", "file_path": "docs/contabo/nginx-hena-wadeena.conf", "start_line": 24, "end_line": 27, "side": "RIGHT"} -->
  >
  > 🔴 **Server-level CORS headers duplicate with gateway CORS headers, breaking API requests**
  >
  > The server-level `add_header Access-Control-Allow-Origin` (line 24) is inherited by `location /api` (line 36, which has no `add_header` of its own). However, this location proxies to the gateway at `localhost:8000` (`gateway/nginx.conf.template:76`), which already adds its own `Access-Control-Allow-Origin` header. The result is two `Access-Control-Allow-Origin` headers on every API response. Per the Fetch specification, browsers reject CORS responses with multiple `Access-Control-Allow-Origin` values, so **all API calls from the frontend will fail with CORS errors**.
  >
  > <details><summary>Fix options</summary>
  >
  > Either: (1) add `proxy_hide_header Access-Control-Allow-Origin` (and other CORS headers) inside `location /api` to strip the gateway's headers and let the outer nginx set them, or (2) move the CORS `add_header` directives out of the server block and into only the location blocks that need them (i.e., not `location /api`), or (3) remove the server-level CORS headers entirely and rely solely on the gateway for API CORS.
  > </details>
  >
  > <details>
  > <summary>Prompt for agents</summary>
  >
  > ```
  > In docs/contabo/nginx-hena-wadeena.conf, the server-level CORS add_header directives at lines 24-27 are inherited by the location /api block (line 36), but the upstream gateway at localhost:8000 already adds its own CORS headers. This results in duplicate Access-Control-Allow-Origin headers that break browser CORS validation.
  >
  > Fix: Move the CORS headers out of the server block. Either:
  > 1. Remove lines 24-27 entirely (the CORS headers) and add them only to the location blocks that serve static content (location /, location ~* static assets, location = /index.html), NOT to location /api.
  > 2. Or add proxy_hide_header directives inside location /api to strip the gateway's CORS headers before the server-level ones are added:
  >    proxy_hide_header Access-Control-Allow-Origin;
  >    proxy_hide_header Access-Control-Allow-Methods;
  >    proxy_hide_header Access-Control-Allow-Headers;
  >    proxy_hide_header Access-Control-Allow-Credentials;
  >
  > Option 1 is cleaner since it lets the gateway fully own CORS for API responses.
  > ```
  >
  > </details>
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/89" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

  > **docs/contabo/nginx-hena-wadeena.conf:24**
  >
  > <!-- metadata:{"confidence":9} -->
  > P1: Server-level `Access-Control-Allow-*` headers will be inherited by the `location /api` block (which defines no `add_header` of its own). Since the upstream gateway already sets its own CORS headers, API responses will contain duplicate `Access-Control-Allow-Origin` headers. Browsers reject CORS responses with multiple `Access-Control-Allow-Origin` values, so **all API calls will fail**.
  >
  > Either remove these server-level CORS headers entirely (the gateway owns CORS for API responses, and static assets served from the same origin don't need them), or add `proxy_hide_header Access-Control-Allow-Origin` (and the other CORS headers) inside `location /api`.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At docs/contabo/nginx-hena-wadeena.conf, line 24:
  >
  > <comment>Server-level `Access-Control-Allow-*` headers will be inherited by the `location /api` block (which defines no `add_header` of its own). Since the upstream gateway already sets its own CORS headers, API responses will contain duplicate `Access-Control-Allow-Origin` headers. Browsers reject CORS responses with multiple `Access-Control-Allow-Origin` values, so **all API calls will fail**.
  >
  > Either remove these server-level CORS headers entirely (the gateway owns CORS for API responses, and static assets served from the same origin don't need them), or add `proxy_hide_header Access-Control-Allow-Origin` (and the other CORS headers) inside `location /api`.</comment>
  >
  > <file context>
  > @@ -0,0 +1,67 @@
  > +    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  > +
  > +    # CORS for static files (API CORS handled by gateway)
  > +    add_header Access-Control-Allow-Origin "https://hena-wadeena.online" always;
  > +    add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
  > +    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Request-Id" always;
  > </file context>
  > ```
  >
  > </details>

- [ ] Security headers inheritance broken: headers dropped from index.html and static assets — @gemini-code-assist, @devin-ai-integration, @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54YuqY --> <!-- thread:PRRT_kwDORjaF4M54YvKS --> <!-- thread:PRRT_kwDORjaF4M54YvK7 --> <!-- thread:PRRT_kwDORjaF4M54Yxeq -->
  > **docs/contabo/nginx-hena-wadeena.conf:64**
  >
  > ![security-medium](https://www.gstatic.com/codereviewagent/security-medium-priority.svg) ![medium](https://www.gstatic.com/codereviewagent/medium-priority.svg)
  >
  > Nginx's `add_header` directive has a specific inheritance behavior: if a `location` block contains any `add_header` directive, it does not inherit any `add_header` directives from the `server` context. Consequently, the security headers defined on lines 18-21 (like `X-Frame-Options` and `X-Content-Type-Options`) will be missing from responses for static assets and `index.html`. To ensure these headers are always present, consider moving them into a separate configuration file and using the `include` directive in each block, or simply repeating them where needed.

  > **docs/contabo/nginx-hena-wadeena.conf:58**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-6dfb32b85da9457bad1e5e29adea9150_0001", "file_path": "docs/contabo/nginx-hena-wadeena.conf", "start_line": 55, "end_line": 58, "side": "RIGHT"} -->
  >
  > 🔴 **Nginx `add_header` inheritance broken: security headers silently dropped from index.html and static assets**
  >
  > In nginx, `add_header` directives in a child `location` block completely **replace** (not supplement) all `add_header` directives from the parent `server` block. Both `location ~* \.(js|css|...)$` (line 55) and `location = /index.html` (line 61) define their own `add_header Cache-Control ...`, which causes ALL server-level security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy) defined at lines 18-21 to be silently dropped for those responses.
  >
  > Critically, since `location /` uses `try_files $uri $uri/ /index.html` (line 51), every SPA route internally redirects to `/index.html`, re-matching `location = /index.html` — so **all pages** lose security headers, not just direct `/index.html` requests. This leaves the application vulnerable to clickjacking (no `X-Frame-Options`) and MIME-sniffing attacks (no `X-Content-Type-Options`) on every page load.
  >
  > <details><summary>Fix: repeat security headers in each child location block</summary>
  >
  > Every location block that defines its own `add_header` must also re-declare all security headers. Alternatively, use the `headers-more` module (`more_set_headers`) which does support proper inheritance.
  > </details>
  >
  > ```suggestion
  >     location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
  >         expires 1y;
  >         add_header Cache-Control "public, immutable";
  >         add_header X-Frame-Options "DENY" always;
  >         add_header X-Content-Type-Options "nosniff" always;
  >         add_header X-XSS-Protection "1; mode=block" always;
  >         add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  >     }
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/89" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

  > **docs/contabo/nginx-hena-wadeena.conf:63**
  >
  > <!-- devin-review-comment {"id": "BUG_pr-review-job-6dfb32b85da9457bad1e5e29adea9150_0002", "file_path": "docs/contabo/nginx-hena-wadeena.conf", "start_line": 61, "end_line": 63, "side": "RIGHT"} -->
  >
  > 🔴 **Nginx `add_header` inheritance broken: security headers dropped from `location = /index.html`**
  >
  > Same `add_header` inheritance issue as the static-assets location: `location = /index.html` at line 61 defines its own `add_header Cache-Control`, which prevents all server-level security headers (`docs/contabo/nginx-hena-wadeena.conf:18-21`) from being inherited. Since `try_files` in `location /` (`docs/contabo/nginx-hena-wadeena.conf:51`) internally redirects all SPA routes to `/index.html`, this exact-match location is the one that serves every page of the application — meaning no page gets X-Frame-Options, X-Content-Type-Options, etc.
  >
  > ```suggestion
  >     location = /index.html {
  >         expires -1;
  >         add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
  >         add_header X-Frame-Options "DENY" always;
  >         add_header X-Content-Type-Options "nosniff" always;
  >         add_header X-XSS-Protection "1; mode=block" always;
  >         add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  >     }
  > ```
  >
  > <!-- devin-review-badge-begin -->
  > <a href="https://app.devin.ai/review/0-sayed/hena-wadeena/pull/89" target="_blank">
  >   <picture>
  >     <source media="(prefers-color-scheme: dark)" srcset="https://static.devin.ai/assets/gh-open-in-devin-review-dark.svg?v=1">
  >     <img src="https://static.devin.ai/assets/gh-open-in-devin-review-light.svg?v=1" alt="Open in Devin Review">
  >   </picture>
  > </a>
  > <!-- devin-review-badge-end -->
  >
  > ---
  > *Was this helpful? React with 👍 or 👎 to provide feedback.*

  > **docs/contabo/nginx-hena-wadeena.conf:55**
  >
  > <!-- metadata:{"confidence":9} -->
  > P1: Nginx's `add_header` inheritance means the security headers (X-Frame-Options, X-Content-Type-Options, etc.) from the `server` block are silently dropped for any `location` that defines its own `add_header`. Both the static-asset and `index.html` locations will serve responses without any security headers.
  >
  > Repeat the security headers in each location block, or move them into an `include`d snippet that every location pulls in.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At docs/contabo/nginx-hena-wadeena.conf, line 55:
  >
  > <comment>Nginx's `add_header` inheritance means the security headers (X-Frame-Options, X-Content-Type-Options, etc.) from the `server` block are silently dropped for any `location` that defines its own `add_header`. Both the static-asset and `index.html` locations will serve responses without any security headers.
  >
  > Repeat the security headers in each location block, or move them into an `include`d snippet that every location pulls in.</comment>
  >
  > <file context>
  > @@ -0,0 +1,67 @@
  > +    }
  > +
  > +    # Cache static assets
  > +    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
  > +        expires 1y;
  > +        add_header Cache-Control "public, immutable";
  > </file context>
  > ```
  >
  > </details>

- [ ] Missing concurrency group: parallel deployments can race — @augmentcode, @cubic-dev-ai <!-- thread:PRRT_kwDORjaF4M54YukY --> <!-- thread:PRRT_kwDORjaF4M54Yxet -->
  > **.github/workflows/deploy-frontend.yml:3**
  >
  > `.github/workflows/deploy-frontend.yml:3` There's no `concurrency` configured for this deploy workflow, so multiple pushes to `main` can overlap deployments and potentially race on the remote filesystem/Nginx reload.
  >
  > **Severity: medium**
  >
  > [![Fix This in Augment](https://public.augment-assets.com/code-review/fix-in-augment.svg "Fix This in Augment")](https://app.augmentcode.com/open-chat?mode=agent&prompt=%23%23%20Review%20Comment%20Fix%20Request%0A%0APlease%20help%20me%20address%20this%20specific%20review%20comment%20from%20PR%3A%20https%3A%2F%2Fgithub.com%2F0-sayed%2Fhena-wadeena%2Fpull%2F89%0A%0A%23%23%23%20Review%20Comment%20Details%3A%0A-%20%2A%2AFile%20Location%2A%2A%3A%20.github%2Fworkflows%2Fdeploy-frontend.yml%0A-%20%2A%2ALocation%2A%2A%3A%20Line%203%0A-%20%2A%2AComment%2A%2A%3A%20%22%60.github%2Fworkflows%2Fdeploy-frontend.yml%3A3%60%20There%E2%80%99s%20no%20%60concurrency%60%20configured%20for%20this%20deploy%20workflow%2C%20so%20multiple%20pushes%20to%20%60main%60%20can%20overlap%20deployments%20and%20potentially%20race%20on%20the%20remote%20filesystem%2FNginx%20reload.%22%0A%0A%23%23%23%20Steps%20to%20Follow%3A%0A%0A1.%20%2A%2ADetermine%20Github%20Branch%2A%2A%3A%20Use%20%60git%20branch%20--show-current%60%20to%20get%20the%20current%20branch%2C%20then%20fetch%20PR%20details%20from%20the%20Github%20API%20to%20determine%20the%20correct%20branch%20for%20this%20PR%0A2.%20%2A%2ABranch%20Verification%2A%2A%3A%20Ask%20the%20user%20to%20switch%20branches%20if%20they%20are%20not%20on%20the%20correct%20branch%0A3.%20%2A%2AAddress%20Comment%2A%2A%3A%20Help%20me%20fix%20the%20issue%20described%20in%20the%20review%20comment%20above%0A%0APlease%20start%20by%20checking%20the%20current%20branch%20and%20PR%20details.)
  >
  >
  > <h2></h2>
  >
  > <sub>🤖 Was this useful? React with 👍 or 👎, or 🚀 if it prevented an incident/outage.</sub>

  > **.github/workflows/deploy-frontend.yml:1**
  >
  > <!-- metadata:{"confidence":9} -->
  > P2: Add a `concurrency` group to prevent overlapping deployments. Without it, rapid consecutive pushes can cause `rsync --delete` to run in parallel, leaving the server with incomplete files.
  >
  > <details>
  > <summary>Prompt for AI agents</summary>
  >
  > ```text
  > Check if this issue is valid — if so, understand the root cause and fix it. At .github/workflows/deploy-frontend.yml, line 7:
  >
  > <comment>Add a `concurrency` group to prevent overlapping deployments. Without it, rapid consecutive pushes can cause `rsync --delete` to run in parallel, leaving the server with incomplete files.</comment>
  >
  > <file context>
  > @@ -0,0 +1,93 @@
  > +  push:
  > +    branches:
  > +      - main
  > +    paths:
  > +      - 'apps/web/**'
  > +      - 'packages/types/**'
  > </file context>
  > ```
  >
  > </details>

- [ ] Gateway port 8000 not exposed to host: proxy will fail — @gemini-code-assist <!-- thread:PRRT_kwDORjaF4M54YuqX -->
  > **docs/contabo/nginx-hena-wadeena.conf:37**
  >
  > ![high](https://www.gstatic.com/codereviewagent/high-priority.svg)
  >
  > The `proxy_pass` target `http://localhost:8000` assumes the `gateway` container's port 80 is mapped to port 8000 on the host. However, the `docker-compose.yml` provided in the context only uses `expose: - '80'`, which makes the port accessible only to other containers in the Docker network, not the host. To fix this, you must add a `ports` mapping (e.g., `"8000:80"`) to the `gateway` service in `docker-compose.yml` and ensure the `caddy` service is disabled to avoid port 80 conflicts on the host.

- [ ] Security Audit failing — CI
  - [ ] lodash vulnerability: Code Injection via _.template imports (CVE GHSA-r5fr-rjxr-66jc)

## Not Worth Fixing

- [x] ~~Floating action tags instead of SHA-pinned versions — @augmentcode~~ <!-- thread:PRRT_kwDORjaF4M54YukW -->
  - _Reason: Project doesn't enforce SHA pinning in other workflows (see ci.yml, codeql.yml, dependency-review.yml). This is a style preference, not a security blocker — floating tags get security patches automatically, SHA pinning requires manual updates._
  > **.github/workflows/deploy-frontend.yml:19**
  >
  > `.github/workflows/deploy-frontend.yml:19` This workflow uses floating action tags (e.g., `actions/checkout@v4`), while other repo workflows pin actions to SHAs; tags can change over time and introduce unexpected behavior/supply-chain risk.
  >
  > **Severity: medium**
  >
  >
  >
  > <details open>
  > <summary>Other Locations</summary>
  >
  > - `.github/workflows/deploy-frontend.yml:22`
  > - `.github/workflows/deploy-frontend.yml:27`
  > - `.github/workflows/deploy-frontend.yml:37`
  > - `.github/workflows/deploy-frontend.yml:54`
  > - `.github/workflows/deploy-frontend.yml:67`
  > </details>
  >
  > [![Fix This in Augment](https://public.augment-assets.com/code-review/fix-in-augment.svg "Fix This in Augment")](https://app.augmentcode.com/open-chat?mode=agent&prompt=%23%23%20Review%20Comment%20Fix%20Request%0A%0APlease%20help%20me%20address%20this%20specific%20review%20comment%20from%20PR%3A%20https%3A%2F%2Fgithub.com%2F0-sayed%2Fhena-wadeena%2Fpull%2F89%0A%0A%23%23%23%20Review%20Comment%20Details%3A%0A-%20%2A%2AFile%20Location%2A%2A%3A%20.github%2Fworkflows%2Fdeploy-frontend.yml%0A-%20%2A%2ALocation%2A%2A%3A%20Line%2019%0A-%20%2A%2AComment%2A%2A%3A%20%22%60.github%2Fworkflows%2Fdeploy-frontend.yml%3A19%60%20This%20workflow%20uses%20floating%20action%20tags%20%28e.g.%2C%20%60actions%2Fcheckout%40v4%60%29%2C%20while%20other%20repo%20workflows%20pin%20actions%20to%20SHAs%3B%20tags%20can%20change%20over%20time%20and%20introduce%20unexpected%20behavior%2Fsupply-chain%20risk.%22%0A%0A%23%23%23%20Steps%20to%20Follow%3A%0A%0A1.%20%2A%2ADetermine%20Github%20Branch%2A%2A%3A%20Use%20%60git%20branch%20--show-current%60%20to%20get%20the%20current%20branch%2C%20then%20fetch%20PR%20details%20from%20the%20Github%20API%20to%20determine%20the%20correct%20branch%20for%20this%20PR%0A2.%20%2A%2ABranch%20Verification%2A%2A%3A%20Ask%20the%20user%20to%20switch%20branches%20if%20they%20are%20not%20on%20the%20correct%20branch%0A3.%20%2A%2AAddress%20Comment%2A%2A%3A%20Help%20me%20fix%20the%20issue%20described%20in%20the%20review%20comment%20above%0A%0APlease%20start%20by%20checking%20the%20current%20branch%20and%20PR%20details.)
  >
  >
  > <h2></h2>
  >
  > <sub>🤖 Was this useful? React with 👍 or 👎, or 🚀 if it prevented an incident/outage.</sub>

- [x] ~~location /api matches /apifoo paths — @augmentcode~~ <!-- thread:PRRT_kwDORjaF4M54Yukf -->
  - _Reason: Low severity theoretical issue. The project doesn't have any routes starting with /api except the actual API. Would need to be `location = /api` or `location /api/` to fix, but current pattern matches project needs._
  > **docs/contabo/nginx-hena-wadeena.conf:36**
  >
  > `docs/contabo/nginx-hena-wadeena.conf:36` `location /api` will also match paths like `/apifoo` (not just `/api/*`), which can unintentionally proxy non-API routes if any such paths exist.
  >
  > **Severity: low**
  >
  > [![Fix This in Augment](https://public.augment-assets.com/code-review/fix-in-augment.svg "Fix This in Augment")](https://app.augmentcode.com/open-chat?mode=agent&prompt=%23%23%20Review%20Comment%20Fix%20Request%0A%0APlease%20help%20me%20address%20this%20specific%20review%20comment%20from%20PR%3A%20https%3A%2F%2Fgithub.com%2F0-sayed%2Fhena-wadeena%2Fpull%2F89%0A%0A%23%23%23%20Review%20Comment%20Details%3A%0A-%20%2A%2AFile%20Location%2A%2A%3A%20docs%2Fcontabo%2Fnginx-hena-wadeena.conf%0A-%20%2A%2ALocation%2A%2A%3A%20Line%2036%0A-%20%2A%2AComment%2A%2A%3A%20%22%60docs%2Fcontabo%2Fnginx-hena-wadeena.conf%3A36%60%20%60location%20%2Fapi%60%20will%20also%20match%20paths%20like%20%60%2Fapifoo%60%20%28not%20just%20%60%2Fapi%2F%2A%60%29%2C%20which%20can%20unintentionally%20proxy%20non-API%20routes%20if%20any%20such%20paths%20exist.%22%0A%0A%23%23%23%20Steps%20to%20Follow%3A%0A%0A1.%20%2A%2ADetermine%20Github%20Branch%2A%2A%3A%20Use%20%60git%20branch%20--show-current%60%20to%20get%20the%20current%20branch%2C%20then%20fetch%20PR%20details%20from%20the%20Github%20API%20to%20determine%20the%20correct%20branch%20for%20this%20PR%0A2.%20%2A%2ABranch%20Verification%2A%2A%3A%20Ask%20the%20user%20to%20switch%20branches%20if%20they%20are%20not%20on%20the%20correct%20branch%0A3.%20%2A%2AAddress%20Comment%2A%2A%3A%20Help%20me%20fix%20the%20issue%20described%20in%20the%20review%20comment%20above%0A%0APlease%20start%20by%20checking%20the%20current%20branch%20and%20PR%20details.)
  >
  >
  > <h2></h2>
  >
  > <sub>🤖 Was this useful? React with 👍 or 👎, or 🚀 if it prevented an incident/outage.</sub>

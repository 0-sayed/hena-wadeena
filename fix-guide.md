# 🛠️ Bug Fix Guide — hena-wadeena.online

## ⚠️ Confirmed Status — Re-tested

> **CORS is blocking ALL requests across the entire API.**  
> No endpoint on `https://api.hena-wadeena.online` is reachable from the frontend.  
> The API server is returning no CORS headers whatsoever — not even on preflight `OPTIONS` responses.  
> This must be fixed on the server before any frontend feature can work.

---

## Overview

Two categories of issues were detected in the browser console and network tab:

1. **CORS Policy Errors** — All API requests from the frontend are being blocked
2. **Radix UI Accessibility Warnings** — `DialogContent` is missing required `DialogTitle` and `Description`

---

## Issue 1 — CORS Policy Blocking All API Requests

### What's happening

Every request from `https://hena-wadeena.online` to `https://api.hena-wadeena.online` is blocked with:

```
Access to fetch at 'https://api.hena-wadeena.online/...' from origin
'https://hena-wadeena.online' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Affected endpoints:**
- `POST /api/v1/auth/login`
- `GET /api/v1/price-index?region=kharga&offset=0&limit=20`
- `GET /api/v1/price-index/summary`
- `GET /api/v1/businesses?offset=0&limit=20`

### Why it happens

The browser sends a **preflight OPTIONS request** before any cross-origin fetch. Your API server does not respond with the required `Access-Control-Allow-Origin` header, so the browser blocks the actual request entirely.

### Fix — Backend (Required)

You must configure CORS on your API server. The fix depends on your backend stack:

---

#### ✅ Node.js / Express

Install the `cors` package:

```bash
npm install cors
```

Add this **before all routes**:

```js
const cors = require('cors');

app.use(cors({
  origin: 'https://hena-wadeena.online',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
```

---

#### ✅ Python / FastAPI

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://hena-wadeena.online"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

#### ✅ Python / Django

Install `django-cors-headers`:

```bash
pip install django-cors-headers
```

In `settings.py`:

```python
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be FIRST
    ...
]

CORS_ALLOWED_ORIGINS = [
    "https://hena-wadeena.online",
]

CORS_ALLOW_CREDENTIALS = True
```

---

#### ✅ Nginx (Reverse Proxy — Alternative / Additional)

If you use Nginx in front of your API, add this to your `api.hena-wadeena.online` server block:

```nginx
location / {
    add_header 'Access-Control-Allow-Origin' 'https://hena-wadeena.online' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    if ($request_method = OPTIONS) {
        return 204;
    }

    proxy_pass http://localhost:YOUR_APP_PORT;
}
```

> ⚠️ Replace `YOUR_APP_PORT` with your actual app port (e.g., `3000`, `8000`).

---

### How to verify the fix

After deploying, open the browser DevTools → **Network** tab → click any blocked request. In the **Response Headers**, you should now see:

```
Access-Control-Allow-Origin: https://hena-wadeena.online
Access-Control-Allow-Credentials: true
```

---

## Issue 2 — Radix UI Dialog Accessibility Warnings

### What's happening

Two warnings appear for every `<DialogContent>` rendered on the page:

```
`DialogContent` requires a `DialogTitle` for the component to be accessible for screen reader users.

Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}.
```

### Why it happens

Radix UI enforces accessibility standards. Every `<DialogContent>` must have:
- A visible or hidden `<DialogTitle>`
- A visible or hidden `<DialogDescription>` (or `aria-describedby={undefined}` to opt out)

### Fix — Frontend

#### Option A — Add visible title and description (Recommended)

```jsx
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@radix-ui/react-dialog";

<Dialog>
  <DialogContent>
    <DialogTitle>Your Dialog Title</DialogTitle>
    <DialogDescription>
      A brief description of what this dialog is for.
    </DialogDescription>
    {/* rest of your content */}
  </DialogContent>
</Dialog>
```

---

#### Option B — Hide title visually (keep it accessible to screen readers)

Use Radix's `VisuallyHidden` utility if you don't want the title to appear visually:

```jsx
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DialogTitle, DialogDescription } from "@radix-ui/react-dialog";

<DialogContent>
  <VisuallyHidden>
    <DialogTitle>Hidden Title</DialogTitle>
    <DialogDescription>Hidden description for screen readers</DialogDescription>
  </VisuallyHidden>
  {/* your visible content */}
</DialogContent>
```

---

#### Option C — Opt out of description warning only

If you intentionally have no description, pass `aria-describedby={undefined}` to suppress just that warning:

```jsx
<DialogContent aria-describedby={undefined}>
  <DialogTitle>Your Title</DialogTitle>
  {/* no description */}
</DialogContent>
```

---

## Quick Fix — Allow All Origins (Wildcard)

> Use this temporarily to confirm CORS is the only issue. **Do not leave this in production.**

#### Express
```js
app.use(cors({ origin: '*' }));
```

#### FastAPI
```python
allow_origins=["*"]
```

#### Nginx
```nginx
add_header 'Access-Control-Allow-Origin' '*' always;
```

Once requests succeed, switch `*` back to `https://hena-wadeena.online` as shown in Issue 1 above.

---

## Debugging Checklist — Trace the Root Cause

If fixing CORS on the server doesn't work immediately, use this checklist:

- [ ] **Check which server handles the request** — Is there a load balancer, reverse proxy (Nginx, Caddy), or CDN (Cloudflare) in front of your API? CORS headers must be set at whatever layer responds first.
- [ ] **Test the OPTIONS preflight directly** — Run this in your terminal:
  ```bash
  curl -X OPTIONS https://api.hena-wadeena.online/api/v1/auth/login \
    -H "Origin: https://hena-wadeena.online" \
    -H "Access-Control-Request-Method: POST" \
    -v
  ```
  You should see `Access-Control-Allow-Origin` in the response. If you don't, the server middleware is not running.
- [ ] **Confirm middleware order** — In Express/FastAPI, CORS middleware must be registered **before** any routes. If routes are defined first, the CORS header never gets added.
- [ ] **Check for duplicate CORS headers** — If both Nginx and your app set the header, browsers reject duplicate values. Set it in only one place.
- [ ] **Check Cloudflare settings** — If the domain runs through Cloudflare, make sure no transform rule or firewall rule is stripping response headers.
- [ ] **Restart the server after changes** — CORS config changes are not hot-reloaded in most frameworks. A full server restart is required.
- [ ] **Clear the browser cache** — Preflight responses are cached by the browser. Hard refresh (`Ctrl+Shift+R`) or disable cache in DevTools → Network while testing.

---



| # | Issue | Where to Fix | Status |
|---|-------|-------------|--------|
| 1 | CORS blocked on `/auth/login` | API Server / Nginx | ❌ Not fixed |
| 2 | CORS blocked on `/price-index` | API Server / Nginx | ❌ Not fixed |
| 3 | CORS blocked on `/price-index/summary` | API Server / Nginx | ❌ Not fixed |
| 4 | CORS blocked on `/businesses` | API Server / Nginx | ❌ Not fixed |
| 5 | `DialogContent` missing `DialogTitle` | Frontend component(s) | ❌ Not fixed |
| 6 | `DialogContent` missing `Description` | Frontend component(s) | ❌ Not fixed |

> Once all items above are addressed, re-deploy both the frontend and backend and verify using the browser's Network and Console tabs.

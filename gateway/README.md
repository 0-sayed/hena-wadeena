# Hena Wadeena — API Gateway

High-performance Nginx-based API gateway that routes requests to backend microservices, enforces rate limits, handles CORS, and blocks unauthorized access to internal endpoints.

## Overview

The gateway acts as the single entry point for all API traffic, providing:

- **Request routing** — maps URL prefixes to backend services
- **Rate limiting** — protects services from abuse with tiered limits
- **Security** — blocks `/internal/*` routes, adds security headers, validates CORS origins
- **Observability** — structured JSON logging with request IDs, response times, and upstream metrics
- **Error handling** — consistent JSON error responses across all services
- **Health checks** — `/health` endpoint for Docker/orchestrator liveness probes

## Tech Stack

- **Nginx 1.27** (Alpine-based)
- **envsubst** for runtime configuration templating
- **Docker** for containerized deployment

## Architecture

```
Internet → :8000 (Nginx) → Docker network → Backend services
                           ├─ identity:8001
                           ├─ market:8002
                           ├─ guide-booking:8003
                           ├─ map:8004
                           └─ ai:8005
```

## Routing Rules

### Service Routing

| Path Prefix | Backend Service | Port | Rate Zone |
|-------------|-----------------|------|-----------|
| `/api/v1/auth`, `/api/v1/users`, `/api/v1/profile`, `/api/v1/kyc`, `/api/v1/notifications`, `/api/v1/saved-items` | identity | 8001 | global |
| `/api/v1/auth/(login\|register\|password-reset)` | identity | 8001 | auth (stricter) |
| `/api/v1/listings`, `/api/v1/market`, `/api/v1/prices`, `/api/v1/price-index`, `/api/v1/business*`, `/api/v1/commodit*`, `/api/v1/reviews`, `/api/v1/opportunities`, `/api/v1/investments` | market | 8002 | global |
| `/api/v1/guides`, `/api/v1/packages`, `/api/v1/bookings`, `/api/v1/attractions` | guide-booking | 8003 | global |
| `/api/v1/map`, `/api/v1/pois`, `/api/v1/carpool` | map | 8004 | global |
| `/api/v1/chat`, `/api/v1/ai`, `/api/v1/documents` | ai | 8005 | ai (SSE support) |
| `/api/v1/search` | identity | 8001 | global |
| `/api/v1/admin/*` | routed by sub-path (users/kyc → identity, stats/listings → market, guides/bookings → guide-booking) | varies | global |

### Special Routes

- **`/health`** — gateway health check (200 OK with `{"status":"ok","service":"gateway"}`)
- **`/api/v1/internal/*`** — **BLOCKED** (403 Forbidden) — prevents external access to internal APIs
- **`OPTIONS` (CORS preflight)** — handled at server level (204 No Content with CORS headers)
- **Default (`/`)** — 404 Not Found

## Rate Limiting

Three zones with configurable rates (defaults shown):

| Zone | Default | Burst | Applied To |
|------|---------|-------|------------|
| `global` | 100 req/min | 20 | Most endpoints |
| `auth` | 5 req/min | 5 | `/auth/(login\|register\|password-reset)` |
| `ai` | 30 req/min | 10 | AI service (chat, documents) |

Rate limits are per IP address (`$binary_remote_addr`). Excess requests return `429 Too Many Requests`.

## Security Features

### CORS

- **Origin validation** — regex-based allow-list (production domains + localhost/127.0.0.1)
- **Credentials support** — `Access-Control-Allow-Credentials: true`
- **Headers** — Authorization, Content-Type, X-Request-Id
- **Methods** — GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Preflight caching** — 24 hours (`Access-Control-Max-Age: 86400`)

### Headers

- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — blocks MIME sniffing
- `X-XSS-Protection: 1; mode=block` — legacy XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- `X-Request-Id` — correlation ID for tracing (client-provided or Nginx-generated)

### Access Control

- `/api/v1/internal/*` routes return 403 (no upstream access)
- Body size limit (default 10 MB, configurable via `MAX_BODY_SIZE`)

## Configuration

### Environment Variables

Set via `.env` file or `docker-compose.yml`:

```bash
# CORS origins (regex pattern, pipe-separated)
CORS_ORIGINS=.*

# Max request body size (Nginx format: 10m = 10 megabytes)
MAX_BODY_SIZE=10m

# Rate limits (Nginx format: 100r/m = 100 requests per minute)
RATE_GLOBAL=100r/m
RATE_AUTH=5r/m
RATE_AI=30r/m
```

### Template Substitution

`nginx.conf.template` uses `${VAR}` placeholders replaced by `envsubst` at container start. Only variables matching `NGINX_ENVSUBST_FILTER` are substituted (default: `^CORS_|^MAX_|^RATE_`). Nginx's native `$vars` (no braces) are left untouched.

## Prerequisites

- Docker 24+ (with Compose V2)
- Backend services running on Docker network (identity, market, guide-booking, map, ai)

## Running Locally

### With Docker Compose (Recommended)

```bash
# Start gateway + backend services
docker compose up gateway

# Or include dev overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up gateway

# Gateway available at http://localhost:8000
```

### Standalone (for testing)

```bash
# Build image
cd gateway
docker build -t hena-wadeena-gateway .

# Run container
docker run -d \
  --name gateway \
  -p 8000:80 \
  -e CORS_ORIGINS=".*" \
  -e MAX_BODY_SIZE="10m" \
  -e RATE_GLOBAL="100r/m" \
  -e RATE_AUTH="5r/m" \
  -e RATE_AI="30r/m" \
  hena-wadeena-gateway

# Check health
curl http://localhost:8000/health
# {"status":"ok","service":"gateway"}
```

## Deployment

### Production (docker-compose.yml)

```yaml
gateway:
  image: ghcr.io/0-sayed/hena-wadeena/gateway:latest
  restart: unless-stopped
  ports:
    - "8000:80"
  environment:
    - NGINX_ENVSUBST_FILTER=^CORS_|^MAX_|^RATE_
    - CORS_ORIGINS=https://hena-wadeena\.online|https://www\.hena-wadeena\.online
    - MAX_BODY_SIZE=10m
    - RATE_GLOBAL=100r/m
    - RATE_AUTH=5r/m
    - RATE_AI=30r/m
  networks:
    - hena-wadeena
  healthcheck:
    test: ["CMD", "wget", "-qO-", "http://127.0.0.1/health"]
    interval: 15s
    timeout: 5s
    retries: 3
```

### CI/CD

Gateway is auto-built and pushed to GitHub Container Registry on push to `main`:

```bash
docker pull ghcr.io/0-sayed/hena-wadeena/gateway:latest
```

## Adding New Routes

### 1. Edit nginx.conf.template

Add a new `location` block before the default `/` catch-all:

```nginx
# ── New Service ────────────────────────────────────────────────────────
location ~ ^/api/v1/new-service(?:/|$) {
    limit_req zone=global burst=20 nodelay;
    set $upstream_new http://new-service:8006;
    proxy_pass $upstream_new;
}
```

### 2. Rebuild and redeploy

```bash
docker compose build gateway
docker compose up -d gateway
```

### 3. Update documentation

- Add route to **Routing Rules** table above
- Update `.env.example` if new rate zone needed
- Update `docker-compose.yml` if new upstream service

## Logging

### Access Logs

Structured JSON format written to `/var/log/nginx/access.log`:

```json
{
  "time": "2026-04-01T12:34:56+00:00",
  "remote_addr": "203.0.113.42",
  "request_method": "GET",
  "request_uri": "/api/v1/listings",
  "status": 200,
  "body_bytes_sent": 2048,
  "request_time": 0.123,
  "upstream_response_time": "0.098",
  "request_id": "abc123-def456",
  "http_user_agent": "Mozilla/5.0..."
}
```

### Error Logs

Written to `/var/log/nginx/error.log` at `warn` level.

### Viewing Logs

```bash
# Follow access logs
docker logs -f gateway

# Tail JSON logs (if mounted volume)
tail -f /var/log/nginx/access.log | jq

# Filter by status code
docker logs gateway 2>&1 | grep '"status":429'
```

## Troubleshooting

### 502 Bad Gateway

**Symptom:** `{"statusCode":502,"message":"Service temporarily unavailable"}`

**Causes:**
- Backend service not running
- Incorrect service name in `proxy_pass` (must match Docker Compose service name)
- Network misconfiguration

**Fix:**
```bash
# Check service health
docker compose ps

# Inspect backend service logs
docker logs identity

# Verify network connectivity
docker compose exec gateway ping identity
```

### 429 Too Many Requests

**Symptom:** `{"statusCode":429,"message":"Too many requests, please try again later"}`

**Causes:**
- Rate limit exceeded for IP address
- Burst limit exceeded

**Fix:**
```bash
# Increase rate limits in .env
RATE_GLOBAL=200r/m
RATE_AUTH=10r/m
RATE_AI=60r/m

# Restart gateway
docker compose restart gateway

# Or whitelist IP (edit nginx.conf.template)
geo $limit {
    default 1;
    10.0.0.0/8 0;  # internal network
}
```

### 403 Forbidden on /internal/* routes

**Expected behavior.** These routes are blocked by design. Move endpoint to non-internal path or call from within Docker network.

### CORS errors

**Symptom:** Browser console shows `Access to fetch ... has been blocked by CORS policy`

**Causes:**
- Origin not in `CORS_ORIGINS` allow-list
- Incorrect regex pattern

**Fix:**
```bash
# Add origin to .env (pipe-separated regex)
CORS_ORIGINS=https://hena-wadeena\.online|https://app\.example\.com

# Or allow all (dev only)
CORS_ORIGINS=.*

# Restart gateway
docker compose restart gateway
```

### 504 Gateway Timeout

**Symptom:** `{"statusCode":504,"message":"Service did not respond in time"}`

**Causes:**
- Slow upstream response (default timeout: 60s)
- AI service SSE streams (extended timeout: 300s)

**Fix:**
```nginx
# Edit nginx.conf.template, add to location block
proxy_read_timeout 300s;  # 5 minutes
```

### Request ID not propagated

**Symptom:** Logs show different request IDs in gateway vs. backend

**Verify:**
```bash
# Gateway should set X-Request-Id header
curl -i http://localhost:8000/api/v1/listings

# Backend should log the same ID
docker logs identity | grep request_id
```

**Fix:** Ensure backend services read `X-Request-Id` from headers (already configured in `@hena-wadeena/nest-common`).

### Health check failing

**Symptom:** Docker reports gateway unhealthy

**Debug:**
```bash
# Manual health check
curl http://localhost:8000/health

# Check Nginx config syntax
docker compose exec gateway nginx -t

# Reload Nginx (if config changed)
docker compose exec gateway nginx -s reload
```

## Performance Tuning

### Worker Processes

Default: auto-detected (1 per CPU core). Override in `nginx.conf.template`:

```nginx
worker_processes 4;
```

### Keepalive Connections

Improves performance for repeat clients. Already enabled:

```nginx
proxy_http_version 1.1;
proxy_set_header Connection "";
```

### Compression

Gzip enabled for JSON/text responses (min 256 bytes). Adjust in `nginx.conf.template`:

```nginx
gzip_comp_level 6;      # 1-9, default 6
gzip_min_length 1024;   # bytes
```

### Buffer Sizes

Increase for large responses:

```nginx
proxy_buffer_size 16k;
proxy_buffers 8 16k;
proxy_busy_buffers_size 32k;
```

## Monitoring

### Prometheus Metrics (Future)

Consider adding [nginx-prometheus-exporter](https://github.com/nginxinc/nginx-prometheus-exporter) for:
- Request rate, latency percentiles
- Upstream health, response times
- Rate limit hits

### Log Aggregation

Ship JSON logs to:
- **ELK Stack** — Elasticsearch + Logstash + Kibana
- **Loki** — lightweight, Grafana integration
- **CloudWatch** — AWS-native

## Related Documentation

- [Nginx Configuration Reference](https://nginx.org/en/docs/)
- [Backend Services](../services/README.md)
- [Docker Compose Setup](../docker-compose.yml)
- [Project Overview](../README.md)

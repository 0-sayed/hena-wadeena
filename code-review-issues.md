# Deployment Failure — Missing MongoDB Credentials

**Date:** 2026-03-28
**Commit:** `21f8e33fba145d191697a883d30996d40eccbc2b` (PR #56 — addingChatBot)
**Stage:** Deploy → Running migrations
**Exit code:** 1

---

## Error

```
error while interpolating services.mongodb.environment.MONGO_INITDB_ROOT_USERNAME:
required variable MONGO_INITDB_ROOT_USERNAME is missing a value:
MONGO_INITDB_ROOT_USERNAME is not set
```

---

## Root Cause

The PR that added MongoDB authentication (fixing the P1 security issue flagged in the earlier code review) set `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` as **required** environment variables in `docker-compose.yml`. However, those variables were never added to the server's `.env` file at `/opt/hena-wadeena/.env`.

When the deploy script ran `docker compose run --rm ... identity node dist/db/migrate.js`, Docker Compose tried to interpolate all service definitions — including the new `mongodb` service — and failed immediately because the required variables had no value.

**The deploy script uses `set -euo pipefail`**, so the first non-zero exit aborted the entire pipeline. No migrations ran and no services were restarted.

---

## Impact

- **No services were restarted** — the currently running containers (from the previous deploy) are still up and serving traffic.
- **No data was lost** — the migration step failed before any `docker compose up` commands executed.
- **The new AI/chatbot features from PR #56 are not live yet.**

---

## Fix

### Step 1 — Add the missing variables to the server's `.env` file

SSH into the deployment server and append the two MongoDB credential variables to `/opt/hena-wadeena/.env`:

```bash
echo 'MONGO_INITDB_ROOT_USERNAME=<choose-a-username>' >> /opt/hena-wadeena/.env
echo 'MONGO_INITDB_ROOT_PASSWORD=<choose-a-strong-password>' >> /opt/hena-wadeena/.env
```

> **Security note:** Use a strong, randomly generated password. Do **not** reuse any existing service credentials. Store both values in your secrets manager (e.g., GitHub Actions secrets, Vault, or your team's password manager) immediately.

### Step 2 — Also add the credentials to the AI service connection URI

The MongoDB URI used by the AI service must include the credentials. Update `MONGODB_URI` in the same `.env` file:

```bash
# Replace the existing MONGODB_URI line:
MONGODB_URI=mongodb://<username>:<password>@mongodb:27017
```

Or if you prefer to keep username/password as separate variables and compose the URI in config:

```bash
MONGODB_URI=mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@mongodb:27017
```

### Step 3 — Re-trigger the deployment

Once the `.env` file is updated, re-run the deployment. The fastest way is to re-run the failed GitHub Actions workflow from the Actions tab (no new commit needed).

Alternatively, run the deploy commands manually on the server:

```bash
cd /opt/hena-wadeena

# Run migrations
docker compose run --rm -w /app/services/identity identity node dist/db/migrate.js
docker compose run --rm -w /app/services/market market node dist/db/migrate.js
docker compose run --rm -w /app/services/guide-booking guide-booking node dist/db/migrate.js
docker compose run --rm -w /app/services/map map node dist/db/migrate.js

# Restart services
docker compose up -d --wait --timeout 120 \
  postgres redis qdrant identity market guide-booking map ai gateway
docker compose up -d caddy
```

---

## Prevention

To avoid this class of failure in the future:

1. **Document all required env vars in `.env.example`** — `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, and the authenticated `MONGODB_URI` should already be present in `.env.example` after the auth fix. Verify they are.

2. **Add a pre-deploy env validation step** to the GitHub Actions deploy workflow that checks for required variables before SSHing to the server:

```yaml
- name: Validate required secrets
  run: |
    : "${MONGO_INITDB_ROOT_USERNAME:?MONGO_INITDB_ROOT_USERNAME is not set}"
    : "${MONGO_INITDB_ROOT_PASSWORD:?MONGO_INITDB_ROOT_PASSWORD is not set}"
  env:
    MONGO_INITDB_ROOT_USERNAME: ${{ secrets.MONGO_INITDB_ROOT_USERNAME }}
    MONGO_INITDB_ROOT_PASSWORD: ${{ secrets.MONGO_INITDB_ROOT_PASSWORD }}
```

3. **Store all service credentials in GitHub Actions secrets** and pass them to the deploy script via `envs:`, just as `GHCR_TOKEN` is handled today.

---

## Related

- Original review issue: **P1 #4** — *MongoDB deployed without authentication in `docker-compose.yml`* (from `code-review-issues.md`)

---

*Last updated: 2026-03-28*
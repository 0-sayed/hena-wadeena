# Deployment Configuration

Infrastructure and deployment configurations for Hena Wadeena.

## Structure

- `nginx/` - Legacy nginx configuration kept for reference from the pre-Caddy deployment
  - `contabo.conf` - Historical system nginx config used before Caddy replaced it

## Usage

### Contabo VPS

Production now terminates TLS and serves traffic through the `caddy` service defined in `docker-compose.yml`.

- App server: `158.220.105.104`
- Frontend files: `/var/www/hena-wadeena/` on the VPS
- Public domains: `hena-wadeena.online`, `www.hena-wadeena.online`, `api.hena-wadeena.online`
- Config source: root [`Caddyfile`](../Caddyfile)

**Subsequent deploys** run automatically on push to `main` - the workflow:
1. Builds service images and deploys the Compose stack
2. Starts Caddy for API + frontend traffic

Frontend-only deploys (`.github/workflows/deploy-frontend.yml`):
1. Build the React app
2. Upload `apps/web/dist/` to `/var/www/hena-wadeena/`
3. Verify the Caddy container is running

The legacy nginx config is **not** used in production anymore. Do not restart system `nginx` on the VPS unless you are intentionally rolling back the Caddy migration.

## DNS

DNS is managed via **Cloudflare** (free plan). Nameservers are set in Namecheap:
- `pablo.ns.cloudflare.com`
- `reza.ns.cloudflare.com`

All DNS changes (A records, MX, TXT, etc.) must be made in the Cloudflare dashboard, not Route 53 (deleted).

SSL mode is set to **Full (strict)** — Caddy obtains and renews the origin Let's Encrypt certificates automatically.

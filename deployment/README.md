# Deployment Configuration

Infrastructure and deployment configurations for Hena Wadeena.

## Structure

- `nginx/` - Nginx configuration files for various deployment targets
  - `contabo.conf` - System nginx config for Contabo VPS (serves frontend + proxies API)

## Usage

### Contabo VPS

The frontend is deployed to Contabo VPS at `158.220.105.104` via GitHub Actions (`.github/workflows/deploy-frontend.yml`).

**Initial setup** (one-time manual step):

```bash
# Copy nginx config to server
scp deployment/nginx/contabo.conf root@158.220.105.104:/etc/nginx/sites-available/hena-wadeena

# Enable site
ssh root@158.220.105.104 "ln -sf /etc/nginx/sites-available/hena-wadeena /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"
```

**Subsequent deploys** run automatically on push to `main` - the workflow:
1. Builds the frontend
2. Uploads to `/var/www/hena-wadeena/`
3. Reloads nginx

The nginx config itself is **not** automatically deployed - update it manually when needed.

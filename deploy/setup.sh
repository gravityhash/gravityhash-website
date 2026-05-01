#!/usr/bin/env bash
# GravityHash website — one-shot VPS bootstrap (Ubuntu/Debian).
#
# What it does:
#   1. Installs Docker, docker-compose plugin, Nginx, certbot, git
#   2. Clones the repo into /opt/gravityhash-website (or pulls if present)
#   3. Creates .env from the template if missing
#   4. Builds and starts the container with `docker compose up -d --build`
#   5. Drops a Nginx site config and obtains a Let's Encrypt cert
#   6. Prints the final URLs and useful follow-up commands
#
# Usage (as root or via sudo):
#   curl -fsSL https://raw.githubusercontent.com/gravityhash/gravityhash-website/main/deploy/setup.sh \
#     | sudo DOMAIN=gravityhash.com EMAIL=hello@gravityhash.com bash
#
# Or, after cloning manually:
#   sudo DOMAIN=gravityhash.com EMAIL=hello@gravityhash.com ./deploy/setup.sh

set -euo pipefail

# ── Inputs ───────────────────────────────────────────────────────
DOMAIN="${DOMAIN:?DOMAIN must be set, e.g. DOMAIN=gravityhash.com}"
EMAIL="${EMAIL:?EMAIL must be set for Let's Encrypt, e.g. EMAIL=hello@gravityhash.com}"
REPO="${REPO:-https://github.com/gravityhash/gravityhash-website.git}"
APP_DIR="${APP_DIR:-/opt/gravityhash-website}"
APP_PORT="${APP_PORT:-3000}"
WWW_ALIAS="${WWW_ALIAS:-www.${DOMAIN}}"

log()  { printf '\033[1;35m▸\033[0m %s\n' "$*"; }
ok()   { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }

# ── Sanity ────────────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  warn "This script needs root. Re-run with sudo."
  exit 1
fi

. /etc/os-release
case "$ID" in
  ubuntu|debian) : ;;
  *) warn "Unsupported distro: $ID. Tested on Ubuntu/Debian."; exit 1 ;;
esac

# ── 1. Install prerequisites ──────────────────────────────────────
log "Installing prerequisites (Docker, Nginx, certbot, git)…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y -qq
apt-get install -y -qq curl ca-certificates gnupg git ufw nginx certbot python3-certbot-nginx >/dev/null

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi

if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y -qq docker-compose-plugin >/dev/null
fi
ok "Prerequisites installed."

# ── 2. Clone or update repo ───────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  log "Updating existing checkout at $APP_DIR…"
  git -C "$APP_DIR" pull --ff-only
else
  log "Cloning $REPO into $APP_DIR…"
  git clone "$REPO" "$APP_DIR"
fi
ok "Repo ready at $APP_DIR."

# ── 3. .env from template ────────────────────────────────────────
cd "$APP_DIR"
if [ ! -f .env ]; then
  cp .env.example .env
  warn "Created .env from .env.example."
  warn "Edit $APP_DIR/.env and fill in SMTP_* values, then re-run \`docker compose up -d --build\`."
else
  ok ".env already exists, leaving it alone."
fi

# ── 4. Bring the container up ─────────────────────────────────────
log "Building and starting the container…"
docker compose up -d --build
sleep 3
if curl -fsS "http://127.0.0.1:${APP_PORT}/healthz" >/dev/null; then
  ok "App is healthy on http://127.0.0.1:${APP_PORT}."
else
  warn "App did not respond to /healthz. Check: docker compose logs -f web"
fi

# ── 5. Nginx site + Let's Encrypt ────────────────────────────────
log "Writing Nginx site config for ${DOMAIN}…"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"
cat >"$NGINX_SITE" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_ALIAS};

    client_max_body_size 1m;
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    add_header X-Frame-Options       "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff"   always;
    add_header Referrer-Policy        "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass         http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_read_timeout 30s;
    }
}
NGINX

ln -sf "$NGINX_SITE" "/etc/nginx/sites-enabled/${DOMAIN}"
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "Nginx is serving ${DOMAIN} on port 80."

log "Requesting Let's Encrypt certificate…"
if certbot --nginx -d "$DOMAIN" -d "$WWW_ALIAS" --non-interactive --agree-tos -m "$EMAIL" --redirect; then
  ok "HTTPS is live."
else
  warn "Certbot failed. Make sure both A records ($DOMAIN, $WWW_ALIAS) point to this server, then re-run:"
  warn "  certbot --nginx -d $DOMAIN -d $WWW_ALIAS -m $EMAIL --agree-tos --redirect"
fi

# ── 6. Firewall (UFW) ─────────────────────────────────────────────
if command -v ufw >/dev/null 2>&1; then
  log "Configuring UFW…"
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  yes | ufw enable >/dev/null 2>&1 || true
  ok "Firewall: SSH + HTTP/HTTPS allowed."
fi

# ── Done ──────────────────────────────────────────────────────────
echo
ok "Deploy complete."
echo
echo "  → https://${DOMAIN}"
echo "  → https://${WWW_ALIAS}"
echo
echo "Useful commands:"
echo "  cd $APP_DIR"
echo "  docker compose logs -f web              # tail app logs"
echo "  docker compose ps                       # container status + health"
echo "  git pull && docker compose up -d --build # update to latest commit"
echo "  systemctl reload nginx                   # reload web server"
echo "  certbot renew --dry-run                  # test cert renewal"

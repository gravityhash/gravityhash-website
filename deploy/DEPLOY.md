# Deploying GravityHash to a VPS

A 10-minute guide to run the site behind Nginx + Let's Encrypt on any
Ubuntu/Debian VPS (DigitalOcean, Hetzner, Linode, EC2, etc.).

---

## 1. SSH in and install prerequisites

```bash
ssh root@<your-vps-ip>

# Docker + compose plugin
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin nginx certbot python3-certbot-nginx git

# A non-root deploy user (optional but recommended)
adduser deploy && usermod -aG docker deploy
```

## 2. Clone the repo

```bash
su - deploy
git clone https://github.com/gravityhash/gravityhash-website.git
cd gravityhash-website
cp .env.example .env
nano .env   # fill in CONTACT_TO and SMTP_* — see README.md
```

## 3. Build and start

```bash
docker compose up -d --build
docker compose ps             # should show "healthy"
curl http://127.0.0.1:3000/healthz
```

## 4. Wire up Nginx + HTTPS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/gravityhash.com
# edit hostnames inside the file, then:
sudo ln -s /etc/nginx/sites-available/gravityhash.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d gravityhash.com -d www.gravityhash.com
```

Certbot adds the SSL block and sets up auto-renewal via systemd timer.

## 5. Updating the site

```bash
cd ~/gravityhash-website
git pull
docker compose up -d --build
```

## 6. Logs &amp; troubleshooting

```bash
docker compose logs -f web              # tail app logs
docker compose ps                       # health status
docker compose restart web              # restart container
sudo tail -f /var/log/nginx/access.log  # nginx access
```

## Optional: zero-downtime auto-deploy via GitHub Actions

Add a deploy key to the VPS and push to `main` → SSH in → `git pull && docker compose up -d --build`.
Ask if you want this wired up as `.github/workflows/deploy.yml`.

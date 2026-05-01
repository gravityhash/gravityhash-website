# GravityHash Website

The official site for [GravityHash](https://gravityhash.com) — engineering
studio, makers of [Relay](https://relayon.io). Includes a working contact form
that delivers inquiries to **hello@gravityhash.com**.

Stack: vanilla HTML/CSS/JS frontend (no build step) + a small Express server
for the contact endpoint. Ships as a single Docker image — deploy to any VPS,
Render, Fly, Railway, or Kubernetes.

## Quick start

```bash
cp .env.example .env       # fill in SMTP_* values when ready
npm install
npm run dev                # auto-reloads on changes
# → http://localhost:3000
```

If `SMTP_*` vars are not set, the server logs submissions to the console and
returns a success response — useful for local development without real SMTP.

## Production — Docker (recommended)

```bash
cp .env.example .env       # fill in CONTACT_TO + SMTP_*
docker compose up -d --build
docker compose logs -f
```

The container exposes port `3000`, runs as a non-root user, and ships with a
`/healthz` healthcheck baked in. Put Nginx + Let's Encrypt in front of it for
HTTPS — see [deploy/DEPLOY.md](deploy/DEPLOY.md) for a 10-minute VPS guide.

## Production — bare Node

```bash
npm install --omit=dev
npm start
```

Set the following environment variables in your host:

| Var | Purpose |
| --- | --- |
| `CONTACT_TO` | Destination address (defaults to `hello@gravityhash.com`) |
| `SMTP_HOST` / `SMTP_PORT` | Outbound SMTP server |
| `SMTP_SECURE` | `true` for port 465, `false` otherwise |
| `SMTP_USER` / `SMTP_PASS` | Credentials |
| `SMTP_FROM` | From header (e.g. `GravityHash <postmaster@gravityhash.com>`) |
| `PORT` | HTTP port (default `3000`) |

Recommended providers: Resend SMTP, Postmark, AWS SES, Mailgun, or your
Google Workspace account via App Passwords.

## Project layout

```
.
├── public/                # static frontend (no build step)
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── assets/            # logos, favicon
├── deploy/
│   ├── DEPLOY.md          # 10-minute VPS guide
│   └── nginx.conf.example
├── server.js              # Express + nodemailer
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── package.json
├── .env.example
└── README.md
```

## Pushing to GitHub

```bash
git remote add origin https://github.com/gravityhash/gravityhash-website.git
git push -u origin main
```

## License

© GravityHash. All rights reserved.

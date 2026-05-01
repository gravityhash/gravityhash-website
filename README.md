# Relayon — GravityHash Company Website

The official marketing site for [GravityHash](https://gravityhash.com), with a
working contact form that delivers inquiries to **hello@gravityhash.com**.

Stack: vanilla HTML/CSS/JS frontend (no build step) + a small Express server
for the contact endpoint. Deploys cleanly to any Node host (Render, Fly,
Railway, a VPS, etc.).

## Quick start

```bash
cp .env.example .env       # fill in SMTP_* values when ready
npm install
npm run dev                # auto-reloads on changes
# → http://localhost:3000
```

If `SMTP_*` vars are not set, the server logs submissions to the console and
returns a success response — useful for local development without real SMTP.

## Production

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
│   └── assets/
├── server.js              # Express + nodemailer
├── package.json
├── .env.example
└── README.md
```

## Pushing to GitLab

```bash
git init
git add .
git commit -m "Initial commit — GravityHash site"
git branch -M main
git remote add origin https://gitlab.com/gravityhash-group/relayon.git
git push -u origin main
```

## License

© GravityHash. All rights reserved.

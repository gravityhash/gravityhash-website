# syntax=docker/dockerfile:1.7

# ── deps stage ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; \
    else npm install --omit=dev --no-fund --no-audit; fi

# ── runtime stage ───────────────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000

# tini for proper signal handling, curl for the healthcheck
RUN apk add --no-cache tini curl && \
    addgroup -S app && adduser -S app -G app

WORKDIR /app
COPY --chown=app:app --from=deps /app/node_modules ./node_modules
COPY --chown=app:app package.json ./
COPY --chown=app:app server.js ./
COPY --chown=app:app public ./public

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]

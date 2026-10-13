# Tredie on Google Cloud Run.
#
# Multi-stage build using Next.js "standalone" output, so the runtime image
# carries only production dependencies and the compiled server.
# Cloud Run injects PORT and requires binding 0.0.0.0.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── deps ──────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ── build ─────────────────────────────────────────────────
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runtime ───────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# SQLite lives on the runtime filesystem (writable volume on Cloud Run / Docker).
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# migrations/ is read at runtime by `npm run db:migrate`, which is how the
# Cloud Run Job (or a pre-deploy step) applies schema changes.
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/db.ts ./src/lib/db.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/migrate.ts ./src/lib/migrate.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/home').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrate first (idempotent, forward-only), then become PID 1 so Cloud Run's
# SIGTERM reaches the server for a graceful shutdown.
CMD ["sh", "-c", "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/migrate.mts && exec node server.js"]
FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json turbo.json ./

# Copy packages and dashboard
COPY packages/ ./packages/
COPY apps/dashboard/ ./apps/dashboard/

# Install dependencies
FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build
FROM deps AS builder

# No build arguments for URLs or keys. Client configuration is written at
# container start by scripts/write-runtime-config.mjs, so this image is not tied
# to the environment it was built in.

RUN pnpm --filter @ansa/types build
RUN pnpm --filter @ansa/utils build
RUN pnpm --filter @ansa/ui build
RUN pnpm --filter @ansa/dashboard build

# Next's standalone trace omits the ESM half of @swc/helpers even though the
# generated server imports it at runtime. Stage it explicitly for the runner.
RUN mkdir -p /tmp/swc-helpers && cp -R /app/node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/esm /tmp/swc-helpers/esm

# Production
FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# public/ must be writable: the entrypoint writes runtime-config.js into it.
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/public ./apps/dashboard/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/scripts/write-runtime-config.mjs ./apps/dashboard/scripts/write-runtime-config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /tmp/swc-helpers/esm /tmp/swc-helpers-esm
RUN set -eux; \
    helpers_dir="$(find /app/node_modules/.pnpm -path '*/@swc+helpers@*/node_modules/@swc/helpers' -type d -print -quit)"; \
    test -n "$helpers_dir"; \
    cp -R /tmp/swc-helpers-esm "$helpers_dir/esm"; \
    rm -rf /tmp/swc-helpers-esm
COPY --from=builder --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Resolve client configuration from the environment, then serve.
CMD ["sh", "-c", "node apps/dashboard/scripts/write-runtime-config.mjs && node apps/dashboard/server.js"]

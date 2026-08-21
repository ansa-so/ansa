FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json turbo.json ./

# Copy packages and api
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install dependencies
FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build
FROM deps AS builder
RUN pnpm --filter @ansa/types build
RUN pnpm --filter @ansa/utils build
RUN pnpm --filter @ansa/db build
RUN pnpm --filter @ansa/api build

# Production
FROM node:20-slim AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/apps/api/ ./apps/api/

# Install all deps (including dev for migrations)
RUN pnpm install --frozen-lockfile

# Set NODE_ENV after install so devDependencies are included
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]

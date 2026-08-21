FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json turbo.json ./

# Copy widget app
COPY apps/widget/ ./apps/widget/

# Copy workspace packages that widget depends on
COPY packages/types/ ./packages/types/
COPY packages/utils/ ./packages/utils/

# Install dependencies
FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build
FROM deps AS builder

ARG API_URL=http://localhost:3001
ENV API_URL=$API_URL

# Build packages in dependency order (types -> utils -> widget)
RUN pnpm --filter @ansa/types build
RUN pnpm --filter @ansa/utils build
RUN pnpm --filter @ansa/widget build

# Production - serve with nginx
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/widget/dist /usr/share/nginx/html

# Custom nginx config for SPA
RUN echo 'server { \
    listen 3002; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-store, no-cache, must-revalidate"; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3002

CMD ["nginx", "-g", "daemon off;"]

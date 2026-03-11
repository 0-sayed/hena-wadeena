# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22 AS build
WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.jsons for dependency resolution
COPY packages/types/package.json packages/types/
COPY packages/nest-common/package.json packages/nest-common/
COPY services/identity/package.json services/identity/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY tsconfig.json tsconfig.build.json ./
COPY packages/ packages/
COPY services/identity/ services/identity/

# Build packages and service
RUN pnpm --filter @hena-wadeena/types build && \
    pnpm --filter @hena-wadeena/nest-common build && \
    pnpm --filter @hena-wadeena/identity build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:22-slim
WORKDIR /app

ENV NODE_ENV=production
RUN corepack enable pnpm

# Copy workspace config for pnpm
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copy built artifacts
COPY --from=build /app/packages/types/package.json packages/types/
COPY --from=build /app/packages/types/dist packages/types/dist/
COPY --from=build /app/packages/nest-common/package.json packages/nest-common/
COPY --from=build /app/packages/nest-common/dist packages/nest-common/dist/
COPY --from=build /app/services/identity/package.json services/identity/
COPY --from=build /app/services/identity/dist services/identity/dist/

# Install production deps only
RUN pnpm install --frozen-lockfile --prod

EXPOSE 8001

HEALTHCHECK --interval=15s --timeout=10s --retries=5 \
  CMD node -e "fetch('http://localhost:8001/health').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

CMD ["node", "services/identity/dist/main.js"]

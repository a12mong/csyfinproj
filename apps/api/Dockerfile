# syntax=docker/dockerfile:1
# API (Express + Prisma/MySQL) — build from repo root:
#   docker build -f apps/api/Dockerfile .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# openssl is needed by the Prisma engines on alpine
RUN apk add --no-cache openssl && corepack enable

# ---------- build ----------
FROM base AS build
WORKDIR /repo

# Install deps first so this layer caches across source-only changes
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @csyfinproj/api...

COPY packages/shared packages/shared
COPY apps/api apps/api

# build = prisma generate && tsc  →  apps/api/dist
RUN pnpm --filter @csyfinproj/api build

# Produce a pruned, self-contained production bundle at /out
# (includes dist/, prisma/, and prod node_modules — prisma CLI included
#  so `npx prisma db push / migrate deploy` works inside the container)
RUN pnpm --filter @csyfinproj/api deploy --prod /out
WORKDIR /out
RUN npx prisma generate

# ---------- runtime ----------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=build --chown=node:node /out /app
RUN mkdir -p /app/uploads /app/secure-uploads \
    && chown -R node:node /app/uploads /app/secure-uploads

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "dist/index.js"]

# The api package has no runtime dependencies: everything it uses is in the Node
# standard library, node:sqlite included. pnpm appears only in the build stage,
# to compile the web package into static files.

# ---- build the web package -------------------------------------------------
FROM node:24-alpine AS web

RUN corepack enable
WORKDIR /build

# manifests and the lockfile first, so editing a component does not reinstall
# the toolchain on every build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/web/package.json ./packages/web/
COPY packages/api/package.json ./packages/api/
RUN pnpm install --frozen-lockfile --filter web

COPY packages/web ./packages/web
RUN pnpm --filter web build
# output lands at /build/packages/web/dist

# ---- runtime ---------------------------------------------------------------
FROM node:24-alpine AS runtime

WORKDIR /app

# The directory layout is kept identical to the repository so the api resolves
# its static root the same way it does in development: ../../web/dist.
COPY packages/api/package.json ./packages/api/
COPY packages/api/src ./packages/api/src
COPY --from=web /build/packages/web/dist ./packages/web/dist

# The database lives on a volume so price history survives a redeploy. It is
# created on first run, so the directory has to be writable by the node user.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

ENV NODE_ENV=production \
    DB_PATH=/data/hunter.db \
    PORT=8080 \
    SWEEP_MINUTES=60 \
    TZ=Europe/Rome

VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=60s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/stats" > /dev/null || exit 1

# one process serves the UI and runs the hourly sweep
CMD ["node", "--no-warnings", "packages/api/src/serve-and-sweep.mjs"]

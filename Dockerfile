# The runtime has no npm dependencies: everything the server uses is in the Node
# standard library, node:sqlite included. npm appears only in the build stage,
# to compile the Svelte frontend into static files.

# ---- build the frontend ----------------------------------------------------
FROM node:24-alpine AS ui

WORKDIR /build
# the lockfile alone first, so a source edit does not re-install the toolchain
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm --prefix frontend ci --no-audit --no-fund

COPY frontend ./frontend
RUN npm --prefix frontend run build
# vite writes to ../public, so the output lands at /build/public

# ---- runtime ---------------------------------------------------------------
FROM node:24-alpine AS runtime

# wget comes from busybox and is what HEALTHCHECK uses
WORKDIR /app

COPY package.json ./
COPY src ./src
COPY --from=ui /build/public ./public

# The database lives on a volume so price history survives a redeploy. It is
# created on first run; the directory has to be writable by the node user.
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
CMD ["node", "--no-warnings", "src/serve-and-sweep.mjs"]

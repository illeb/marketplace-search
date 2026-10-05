# Two stages. The first installs pnpm and builds both packages; the runtime
# stage keeps the compiled output plus only the api's production dependencies.

# ---- build -----------------------------------------------------------------
FROM node:24-alpine AS build

RUN corepack enable
WORKDIR /build

# manifests and the lockfile first, so editing a component does not reinstall
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile

COPY packages ./packages
RUN pnpm --filter web build && pnpm --filter api build

# Re-resolve with dev dependencies stripped. NestJS and Apollo are the runtime;
# TypeScript, Vite and Svelte are not, and they are the bulk of the install.
# --legacy: pnpm 10 otherwise refuses to deploy a workspace that does not set
# inject-workspace-packages, which this one has no reason to.
RUN pnpm --filter api --prod deploy --legacy /runtime

# ---- runtime ---------------------------------------------------------------
FROM node:24-alpine AS runtime

WORKDIR /app

COPY --from=build /runtime/node_modules ./packages/api/node_modules
COPY --from=build /runtime/package.json ./packages/api/
COPY --from=build /build/packages/api/dist ./packages/api/dist
COPY --from=build /build/packages/web/dist ./packages/web/dist

# The layout matches the repository, so config.mjs resolves its database and
# static root the same way in development and in the container.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

ENV NODE_ENV=production \
    DB_PATH=/data/hunter.db \
    PORT=8080 \
    SWEEP_MINUTES=360 \
    TZ=Europe/Rome

VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- --post-data='{"query":"{stats{live}}"}' \
      --header='content-type: application/json' \
      "http://127.0.0.1:${PORT}/graphql" > /dev/null || exit 1

# one process serves the UI, the GraphQL API and the hourly sweep
CMD ["node", "--no-warnings", "packages/api/dist/main.js"]

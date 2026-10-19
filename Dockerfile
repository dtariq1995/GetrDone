# One image for the whole app: the Nest API also serves the built React app.

# ---- Stage 1: install everything and build both apps ----
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Package manifests first, so Docker reuses the cached `npm ci` layer until
# a dependency actually changes.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# The API's postinstall runs `prisma generate`, which needs the schema.
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
RUN npm ci

COPY . .
RUN npm run build
# Remove dev-only packages (compilers, test tools) before the final stage.
RUN npm prune --omit=dev

# ---- Stage 2: only what the server needs to run ----
FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/node_modules apps/api/node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts apps/api/
COPY --from=build /app/apps/web/dist apps/web/dist

WORKDIR /app/apps/api
# Don't run as root inside the container.
USER node
EXPOSE 3000

# On every start: apply any new migrations, make sure the demo account
# exists (the seed skips it if it does), then start the server.
CMD ["sh", "-c", "npx --no prisma migrate deploy && node dist/seed && node dist/main"]

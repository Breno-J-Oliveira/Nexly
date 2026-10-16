# syntax=docker/dockerfile:1
# Build context: raiz do monorepo (nexly/)
FROM node:24.18.0-alpine AS base
RUN apk add --no-cache gcompat openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS runtime-deps
RUN npm prune --omit=dev --workspace @nexly/api --include-workspace-root=false
RUN mkdir -p apps/api/node_modules

FROM base AS development
COPY --from=deps /app/ ./
COPY --chown=node:node . .
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace @nexly/shared
EXPOSE 3001
USER node
CMD ["npm", "run", "start:dev", "--workspace", "@nexly/api"]

FROM base AS build
COPY --from=deps /app/ ./
COPY . .
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace @nexly/shared
RUN npm run build --workspace @nexly/api

FROM base AS production
ENV NODE_ENV=production
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=runtime-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
USER node
EXPOSE 3001
CMD ["sh", "-c", "npm exec --offline --workspace @nexly/api -- prisma migrate deploy --schema prisma/schema.prisma && exec node apps/api/dist/src/main.js"]

# syntax=docker/dockerfile:1
# Build context: raiz do monorepo (nexly/)
FROM node:24.18.0-alpine AS base
RUN apk add --no-cache gcompat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM deps AS runtime-deps
RUN npm prune --omit=dev --workspace @nexly/web --include-workspace-root=false
RUN mkdir -p apps/web/node_modules

FROM base AS development
COPY --from=deps /app/ ./
COPY --chown=node:node . .
RUN npm run build --workspace @nexly/shared
EXPOSE 3000
USER node
CMD ["npm", "exec", "--workspace", "@nexly/web", "--", "next", "dev", "-p", "3000"]

FROM base AS build
COPY --from=deps /app/ ./
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build --workspace @nexly/shared
RUN npm run build --workspace @nexly/web

FROM base AS production
ENV NODE_ENV=production
COPY --from=runtime-deps /app/node_modules ./node_modules
COPY --from=runtime-deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --chown=node:node --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY --from=build /app/apps/web/content ./apps/web/content
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@nexly/web"]

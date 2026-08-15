# syntax=docker/dockerfile:1
# Build context: raiz do monorepo (nexly/)
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm install

FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
EXPOSE 3001
CMD ["npm", "run", "start:dev", "--workspace", "@nexly/api"]

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace @nexly/api

FROM base AS production
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]

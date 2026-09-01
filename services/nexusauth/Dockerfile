# ---- Build stage ----
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- Production stage ----
# WARNING: In production with multiple replicas, RS256 keys MUST be mounted
# via a persistent volume or Docker/k8s secret. Do NOT rely on the ad-hoc
# key generation below — each replica would generate different keys,
# breaking JWT verification across instances.
FROM node:20-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/keys && chown node:node /app/keys

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=10s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# SECURITY: Keys MUST be mounted as a volume in production. The generate-keys
# fallback is for local development only. In production, this will log an error
# and the app will exit (see jwt.service.ts constructor).
CMD ["sh", "-c", "\
  if [ ! -f /app/keys/private.pem ]; then \
    echo '[WARNING] No RSA keys found at /app/keys. Generating ephemeral keys for development only.'; \
    echo '[WARNING] In production, mount persistent keys via Docker volume or k8s secret.'; \
    openssl genrsa -out /app/keys/private.pem 2048 && \
    openssl rsa -in /app/keys/private.pem -pubout -out /app/keys/public.pem; \
  fi && \
  npx prisma migrate deploy && \
  node dist/main"]

# Stage 1: build deps only (avoid any Prisma generate/write at runtime)
FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY test ./test
COPY nest-cli.json tsconfig*.json ./

# Prepare runtime keys (copied to final stage)
RUN mkdir -p /app/keys

# Stage 2: runtime/test
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/package-lock.json /app/package-lock.json
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/prisma /app/prisma
COPY --from=build /app/src /app/src
COPY --from=build /app/test /app/test
COPY --from=build /app/nest-cli.json /app/nest-cli.json
COPY --from=build /app/tsconfig*.json /app/

# Prepare runtime keys
RUN mkdir -p /app/keys

USER node

CMD sh -c '\
  if [ ! -f /app/keys/private.pem ]; then \
    openssl genrsa -out /app/keys/private.pem 2048 && \
    openssl rsa -in /app/keys/private.pem -pubout -out /app/keys/public.pem ; \
  fi ; \
  npx prisma migrate deploy ; \
  chown -R node:node /app/keys ; \
  su node -s /bin/sh -c "npm run test:e2e" \
'

FROM node:20-alpine

# C31 FIX: Run as non-root user. Compromised container processes
# should never have root privileges on the host.
RUN addgroup -g 1001 -S nodegroup && \
    adduser -S -u 1001 -G nodegroup nodeuser

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

# C36 FIX: Sanitize stack traces in test-app responses.
# err.message must not leak internal details to API consumers.
ENV NODE_ENV=production

EXPOSE 4000

USER nodeuser

CMD ["node", "server.js"]

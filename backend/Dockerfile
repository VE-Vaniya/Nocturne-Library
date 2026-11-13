# syntax=docker/dockerfile:1
# Nocturne Library API (Express 5 + Mongoose 9)
# Build context: ./backend   ->   docker build -t nocturne-backend ./backend


# ---- deps: production dependencies only ------------------------------------
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force

# ---- runtime ---------------------------------------------------------------
FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS runtime
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

# The server never runs npm, and npm's own bundled dependencies are the only
# HIGH/CRITICAL findings Trivy reports for this image, so drop npm, npx and
# corepack from the runtime stage.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# Dependencies and source are owned by root and only readable by the runtime
# user, so a compromised process cannot rewrite the app. .dockerignore keeps
# .env*, node_modules, logs, etc. out of the context.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER node
EXPOSE 5000

# /health returns 200 only when MongoDB is connected (503 otherwise).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]

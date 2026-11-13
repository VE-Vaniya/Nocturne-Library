# syntax=docker/dockerfile:1
# Nocturne Library API (Express 5 + Mongoose 9)
# Build context: ./backend   ->   docker build -t nocturne-backend ./backend

ARG NODE_IMAGE=node:22.23.5-alpine3.24@sha256:12f54cafa58d0e96554ae05871e29663ff7241836377dc9a7916449b8adb062c

# ---- deps: production dependencies only ------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund \
 && npm cache clean --force

# ---- runtime ---------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=5000
WORKDIR /app

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

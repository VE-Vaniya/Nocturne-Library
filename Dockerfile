# syntax=docker/dockerfile:1
# Nocturne Library SPA (React 19 + Vite 7) served by unprivileged nginx.
# Build context: repo root   ->   docker build -t nocturne-frontend .

# ---- build -----------------------------------------------------------------
FROM node:26.13.1-alpine3.24@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
# Baked in at build time. Default '/api' = same origin; nginx (local) or the
# ALB (AWS) routes /api/* to the backend.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---- runtime ---------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.31.7-alpine3.24@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e AS runtime
# Upstream for /api/ (rendered into conf.d/default.conf by the image's
# envsubst entrypoint from /etc/nginx/templates/*.template at start-up).
ENV BACKEND_URL=http://backend:5000

# The upstream nginx image lags behind Alpine security fixes (musl, zlib,
# curl, expat...), which Trivy flags as HIGH/CRITICAL. Apply the patched
# packages at build time; the image still runs as the unprivileged user below.
USER root
# hadolint ignore=DL3017
RUN apk upgrade --no-cache libxml2 && apk upgrade --no-cache
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]

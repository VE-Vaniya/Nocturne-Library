# syntax=docker/dockerfile:1
# Nocturne Library SPA (React 19 + Vite 7) served by unprivileged nginx.
# Build context: repo root   ->   docker build -t nocturne-frontend .

# ---- build -----------------------------------------------------------------
FROM node:22.23.5-alpine3.24@sha256:12f54cafa58d0e96554ae05871e29663ff7241836377dc9a7916449b8adb062c AS build
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
FROM nginxinc/nginx-unprivileged:1.30.6-alpine3.24@sha256:e2a8fca8aa356d66159aaf8a877a9c126773635adf210503eefaaeaffeed6ad7 AS runtime
# Upstream for /api/ (rendered into conf.d/default.conf by the image's
# envsubst entrypoint from /etc/nginx/templates/*.template at start-up).
ENV BACKEND_URL=http://backend:5000
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]

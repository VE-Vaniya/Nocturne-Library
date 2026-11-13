# Local development with Docker

The whole stack (React SPA on nginx, Express API, MongoDB) runs with Docker
Compose. You do not need an Atlas account or a local Node install.

## Prerequisites

- Docker Desktop (or Docker Engine) with Compose v2.24 or newer (`docker compose version`).
- Ports 8080 and 5000 free on the host.

## First run

```sh
# Optional: email (password reset / notifications) and Google Books keys.
cp backend/.env.example backend/.env.local
#   then edit backend/.env.local; delete the lines you don't need to override
#   (MONGODB_URI in particular: leave it out to use the compose MongoDB).

docker compose up --build
```

Without `backend/.env.local` the stack still starts: `backend/compose.env`
contains non-secret local defaults (compose MongoDB, a dev-only JWT secret,
CORS for localhost). Values in `backend/.env.local` override it. Both
`.env.local` and any other `.env*` file are git-ignored and excluded from
image builds by `.dockerignore`. Only `.env.example` is tracked.

Start order is enforced by health checks: `mongo` healthy, then `backend`
(`GET /health` returns 200 once the DB is connected), then `frontend`.

## URLs

| What                                            | URL                              |
| ----------------------------------------------- | -------------------------------- |
| App (SPA)                                       | http://localhost:8080            |
| API via the nginx proxy (what the browser uses) | http://localhost:8080/api/...    |
| Backend health via the proxy                    | http://localhost:8080/api/health |
| Frontend container health                       | http://localhost:8080/health     |
| API directly (debugging, bound to 127.0.0.1)    | http://localhost:5000/health     |

MongoDB is not published to the host. To inspect it, run:
`docker compose exec mongo mongosh nocturnelibrary`

The frontend is built with `VITE_API_URL=/api`, so the browser always calls
the same origin. nginx forwards `/api/*` to `http://backend:5000` with the path
unchanged. On AWS the ALB does the same: `/api/*` goes to the backend target
group and `/*` to the frontend.

## Seeding

`backend/seed.js` only needs `MONGODB_URI`, which the container already has.
It upserts a system user, a welcome book and a sample quote, so you can run it
more than once.

```sh
docker compose exec backend node seed.js
```

## Everyday commands

```sh
docker compose up --build -d     # rebuild after code changes, run detached
docker compose logs -f backend   # follow API logs
docker compose ps                # health status of each service
docker compose down              # stop (keeps the database volume)
docker compose down -v           # stop and wipe the local database
```

The images are production builds with no hot reload. For fast UI work, run
`npm run dev` (Vite on :5173) on the host and keep the API and DB in Docker
with `docker compose up mongo backend`. Then point Vite at the API, either with
`VITE_API_URL=http://localhost:5000/api npm run dev` or with a Vite proxy.
`http://localhost:5173` is already in the default `CORS_ORIGINS`.

## Using MongoDB Atlas instead of the local container

Put your Atlas connection string in `backend/.env.local`:

```sh
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/nocturnelibrary?retryWrites=true&w=majority
```

Then start only the app services, so the local `mongo` container is skipped:

```sh
docker compose up --build --no-deps backend frontend
```

Atlas must allow your IP address (Network Access). Seeding works the same way
and writes to Atlas.

## Production (EC2 + ECR)

`docker-compose.prod.yml` is an override that disables the `mongo` service,
removes the `build:` sections and `compose.env`, uses ECR images, and requires
secrets from the environment:

```sh
export ECR_REGISTRY=<account>.dkr.ecr.<region>.amazonaws.com IMAGE_TAG=<git-sha>
docker compose --env-file /etc/nocturne/prod.env \
  -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build
```

Required: `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS`. Optional: `EMAIL_USER`,
`EMAIL_PASS`, `GOOGLE_BOOKS_API_KEY`. Building the images for ECR:

```sh
docker build -t $ECR_REGISTRY/nocturne-backend:$IMAGE_TAG ./backend
docker build -t $ECR_REGISTRY/nocturne-frontend:$IMAGE_TAG --build-arg VITE_API_URL=/api .
```

## Local test account

The local `mongo` container (not Atlas) has one throwaway account, created for UI testing:

| Email               | Password            |
| ------------------- | ------------------- |
| `ada@nocturne.test` | `local-test-pass-1` |

It only exists in your local Docker volume. `docker compose down -v` deletes it.

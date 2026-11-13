# The Cozy Nook – Aesthetic Reading Journal

## Introduction

The Cozy Nook is an aesthetic digital reading journal designed to help readers document their reading experiences, track progress, and capture memorable quotes while maintaining a cozy and visually pleasing interface. The platform allows users to manage their personal reading library, monitor reading sessions, and record emotional connections with books through mood tags.

This web application primarily targets book lovers, students, and casual readers who want a visually appealing and organized way to track their reading journey and maintain motivation to read regularly.

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 19 | UI framework |
| Frontend | Vite 7 | Dev server and production build |
| Frontend | Plain CSS (`src/**/*.css`) | Styling (no CSS framework) |
| Frontend | Axios | HTTP client for the backend API |
| Backend | Node.js (>= 22) | Runtime |
| Backend | Express 5 | REST API (`/api/*`) |
| Backend | MongoDB + Mongoose 9 | Persistence (users, books, quotes, missives, notifications) |
| Backend | JSON Web Tokens + bcryptjs | Authentication and password hashing |
| Backend | Nodemailer | Email notifications over SMTP |
| External | Google Books API | Book search (called from the backend) |
| External | Spotify embed (iframe) | Ambient playlist on the reading timer page (embed only; no Spotify API integration) |

## Features

### Core Functionalities

- **Book Search** - Search for books (via Google Books) to add to your library
- **Digital Bookshelf Dashboard** - Visual bookshelf displaying all books as cover images
- **Mood Tagging System** - Assign mood tags (cozy, dark academia, light academia, etc.) to track emotional reading experiences
- **Reading Session Tracker** - Timer interface to track reading duration
- **Quote Collection Module** - Save favorite quotes with page numbers during or after reading sessions
- **Ambient Reading Environment** - Embedded Spotify playlist for background music (a deeper Spotify API integration is planned, not implemented)
- **Automatic Progress Saving** - Auto-saves reading progress when updating current page or stopping timer
- **Quote Gallery** - Browse and revisit all saved quotes from reading journey
- **Missives and Notifications** - Share quotes with people in your reading circle and get notified (in-app and by email)

## Objectives

- Provide a personalized digital reading journal for organized reading activity tracking
- Enhance reading experience through quotes, session tracking, and progress monitoring
- Create an aesthetically pleasing interface that encourages consistent reading habits
- Share quotes with people in your reading circle via the application
- Store and manage reading data efficiently using a database for books, quotes, moods, and progress

## Team

The project is developed by a team of 5. Fill in names, GitHub handles and roles.

| Name | GitHub | Role / area |
|------|--------|-------------|
| _TBD_ | @_TBD_ | _e.g. Frontend_ |
| _TBD_ | @_TBD_ | _e.g. Backend_ |
| _TBD_ | @_TBD_ | _e.g. CI / security_ |
| _TBD_ | @_TBD_ | _e.g. Containers / delivery_ |
| _TBD_ | @_TBD_ | _e.g. Infrastructure / monitoring_ |

## Repository Layout

```
.
├── index.html            # Vite entry HTML
├── src/                  # React frontend
│   ├── components/       # Feature components (Dashboard, Library, ReadingTimer, ...)
│   ├── services/api.js   # Axios client for the backend API
│   └── main.jsx, App.jsx
├── public/               # Static assets served as-is
├── backend/              # Express + Mongoose API
│   ├── server.js         # App entry point
│   ├── config/           # DB connection
│   ├── controllers/      # Route handlers
│   ├── models/           # Mongoose schemas
│   ├── routes/           # Express routers mounted under /api
│   ├── middleware/       # Auth middleware (JWT)
│   ├── services/         # Email service
│   └── seed.js           # Sample data seeder
├── docs/                 # Architecture and local-dev documentation
├── .github/              # CODEOWNERS, Dependabot, PR template, workflows
├── vite.config.js
└── eslint.config.js
```

## Running Locally

See [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md).

## Deploying

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tearing Down

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Branching Strategy

We use **trunk-based development**.

- **`main` is the trunk** and is protected: no direct pushes, no force pushes.
- All work happens on **short-lived branches** (aim for less than a few days) cut from `main`:
  - `feature/<short-description>` – new functionality
  - `fix/<short-description>` – bug fixes
  - `chore/<short-description>` – tooling, dependencies, maintenance
  - `docs/<short-description>` – documentation only

  Use lowercase kebab-case, optionally prefixed with an issue number, e.g. `feature/42-quote-sharing`.
- Changes reach `main` only through a **pull request** that has:
  - at least **1 approving review** from another group member (CODEOWNERS are requested automatically), and
  - **all CI checks green**.
- PRs are **squash-merged**; the squash commit title must follow the commit convention below. Delete the branch after merging.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<optional scope>): <summary>`, where type is one of `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `build`, `perf`. Examples:
  - `feat(timer): auto-save progress when the timer stops`
  - `fix(backend): reject expired JWTs`
  - `ci: add npm audit job`

> **Note:** the repository's default branch is currently `master`. A repository admin must rename it to `main` in GitHub (Settings → General → Default branch) and then configure branch protection for `main` as described above. After the rename, update local clones with:
>
> ```sh
> git branch -m master main
> git fetch origin
> git branch -u origin/main main
> git remote set-head origin -a
> ```

## Contributing Workflow

1. Pick or open an issue describing the change.
2. Update your local trunk: `git switch main && git pull`.
3. Create a branch: `git switch -c feature/<short-description>`.
4. Make small, focused commits using Conventional Commits.
5. Run checks locally before pushing:
   - `npm ci && npm run lint && npm run build` (frontend)
   - `cd backend && npm ci` (and the backend tests once they exist)
6. Push the branch and open a pull request against `main`, filling in the PR template (link the issue, tick the checklist).
7. Address review feedback; keep the branch up to date with `main` (rebase or merge).
8. Once approved and CI is green, squash-merge and delete the branch.

Never commit secrets (`.env` files, API keys, SMTP credentials). Use `backend/.env.example` as the template for local configuration.

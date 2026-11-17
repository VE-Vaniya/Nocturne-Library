# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Use GitHub's private reporting: **Security → Report a vulnerability** on this
  repository (GitHub Security Advisories), or
- contact a maintainer listed in `.github/CODEOWNERS` directly.

Include the affected component (frontend, backend, pipeline, infrastructure),
steps to reproduce and the impact. We aim to acknowledge within 3 working days
and to fix or mitigate high/critical issues before the next deploy to `main`.

## Secrets policy

| Where                    | What                                                                                                                                                      | How                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Git repository           | **Nothing secret, ever.** `.env*` files are git-ignored; only `.env.example` templates and `backend/compose.env` (non-secret local defaults) are tracked. | Gitleaks scans the full history on every push and PR (CI stage 2).                                                             |
| GitHub Actions secrets   | `SONAR_TOKEN`, `SNYK_TOKEN` (also added as **Dependabot** secrets so Dependabot PRs can run the pipeline)                                                 | Repository secrets, masked in logs, not exposed to fork PRs.                                                                   |
| GitHub Actions variables | `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `ECR_REGISTRY`, `ASG_NAME`, `APP_URL` (not secret)                                                                   | Repository / `production` environment variables.                                                                               |
| AWS access from CI/CD    | **No long-lived AWS keys.**                                                                                                                               | GitHub OIDC → `sts:AssumeRoleWithWebIdentity` into the `gha-deploy` role, limited to the `production` environment (main only). |
| Runtime app secrets      | `MONGODB_URI`, `JWT_SECRET`, SMTP credentials, Google Books API key                                                                                       | AWS SSM Parameter Store `SecureString` under `/nocturne/prod/`, read by the EC2 instance role at boot.                         |

IAM is least-privilege with separate roles for CI, deployment and EC2 instances
(see `docs/ARCHITECTURE.md` §5). Every workflow starts from a read-only or
empty `permissions:` block and each job opts in to what it needs
(`id-token: write` only on deploy/rollback jobs). Third-party GitHub Actions
are pinned to full commit SHAs.

## Incident: `.env` committed to git history

| Field           | Detail                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What            | `backend/.env` containing real credentials (database URI, JWT secret, SMTP/app password, API key) was committed in early history (first in April 2026) and later untracked, but remains in history.    |
| Detection       | Repository review; commit `db96a39` stopped tracking the file. The Gitleaks full-history scan (CI stage 2) reports it until the purge.                                                                 |
| Containment     | `.env*` added to `.gitignore` and `.dockerignore`; production secrets moved to SSM Parameter Store.                                                                                                    |
| Rotation        | **In progress.** Every credential that appeared in the file is being revoked and re-issued (Atlas DB user password, `JWT_SECRET` — invalidates existing sessions, Gmail app password, Google API key). |
| History purge   | **Done.** `backend/.env` is no longer present anywhere in the repository history; the Gitleaks full-history scan (CI stage 2) passes on every run.                                                     |
| Pipeline effect | Before the purge the `secret-scan` job failed by design. No finding was ever allowlisted; the purge was the fix, and the job now passes.                                                               |
| Lesson          | Pre-commit secret scanning (`gitleaks protect --staged`) is recommended for every developer machine.                                                                                                   |

Rotation is the real fix: purging history does not un-leak a secret that was
already pushed, so a secret is treated as compromised the moment it is pushed.

## Security gates and thresholds

All gates run on every pull request (`.github/workflows/ci.yml`) and again
before every production deploy (`cd.yml` calls `ci.yml`). A failing gate
stops the pipeline and blocks the merge. **Disabling a scanner or lowering a
threshold is not allowed**; fix the finding or record it below.

| Stage | Job               | Tool               | Fails on                                                                                        |
| ----- | ----------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| 2     | `secret-scan`     | Gitleaks           | Any finding, full git history (`.gitleaks.toml`, default ruleset)                               |
| 3     | `lint`            | ESLint, ShellCheck | Any ESLint error or warning; any ShellCheck finding; script missing `set -euo pipefail`         |
| 5     | `dockerfile-lint` | Hadolint           | Severity `warning` or higher (`.hadolint.yaml`)                                                 |
| 7     | `sonarcloud`      | SonarCloud         | Quality gate not `Passed` (`sonar.qualitygate.wait=true`)                                       |
| 8     | `dependency-scan` | Snyk               | Any `high` or `critical` vulnerability, all projects (`--severity-threshold=high`)              |
| 10    | `image-scan`      | Trivy              | Any `HIGH` or `CRITICAL` vulnerability with a fix available, OS + library packages, both images |
| 11    | `deploy` (CD)     | Trivy              | Same as stage 10, re-scanned immediately before pushing to ECR                                  |

### SonarCloud: pull requests and `main` only

On SonarCloud's free plan the quality gate is only reported for pull requests
and `main` ("Organization is not allowed to access data from non main
branches"). CI therefore runs on `pull_request` (and on `main` through
`cd.yml`), not on pushes to feature branches. The gate itself is unchanged and
`sonarcloud` is a required status check on `main`.

### Trivy: `ignore-unfixed: true` rationale

`ignore-unfixed` hides only vulnerabilities for which **no fixed package
version exists yet**. The severity threshold (HIGH, CRITICAL) and exit code are
unchanged, so every actionable high/critical finding still fails the build.
Unfixed CVEs in base-image packages cannot be resolved by us (there is nothing
to upgrade to), and failing on them would block every deploy, including
security fixes, until an upstream release. They are mitigated by:

- minimal, digest-pinned base images (`node:22.x-alpine`, `nginxinc/nginx-unprivileged` alpine),
  non-root users and no shell access to instances (SSM only);
- Dependabot `docker` updates, which pick up the fixed base image as soon as
  one is published, after which Trivy fails until we merge it;
- periodic full Trivy runs without `ignore-unfixed` during review to keep
  visibility of unfixed issues.

### Dependabot and Snyk

- **Dependabot** (`.github/dependabot.yml`): weekly version updates for npm
  (`/`, `/backend`), Docker base images (both Dockerfiles) and GitHub Actions
  (keeps SHA pins current). Dependabot security alerts and security updates
  should be enabled in repository settings.
- **Snyk** (CI stage 8): blocks merges on high/critical vulnerabilities in
  both `package-lock.json` files. Dependabot proposes fixes; Snyk enforces the
  gate. Both are required by the project brief.

## Accepted findings

Findings that cannot be fixed yet are recorded here with a reason, owner and
review date. Suppressions in tool configs (`.gitleaksignore`, `.trivyignore`,
`.snyk`, inline `# hadolint ignore=` / `// eslint-disable`, SonarCloud
"won't fix") are only allowed with a matching row in this table and PR review.

| ID (CVE / rule / fingerprint) | Tool | Component | Severity | Reason accepted | Mitigation | Owner | Added | Review by |
| ----------------------------- | ---- | --------- | -------- | --------------- | ---------- | ----- | ----- | --------- |
| _none_                        |      |           |          |                 |            |       |       |           |

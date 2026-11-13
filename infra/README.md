# Nocturne Library – infrastructure scripts

Idempotent **AWS CLI v2 + bash** scripts that build the production environment described in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (ap-south-1, VPC 10.20.0.0/16, ALB → ASG in private subnets, one NAT, SSM, CloudWatch). The brief allows console or CLI as long as every choice is documented so it can be rebuilt; these scripts _are_ that documentation — every value lives in [`config.env`](config.env) and every policy in [`policies/`](policies/).

End-to-end walkthrough (Atlas, GitHub settings, first image push, CD): [`docs/DEPLOY.md`](../docs/DEPLOY.md). Operations and failure drills: [`docs/RUNBOOK.md`](../docs/RUNBOOK.md).

## Prerequisites

| Need                                                                                                                                                                                          | Why                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| AWS CLI **v2** (`aws --version` → `aws-cli/2.x`)                                                                                                                                              | all scripts                                                                                                         |
| bash **≥ 4.4** (Linux, WSL, Git Bash; macOS: `brew install bash`), coreutils, `curl`, `base64`, `sha256sum` or `shasum`                                                                       | `mapfile`, `inherit_errexit`                                                                                        |
| An **admin** IAM Identity Center (SSO) profile, used _only_ to build/tear down infra: `aws configure sso --profile nocturne-admin`, then `export AWS_PROFILE=nocturne-admin && aws sso login` | creates IAM roles, VPC, etc. Day-to-day deploys use the GitHub OIDC role `gha-deploy` – no long-lived keys anywhere |
| Docker (for the first manual image push)                                                                                                                                                      | `docs/DEPLOY.md` step 6                                                                                             |

No script ever reads AWS keys from files in the repo, and no secret is written to disk on your machine.

## Conventions

- `set -Eeuo pipefail`, `inherit_errexit`, `IFS=$'\n\t'`, `usage()` on `-h`, timestamped logs on stderr, ShellCheck-clean.
- **Describe before create**: every resource is looked up by its `Name` tag (+ `Project=nocturne`) or unique name; existing resources are reconciled (health checks, policies, route targets…) instead of duplicated. Re-running any script is safe.
- Every resource is tagged `Project=nocturne`, `Environment=prod`, `Name=<name>` (use Cost Explorer → _Tag: Project_ to see the bill).
- Templates use `__TOKEN__` placeholders rendered from `config.env` (`lib/common.sh: render_template`), so the JSON in `policies/`, `dashboard.json` and `cloudwatch-agent.json` stays reviewable and valid.
- Override anything per run: `INSTANCE_TYPE=t3.small ./infra/50-compute.sh`.

## Run order

```bash
export AWS_PROFILE=nocturne-admin AWS_REGION=ap-south-1
export BUDGET_EMAIL=team@example.com            # budget + SNS alarm emails
./infra/00-bootstrap.sh                          # prompts (hidden) for MONGODB_URI, JWT_SECRET, optional EMAIL_*, GOOGLE_BOOKS_API_KEY
./infra/10-network.sh                            # prints the NAT EIP -> add to Atlas access list
./infra/20-iam.sh                                # prints role ARNs -> GitHub variables
./infra/30-security-groups.sh
./infra/40-alb.sh                                # prints the live URL; seeds /nocturne/prod/CORS_ORIGINS
#   push the first images + set /nocturne/prod/image_tag (docs/DEPLOY.md step 6)
./infra/50-compute.sh --wait                     # launch template + ASG; waits for healthy targets
./infra/60-observability.sh                      # log groups, dashboard, alarms
scripts/smoke-test.sh "http://<alb-dns>"
```

Wall-clock for the scripts ≈ **15–20 min** (NAT gateway ~2 min, ALB ~3 min, first instances ~4–5 min). Including Atlas setup and the first image build/push, plan **~1 hour** the first time.

## What each script creates

| Script                  | Creates / reconciles                                                                                                                                                                                      | Key settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `00-bootstrap.sh`       | ECR `nocturne-frontend`, `nocturne-backend`; SSM `/nocturne/prod/*`; S3 `nocturne-config-<acct>-<region>`, `nocturne-backups-<acct>-<region>`; SNS `nocturne-alerts` + email; Budget `nocturne-monthly`   | ECR **tag immutability**, scan on push, AES256, lifecycle (untagged > 3 days expire, keep newest 20). Secrets are **SecureString**, values from env or hidden prompt (`--rotate NAME` to change). `image_tag`/`previous_image_tag` are String, initialised to `unset`. Buckets: public access blocked, SSE-S3, TLS-only policy; config bucket versioned; backups expire after 30 days. Budget 60 USD/month, emails at 50/80/100 % actual + 100 % forecast                                                                                                                                                     |
| `10-network.sh`         | VPC, IGW, subnets `nocturne-public-a/b` (10.20.0.0/24, 10.20.1.0/24), `nocturne-private-app-a/b` (10.20.10.0/24, 10.20.11.0/24), EIP, NAT `nocturne-nat-a` in public-a, route tables, S3 gateway endpoint | DNS support + hostnames on; no auto-assigned public IPs; `rt-public` 0/0 → IGW; `rt-private-a` **and** `-b` 0/0 → the single NAT (cost trade-off; a full AZ-a outage is not covered – see ARCHITECTURE §2); S3 endpoint on both private RTs (ECR layers bypass NAT). Prints the NAT EIP                                                                                                                                                                                                                                                                                                                       |
| `20-iam.sh`             | OIDC provider `token.actions.githubusercontent.com`; roles `gha-ci`, `gha-deploy`, `nocturne-ec2`; instance profile `nocturne-ec2`                                                                        | Trust: `gha-ci` = `repo:VE-Vaniya/Nocturne-Library:*`; `gha-deploy` = `repo:VE-Vaniya/Nocturne-Library:environment:production` (`StringEquals` on `sub` **and** `aud=sts.amazonaws.com`). Inline least-privilege policies from `policies/*.json`, ARN-scoped (two ECR repos, `image_tag`/`previous_image_tag` params, the ASG, config-bucket `compose/*`). EC2 role also gets `AmazonSSMManagedInstanceCore` + `CloudWatchAgentServerPolicy`                                                                                                                                                                  |
| `30-security-groups.sh` | `nocturne-sg-alb`, `nocturne-sg-app`                                                                                                                                                                      | ALB in 80/443 from anywhere, out only 8080/5000 → app SG. App in 8080/5000 **only from the ALB SG**, **no 22**; out 443, 27017 (Atlas), 465 (SMTPS); default allow-all egress removed. Fails if anyone opened port 22                                                                                                                                                                                                                                                                                                                                                                                         |
| `40-alb.sh`             | ALB `nocturne-alb`, TGs `nocturne-tg-web` (8080) and `nocturne-tg-api` (5000), HTTP :80 listener, rule p10 `/api/*` → api                                                                                 | Health `GET /health` on both (API liveness, never the DB), interval 10 s, timeout 5 s, 2/2 thresholds, matcher 200, **deregistration delay 30 s**, no stickiness, drop invalid headers. `ACM_CERT_ARN=… ./infra/40-alb.sh` adds HTTPS :443 (TLS 1.3 policy) and turns :80 into a 301 redirect                                                                                                                                                                                                                                                                                                                 |
| `50-compute.sh`         | uploads compose files + CW agent config + ops scripts to the config bucket; launch template `nocturne-lt`; ASG `nocturne-asg`; target tracking policy                                                     | AMI = `resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64` (latest AL2023 at every launch), **t3.micro** (standard credits), **IMDSv2 required**, hop limit 1, encrypted 8 GiB gp3, no key pair, user data from `user-data.sh`. ASG min/desired/max **2/2/4** across both private subnets, attached to both TGs, **ELB health checks, grace 120 s**, default warm-up 120 s, 1-min group metrics. Target tracking **CPU 50 %** (or `SCALING_METRIC=requests`). New LT version only when the rendered data changes; `--refresh` rolls instances (MinHealthy 50 %, warm-up 120 s) |
| `60-observability.sh`   | log groups `/nocturne/prod/containers`, `/nocturne/prod/bootstrap` (14-day retention); metric filter → `Nocturne/DbConnectionErrors`; dashboard `nocturne-prod`; 5 alarms → SNS                           | Dashboard: request rate, 4xx/5xx + 5xx %, latency p50/p95/p99, healthy/unhealthy hosts, ASG instances, CPU + memory, DB errors, alarm status, Logs Insights tables. Alarms: `nocturne-alb-5xx-rate` (> 5 %), `nocturne-tg-web/api-unhealthy-hosts` (> 0), `nocturne-asg-high-cpu` (> 80 %), `nocturne-db-connection-errors` (≥ 5 / 5 min)                                                                                                                                                                                                                                                                     |
| `90-pause.sh`           | –                                                                                                                                                                                                         | `pause` = ASG to 0 + delete NAT (EIP kept); `resume` = recreate NAT + ASG 2/2/4; `status`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `99-teardown.sh`        | –                                                                                                                                                                                                         | Reverse order; requires `--yes`. `--all` also deletes ECR images, SSM params, buckets, logs, SNS, budget. `--keep-eip` keeps the Atlas-allowlisted IP                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Instance boot (`user-data.sh`)

1. `dnf install docker amazon-cloudwatch-agent`; docker compose plugin **v2.32.4** downloaded from GitHub releases and **sha256-verified** (AL2023 has no compose package).
2. Downloads `docker-compose.yml` + `docker-compose.prod.yml` from `s3://nocturne-config-…/compose/` via the S3 endpoint. **Decision: S3, not a user-data heredoc** – the compose files stay single-sourced in the repo, `scripts/deploy.sh` re-uploads them on every deploy (when `CONFIG_BUCKET` is set), and the launch template does not need a new version for compose changes.
3. Starts the CloudWatch agent with the rendered `cloudwatch-agent.json` (docker json logs → `/nocturne/prod/containers`, one stream per instance, compose service name in `attrs` via the docker daemon `labels` log option; user-data/cloud-init logs → `/nocturne/prod/bootstrap`; `mem_used_percent`, swap and disk metrics aggregated by ASG).
4. `aws ssm get-parameters-by-path /nocturne/prod --with-decryption` → `/opt/nocturne/.env` (**root:root 0600**, written atomically; values single-quoted so `$` in passwords is literal). Fails fast if `MONGODB_URI`, `JWT_SECRET` or `CORS_ORIGINS` is missing, or `image_tag` is still `unset`.
5. ECR login, `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file /opt/nocturne/.env pull && up -d --no-build`, then waits for `:8080/health` and `:5000/health` (readiness `/api/health` is logged, not fatal).

On an instance (Session Manager): `sudo /opt/nocturne/bin/healthcheck.sh`, `sudo tail -f /var/log/nocturne-bootstrap.log`.

## Cost notes (≈ USD, ap-south-1, 24×7)

| Item                                                                | ≈ / month    | ≈ / day |
| ------------------------------------------------------------------- | ------------ | ------- |
| 2 × t3.micro + 2 × 8 GiB gp3                                        | 17           | 0.55    |
| ALB                                                                 | 20           | 0.65    |
| NAT gateway (+ 0.056/GB)                                            | 41           | 1.35    |
| Public IPv4 (ALB nodes, NAT EIP)                                    | 11           | 0.35    |
| CloudWatch (logs, 1 dashboard, 5 alarms + 2 target-tracking alarms) | 3–6          | 0.15    |
| ECR / S3 / SSM standard / SNS email                                 | < 1          | –       |
| **Total**                                                           | **≈ 90–100** | **≈ 3** |

Verify with the AWS Pricing Calculator; credits/free tier may lower the EC2 line. The budget alert emails at 30/48/60 USD.

## Scaling to zero when idle

```bash
./infra/90-pause.sh pause     # ASG 0 instances + NAT deleted  -> ~1.1 USD/day left (ALB + EIP)
./infra/90-pause.sh resume    # NAT recreated with the same EIP, ASG back to 2/2/4 (~5 min)
```

Manual equivalent: `aws autoscaling update-auto-scaling-group --auto-scaling-group-name nocturne-asg --min-size 0 --desired-capacity 0`. For multi-week breaks, `./infra/99-teardown.sh --yes --keep-eip` (everything but data and the EIP) and rebuild later with 10 → 60. **Never pause or tear down during the grading window** – the live link must stay up.

## Teardown

```bash
./infra/99-teardown.sh --yes            # infra layers 10-60 + IAM; keeps images, secrets, buckets, logs, SNS, budget
./infra/99-teardown.sh --yes --all      # everything (irreversible: images, secrets, backups)
```

Then remove the NAT EIP from the Atlas access list (or delete the Atlas cluster) and the GitHub variables.

## Validation done without an AWS account

- `shellcheck -x` (v0.11.0) and `bash -n` on every `.sh` (infra and scripts) – clean.
- `python -m json.tool` on every JSON template, before and after rendering.
- Every script dry-run against a stub `aws` binary (no AWS calls) to exercise argument parsing, rendering and control flow; the rendered launch-template JSON and user data were parsed and ShellChecked.

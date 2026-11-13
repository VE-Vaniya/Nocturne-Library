# Nocturne Library – production runbook

Operational procedures and the three demonstrations the brief requires: **failure recovery** (terminate an instance), **scaling** (load test), and a **deliberate failure** that fires an alarm, is diagnosed with logs and metrics, fixed, and written up. Build/deploy: [`DEPLOY.md`](DEPLOY.md). Post-incident note: [`INCIDENT_TEMPLATE.md`](INCIDENT_TEMPLATE.md).

```bash
export AWS_REGION=ap-south-1 ASG_NAME=nocturne-asg
export BASE_URL=http://<alb-dns>            # infra/40-alb.sh output / GitHub var APP_URL
```

## 0. Where to look

| Question | Look at |
|---|---|
| Is the site up? | `scripts/smoke-test.sh "$BASE_URL"` |
| Rate / errors / latency / CPU / memory | CloudWatch dashboard **`nocturne-prod`** |
| Which alarms are firing | CloudWatch → Alarms (`nocturne-*`), SNS emails |
| Instance & target health | EC2 → Target groups `nocturne-tg-web` / `nocturne-tg-api` → *Targets* |
| Scaling / replacement history | EC2 → Auto Scaling groups → `nocturne-asg` → *Activity* |
| App logs (all services, all instances) | Log group `/nocturne/prod/containers` (Logs Insights queries below) |
| Why an instance did not boot | Log group `/nocturne/prod/bootstrap` (`<instance-id>/user-data`) |
| Shell on an instance | EC2 → instance → *Connect* → **Session Manager** (no SSH, no key pairs), then `sudo /opt/nocturne/bin/healthcheck.sh` |
| What is deployed | `aws ssm get-parameter --name /nocturne/prod/image_tag --query Parameter.Value --output text` |

Useful Logs Insights queries (log group `/nocturne/prod/containers`):

```
# errors per service, last hour
fields @timestamp, `attrs.com.docker.compose.service` as service, log
| filter stream = "stderr" or log like /(?i)error|exception|refused|timed out/
| stats count(*) by service, bin(5m)

# backend log lines from one instance
fields @timestamp, log | filter `attrs.com.docker.compose.service` = "backend" and @logStream = "i-0123456789abcdef0"
| sort @timestamp desc | limit 200
```

On an instance:

```bash
sudo /opt/nocturne/bin/healthcheck.sh             # containers, docker health, liveness + readiness
cd /opt/nocturne && sudo docker compose -p nocturne --env-file .env -f docker-compose.yml -f docker-compose.prod.yml logs --tail 100 backend
sudo tail -100 /var/log/nocturne-bootstrap.log
```

## 1. Demo: failure recovery (terminate an instance under traffic)

Goal: show the app stays available while an instance dies, and the ASG heals itself.

1. **Baseline** – screenshot target groups (2 healthy per TG, one instance per AZ) and the ASG *Instance management* tab.
2. **Generate visible traffic** from your laptop (keep it running):

   ```bash
   while true; do
     printf '%s %s %s\n' "$(date +%T)" \
       "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/")" \
       "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/health")"
     sleep 0.5
   done | tee failover.log
   ```

   (or `k6 run -e BASE_URL=$BASE_URL loadtest/k6-smoke.js` with `--duration 10m`).
3. **Kill one instance** (the console *Terminate* button works too):

   ```bash
   VICTIM=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$ASG_NAME" \
     --query 'AutoScalingGroups[0].Instances[0].InstanceId' --output text)
   aws ec2 terminate-instances --instance-ids "$VICTIM"
   ```

4. **Observe**:
   - The ALB stops routing to the victim as soon as it starts shutting down (deregistration delay 30 s); the loop keeps printing `200 200` – at most a single failed request in flight.
   - The ASG notices the terminated instance and launches a replacement in the AZ that lost capacity (*Activity*: "an instance was taken out of service in response to an EC2 instance status check failure / user request"…, "Launching a new EC2 instance").
   - ~3–4 min later the new instance passes `/health` on both TGs (2 × 10 s), the dashboard shows *in service* back at 2.
5. **Evidence**: `failover.log` (count non-200 lines: `grep -vc ' 200 200$' failover.log`), ASG activity history, target group screenshots, dashboard *Target health* + *ASG instances* widgets.

Note: with a single NAT gateway, losing a whole AZ-a would cut egress for AZ-b too (documented trade-off in ARCHITECTURE §2); the demo covers instance failure, which is what the brief requires.

## 2. Demo: scaling (scale-out and scale-in)

Follow [`loadtest/README.md`](../loadtest/README.md): `k6 run loadtest/k6-load.js` (0 → 200 VUs over 5 min, 8 min hold). Expect `TargetTracking-…-AlarmHigh` → desired 2 → 3/4 within ~5–7 min, and `AlarmLow` → back to 2 about 15 min after the test. Capture the dashboard and ASG activity history.

## 3. Demo: deliberate failure → alarm → diagnose → fix → postmortem

Pick **one** scenario. Both are reversible and do not touch data. Start a notes file with timestamps as you go; it becomes the incident note.

### Scenario A (recommended): database connectivity lost

Simulates an Atlas network change. Liveness `/health` never touches the DB, so the ALB/ASG correctly **do not** recycle instances – the alarms do the talking.

1. **Break** – Atlas → Network Access → **delete** the NAT EIP entry (note the time, T0). Existing connections may survive a few minutes; to make it immediate, restart the backends: `scripts/deploy.sh --refresh-only` (new instances cannot connect at all).
2. **Generate traffic** – `k6 run -e BASE_URL=$BASE_URL loadtest/k6-smoke.js` or use the app (log in, list books). API calls now return 500/503.
3. **Alarm fires** (T0 + ~3–5 min):
   - `nocturne-db-connection-errors` (≥ 5 Mongo errors / 5 min from the log metric filter),
   - `nocturne-alb-5xx-rate` (> 5 % of requests 5xx for 3 of 5 minutes).
   SNS email arrives. Screenshot the alarm in `ALARM` state and the email.
4. **Diagnose** (record each step):
   - Dashboard: 5xx rate up, *DB connection errors* up, **healthy hosts unchanged** (→ not an instance problem), CPU/memory normal (→ not resource exhaustion).
   - `scripts/smoke-test.sh "$BASE_URL"` → `/`, `/health` OK, `/api/health` **503 `"db":"disconnected"`**.
   - Logs Insights on `/nocturne/prod/containers`: `MongooseServerSelectionError … Could not connect to any servers … IP that isn't whitelisted`.
   - Session Manager → `sudo /opt/nocturne/bin/healthcheck.sh` → liveness OK, readiness FAIL. `curl -s ifconfig.me` from the instance shows the NAT EIP; Atlas access list does not contain it → **root cause**.
5. **Fix** – Atlas → Network Access → add `<NAT EIP>/32` back (T-fix). Mongoose reconnects automatically within ~30 s (no redeploy needed).
6. **Verify** – smoke test passes, `/api/health` → `connected`, alarms return to `OK` (OK notification email), 5xx rate back to 0.
7. **Postmortem** – fill [`INCIDENT_TEMPLATE.md`](INCIDENT_TEMPLATE.md) (copy to `docs/incidents/YYYY-MM-DD-db-connectivity.md`). Typical action items: alarm on readiness directly (Route 53 health check or CloudWatch Synthetics canary on `/api/health`), document the allowlist dependency next to `10-network.sh`, keep the EIP during `90-pause.sh` (already the default).

### Scenario B: bad deployment caught by the smoke test → automatic rollback

Shows stage 12 doing its job.

1. **Break** – on a branch, make a change that passes CI but breaks readiness, e.g. in `docker-compose.prod.yml` set the backend's `MONGODB_URI` to `${MONGODB_URI}x` (a typo-style config bug; requires the `CONFIG_BUCKET` variable so deploy.sh uploads the compose file), or a backend change that returns 503 from `/api/health`. Merge the PR to `main`.
2. **Pipeline** – CD pushes `sha-<new>`, `scripts/deploy.sh` rolls instances (liveness passes, so the refresh succeeds), then `scripts/smoke-test.sh` fails on `/api/health` after its 2-minute retry window → the workflow runs `scripts/rollback.sh` → `image_tag` is set back to `previous_image_tag`, a new instance refresh restores the good version, and the job is marked **failed** (red X).
3. **Alarm** – during the bad window `nocturne-alb-5xx-rate` / `nocturne-db-connection-errors` fire (the k6 smoke test running in a loop makes this deterministic).
4. **Diagnose** – workflow log (smoke-test output names the failing check), Logs Insights for the backend, `aws ssm get-parameter --name /nocturne/prod/previous_image_tag`, ASG activity shows two refreshes.
5. **Fix** – revert the PR (`git revert`), merge; CD deploys a new good tag. Confirm with the smoke test.
6. **Postmortem** – as above. Action items: add a pre-merge check that would have caught it (e.g. a compose config lint or an integration test).

Manual rollback at any time: `scripts/rollback.sh` (previous) or `scripts/rollback.sh <tag>`, or the *rollback* GitHub workflow with the tag as input.

## 4. Routine procedures

| Task | Command |
|---|---|
| Deploy a tag | `scripts/deploy.sh <tag>` (normally done by CD) |
| Roll back | `scripts/rollback.sh [<tag>]` |
| Rotate a secret | `./infra/00-bootstrap.sh --rotate JWT_SECRET` then `scripts/deploy.sh --refresh-only` (rotating `JWT_SECRET` logs everyone out) |
| Patch the OS | `scripts/deploy.sh --refresh-only` – new instances resolve the latest AL2023 AMI |
| Change instance type / ASG sizes | edit `infra/config.env` (or env override) → `./infra/50-compute.sh --refresh` |
| Pause between sessions | `./infra/90-pause.sh pause` / `resume` (not during grading) |
| Mongo backup | Session Manager → `sudo /opt/nocturne/bin/backup-mongo.sh --from-ssm --bucket nocturne-backups-<acct>-ap-south-1` (S3 lifecycle keeps 30 days) |
| Restore drill | `sudo /opt/nocturne/bin/restore-mongo.sh --from-ssm --cleanup s3://nocturne-backups-…/mongo/YYYY/MM/DD/<file>` – restores into `nocturnelibrary_restore_drill`, prints document counts, drops it |
| Test an alarm/SNS path | `aws cloudwatch set-alarm-state --alarm-name nocturne-alb-5xx-rate --state-value ALARM --state-reason test` |

## 5. Alarm reference

| Alarm | Meaning | First checks |
|---|---|---|
| `nocturne-alb-5xx-rate` | > 5 % of requests 5xx (target or ALB) for 3 of 5 min (≥ 10 req/min) | Which TG? Dashboard 5xx split; `/api/health`; backend logs; recent deploy (`image_tag`)? → rollback |
| `nocturne-tg-web-unhealthy-hosts` / `nocturne-tg-api-unhealthy-hosts` | A target failed `/health` twice | Usually self-heals (ASG replaces it). If it persists: bootstrap log of the new instance, image tag exists?, memory exhaustion (dashboard) |
| `nocturne-asg-high-cpu` | ASG CPU > 80 % for 10 min | At max capacity (4)? Load test still running? Raise `ASG_MAX` or instance size |
| `nocturne-db-connection-errors` | ≥ 5 Mongo connection errors / 5 min | Atlas status page, access list contains NAT EIP, NAT gateway exists (`90-pause.sh status`), `MONGODB_URI` |
| Budget email | Spend above 50/80/100 % of 60 USD | Cost Explorer by tag `Project=nocturne`; `90-pause.sh pause` when idle |

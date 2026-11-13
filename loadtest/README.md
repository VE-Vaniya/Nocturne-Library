# Load testing (k6)

Two [k6](https://grafana.com/docs/k6/latest/) scripts run against the live ALB:

| Script | Shape | Purpose |
|---|---|---|
| `k6-smoke.js` | 2 VUs, 30 s | Sanity check: `/`, `/health`, `/api/health` (DB connected), `/api/books` → 401, and two authenticated reads when a test account is given |
| `k6-load.js` | 0 → 200 VUs over 5 min, hold 8 min, ramp down 2 min, 1 min idle | Drive the ASG target-tracking policy to **scale out**, then let it **scale in** |

Thresholds (the run fails if they are breached): **p95 latency < 800 ms**, **error rate < 2 %** (load) / < 1 % (smoke).

## Prerequisites

- k6 ≥ 0.50 (`winget install k6`, `brew install k6`, or the `grafana/k6` Docker image).
- The stack is up (`docs/DEPLOY.md`) and `scripts/smoke-test.sh` passes.
- Optional but recommended: a **dedicated test account** created through the app's sign-up page (e.g. `loadtest@<your-domain>`), never a real user's credentials. Pass it via environment variables so it does not land in shell history or the repo:

```bash
export BASE_URL=http://<alb-dns-name>      # from infra/40-alb.sh output
export K6_TEST_EMAIL=loadtest@example.com
read -rs K6_TEST_PASSWORD && export K6_TEST_PASSWORD
```

## Run

```bash
mkdir -p loadtest/results
k6 run loadtest/k6-smoke.js
k6 run --summary-export loadtest/results/summary.json loadtest/k6-load.js
# heavier: k6 run -e PEAK_VUS=300 -e HOLD=10m loadtest/k6-load.js
```

Run the load test from a laptop or a CI runner **outside** AWS (traffic must go through the ALB). `loadtest/results/` is for local evidence; do not commit result files containing hostnames you consider private.

## Why the profile looks like this

- Target tracking (`infra/50-compute.sh`) defaults to **ASG average CPU 50 %** (alternative: `SCALING_METRIC=requests`, ALBRequestCountPerTarget 500/min). CloudWatch needs ~3 consecutive 1-minute datapoints above target before the scale-out alarm fires, then a new instance boots (~2–3 min) and warms up (120 s). An 8-minute hold gives time to see 2 → 3 (often 4) instances.
- Scale-in is deliberately slow (target tracking waits ~15 minutes of low CPU), so keep collecting evidence for **~20 minutes after k6 ends**.
- t3.micro instances use *standard* CPU credits (no surprise "unlimited" charges). Under sustained load they may throttle to baseline, which still pushes CPU % up and triggers scale-out; it can raise latency, so look at p95 per phase, not just the summary.

## Capturing scale-out / scale-in evidence

Screenshot each of these (the brief asks for "CloudWatch metrics and Auto Scaling activity history"):

1. **Before the run** – EC2 → Auto Scaling groups → `nocturne-asg` → *Instance management*: 2 instances `InService`, one per AZ.
2. **During the run** – CloudWatch dashboard `nocturne-prod`: *Request rate*, *Latency p95*, *CPU and memory*, *Auto Scaling group – instances* (desired / in-service climbing to 3–4).
3. **k6 terminal summary** – thresholds ✓/✗, `http_reqs` rate, p95.
4. **Activity history** – `nocturne-asg` → *Activity* tab, or:

   ```bash
   aws autoscaling describe-scaling-activities --region ap-south-1 \
     --auto-scaling-group-name nocturne-asg --max-items 10 \
     --query 'Activities[].[StartTime,StatusCode,Description,Cause]' --output table
   ```

   Look for *"Launching a new EC2 instance … changing the desired capacity from 2 to 3"* caused by the `TargetTracking-nocturne-asg-AlarmHigh-…` alarm, and later *"Terminating EC2 instance … from 3 to 2"* caused by `…-AlarmLow-…`.
5. **Target tracking alarms** – CloudWatch → Alarms → the two auto-created `TargetTracking-nocturne-asg-*` alarms going to `In alarm` (high during load, low afterwards).
6. **After scale-in** – back to 2 instances; ALB target groups healthy throughout (no 5xx spike).

Metric CLI equivalents (for a write-up):

```bash
aws cloudwatch get-metric-statistics --region ap-south-1 --namespace AWS/AutoScaling \
  --metric-name GroupInServiceInstances --dimensions Name=AutoScalingGroupName,Value=nocturne-asg \
  --start-time "$(date -u -d '-60 min' +%FT%TZ)" --end-time "$(date -u +%FT%TZ)" \
  --period 60 --statistics Maximum --output table
```

## Troubleshooting

- **No scale-out**: CPU did not stay above 50 %. Raise `PEAK_VUS`, or switch to request-count scaling (`SCALING_METRIC=requests REQUESTS_PER_TARGET=300 infra/50-compute.sh`).
- **High error rate at peak**: check `nocturne-alb-5xx-rate`, memory % on the dashboard (t3.micro has 1 GiB), and Atlas M0 connection limits (500) — M0 is a shared tier, so very high VU counts can saturate the database before the instances.
- **Stuck at max (4)**: the `nocturne-asg-high-cpu` alarm will fire; that is expected under extreme load and is a good screenshot for the alarm requirement.

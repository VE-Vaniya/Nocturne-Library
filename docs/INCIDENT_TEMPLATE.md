# Post-incident note – <short title>

> Copy to `docs/incidents/YYYY-MM-DD-<slug>.md`. Blameless: describe systems and decisions, not people. Keep it to one page; the findings report quotes it "in a few lines". Never paste secrets, connection strings or tokens.

| Field | Value |
|---|---|
| Date (UTC) | YYYY-MM-DD |
| Severity | SEV-1 (site down) / SEV-2 (feature broken) / SEV-3 (degraded) |
| Status | Resolved / Monitoring |
| Duration | detection → resolution: __ min (impact start → end: __ min) |
| Detected by | alarm `nocturne-…` / smoke test / user report |
| Deliberate exercise? | yes – scenario A (DB connectivity) / B (bad deploy) / no |
| Author(s) | |
| Image tag(s) involved | `image_tag` = … , `previous_image_tag` = … |

## Summary

Two or three sentences: what broke, who/what was affected, how it was fixed.

## Impact

- User-visible effect (e.g. "login and book lists returned HTTP 500; static pages still loaded").
- Requests affected: __ % 5xx peak (dashboard *Errors* widget), __ failed requests (ALB `HTTPCode_Target_5XX_Count` sum).
- Data loss: none / describe.

## Timeline (UTC)

| Time | Event |
|---|---|
| hh:mm | Trigger (change / failure injected) |
| hh:mm | Alarm `…` → ALARM, SNS email received |
| hh:mm | Investigation started |
| hh:mm | Root cause identified |
| hh:mm | Fix applied (what, by which command) |
| hh:mm | Smoke test green, alarms back to OK |

## Detection

Which signal fired first, and was it the right one? How long between impact and alert?

## Diagnosis

The path to the root cause, with evidence (attach screenshots / paste short log lines):

1. Dashboard: …
2. `scripts/smoke-test.sh` output: …
3. Logs Insights query + result: …
4. On-instance check (`healthcheck.sh`): …

## Root cause

The underlying cause (5 whys if useful), not just the trigger.

## Resolution and recovery

Exactly what was done, e.g. `scripts/rollback.sh sha-abc1234`, or "re-added NAT EIP to Atlas access list". How recovery was verified.

## What went well / what went poorly

- Well: …
- Poorly: …
- Lucky: …

## Action items

| # | Action | Type (prevent / detect / mitigate) | Owner | Due | Issue/PR |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |

## Evidence (for the submission)

- [ ] Alarm in ALARM state (screenshot) + SNS email
- [ ] Dashboard during the incident
- [ ] Log excerpt showing the root cause
- [ ] Fix (command / PR / workflow run link)
- [ ] Alarm back to OK + smoke test green

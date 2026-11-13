#!/usr/bin/env bash
# 60-observability.sh - CloudWatch log groups, metric filter, dashboard, alarms.
#
#   log groups  /nocturne/prod/containers (docker json logs, one stream per
#               instance, service name in attrs), /nocturne/prod/bootstrap
#               (user-data + cloud-init) - retention 14 days
#   metric      Nocturne/DbConnectionErrors from a log metric filter
#   dashboard   nocturne-prod from infra/dashboard.json (request rate, 5xx,
#               latency p50/p95/p99, target health, ASG instances, CPU, memory,
#               DB errors, alarm status, Logs Insights tables)
#   alarms      (all -> SNS nocturne-alerts, ALARM and OK)
#               nocturne-alb-5xx-rate            5xx / requests > 5% (3 of 5 min, >= 10 req/min)
#               nocturne-tg-web-unhealthy-hosts  UnHealthyHostCount > 0 (2 of 2 min)
#               nocturne-tg-api-unhealthy-hosts  UnHealthyHostCount > 0 (2 of 2 min)
#               nocturne-asg-high-cpu            ASG CPU avg > 80% (2 x 5 min)
#               nocturne-db-connection-errors    >= 5 Mongo errors in 5 min
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="60-observability"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [-h|--help]

Creates/updates log groups, the ${DASHBOARD_NAME} dashboard and alarms that
notify SNS topic ${SNS_TOPIC_NAME}. Requires 40-alb.sh and 50-compute.sh.
EOF
}

ensure_log_group() {
  local name=$1
  if [[ -n "$(nn "$(awsq logs describe-log-groups --log-group-name-prefix "${name}" \
      --query "logGroups[?logGroupName=='${name}'].logGroupName | [0]")")" ]]; then
    info "log group ${name} exists"
  else
    awsq logs create-log-group --log-group-name "${name}" \
      --tags "Project=${PROJECT},Environment=${ENV_NAME}"
    ok "created log group ${name}"
  fi
  awsq logs put-retention-policy --log-group-name "${name}" --retention-in-days "${LOG_RETENTION_DAYS}"
}

ensure_metric_filter() {
  # Space-separated "?term" = OR. Matches Mongoose/driver connection failures.
  awsq logs put-metric-filter --log-group-name "${LOG_GROUP_CONTAINERS}" \
    --filter-name nocturne-db-connection-errors \
    --filter-pattern '?MongooseServerSelectionError ?MongoServerSelectionError ?MongoNetworkError ?MongoNetworkTimeoutError ?"connection timed out"' \
    --metric-transformations \
      "metricName=DbConnectionErrors,metricNamespace=${CW_NAMESPACE_APP},metricValue=1,defaultValue=0,unit=Count"
  ok "metric filter -> ${CW_NAMESPACE_APP}/DbConnectionErrors"
}

put_dashboard() {
  local body
  body="$(ACCOUNT_ID="$(account_id)" render_template "${INFRA_DIR}/dashboard.json")"
  awsq cloudwatch put-dashboard --dashboard-name "${DASHBOARD_NAME}" --dashboard-body "${body}" >/dev/null
  ok "dashboard ${DASHBOARD_NAME}: https://${AWS_REGION}.console.aws.amazon.com/cloudwatch/home?region=${AWS_REGION}#dashboards:name=${DASHBOARD_NAME}"
}

common_alarm_args() {
  printf '%s\n' --alarm-actions "${TOPIC}" --ok-actions "${TOPIC}" \
    --tags "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}"
}

alarm_5xx_rate() {
  local metrics
  metrics="$(cat <<JSON
[
  {"Id":"t5","ReturnData":false,"MetricStat":{"Metric":{"Namespace":"AWS/ApplicationELB","MetricName":"HTTPCode_Target_5XX_Count","Dimensions":[{"Name":"LoadBalancer","Value":"${ALB_DIM}"}]},"Period":60,"Stat":"Sum"}},
  {"Id":"e5","ReturnData":false,"MetricStat":{"Metric":{"Namespace":"AWS/ApplicationELB","MetricName":"HTTPCode_ELB_5XX_Count","Dimensions":[{"Name":"LoadBalancer","Value":"${ALB_DIM}"}]},"Period":60,"Stat":"Sum"}},
  {"Id":"rq","ReturnData":false,"MetricStat":{"Metric":{"Namespace":"AWS/ApplicationELB","MetricName":"RequestCount","Dimensions":[{"Name":"LoadBalancer","Value":"${ALB_DIM}"}]},"Period":60,"Stat":"Sum"}},
  {"Id":"rate","Label":"5xx rate %","ReturnData":true,"Expression":"IF(rq >= 10, 100 * (FILL(t5, 0) + FILL(e5, 0)) / rq, 0)"}
]
JSON
)"
  local args
  mapfile -t args < <(common_alarm_args)
  awsq cloudwatch put-metric-alarm --alarm-name nocturne-alb-5xx-rate \
    --alarm-description "More than ${ALARM_5XX_RATE_PCT}% of ALB responses are 5xx (target or ELB). Check tg-api health, /api/health, container logs." \
    --metrics "${metrics}" --comparison-operator GreaterThanThreshold --threshold "${ALARM_5XX_RATE_PCT}" \
    --evaluation-periods 5 --datapoints-to-alarm 3 --treat-missing-data notBreaching "${args[@]}"
  ok "alarm nocturne-alb-5xx-rate"
}

alarm_unhealthy() {
  local name=$1 tg_dim=$2 args
  mapfile -t args < <(common_alarm_args)
  awsq cloudwatch put-metric-alarm --alarm-name "${name}" \
    --alarm-description "A target in ${tg_dim} failed ALB health checks (liveness /health). ASG will replace it." \
    --namespace AWS/ApplicationELB --metric-name UnHealthyHostCount \
    --dimensions "Name=TargetGroup,Value=${tg_dim}" "Name=LoadBalancer,Value=${ALB_DIM}" \
    --statistic Maximum --period 60 --evaluation-periods 2 --datapoints-to-alarm 2 \
    --threshold 0 --comparison-operator GreaterThanThreshold --treat-missing-data notBreaching \
    "${args[@]}"
  ok "alarm ${name}"
}

alarm_cpu() {
  local args
  mapfile -t args < <(common_alarm_args)
  awsq cloudwatch put-metric-alarm --alarm-name nocturne-asg-high-cpu \
    --alarm-description "ASG average CPU > ${ALARM_CPU_PCT}% for 10 min (scaling at max, or runaway process)." \
    --namespace AWS/EC2 --metric-name CPUUtilization \
    --dimensions "Name=AutoScalingGroupName,Value=${ASG_NAME}" \
    --statistic Average --period 300 --evaluation-periods 2 --datapoints-to-alarm 2 \
    --threshold "${ALARM_CPU_PCT}" --comparison-operator GreaterThanThreshold --treat-missing-data missing \
    "${args[@]}"
  ok "alarm nocturne-asg-high-cpu"
}

alarm_db_errors() {
  local args
  mapfile -t args < <(common_alarm_args)
  awsq cloudwatch put-metric-alarm --alarm-name nocturne-db-connection-errors \
    --alarm-description "Backend logs show MongoDB connection errors. Check Atlas status, IP access list (NAT EIP) and MONGODB_URI." \
    --namespace "${CW_NAMESPACE_APP}" --metric-name DbConnectionErrors \
    --statistic Sum --period 300 --evaluation-periods 1 --datapoints-to-alarm 1 \
    --threshold 5 --comparison-operator GreaterThanOrEqualToThreshold --treat-missing-data notBreaching \
    "${args[@]}"
  ok "alarm nocturne-db-connection-errors"
}

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    '') ;;
    *) usage; die "unknown argument: $1" ;;
  esac
  preflight

  local alb web api
  alb="$(alb_arn)"
  web="$(tg_arn "${TG_WEB_NAME}")"
  api="$(tg_arn "${TG_API_NAME}")"
  [[ -n "${alb}" && -n "${web}" && -n "${api}" ]] || die "ALB/target groups not found - run infra/40-alb.sh"

  # CloudWatch dimension values: app/<name>/<id> and targetgroup/<name>/<id>
  ALB_DIM="${alb#*:loadbalancer/}"
  TG_WEB_DIM="targetgroup/${web#*:targetgroup/}"
  TG_API_DIM="targetgroup/${api#*:targetgroup/}"
  TOPIC="$(sns_topic_arn)"
  export ALB_DIM TG_WEB_DIM TG_API_DIM TOPIC
  awsq sns get-topic-attributes --topic-arn "${TOPIC}" >/dev/null 2>&1 \
    || die "SNS topic ${TOPIC} not found - run infra/00-bootstrap.sh"

  ensure_log_group "${LOG_GROUP_CONTAINERS}"
  ensure_log_group "${LOG_GROUP_BOOTSTRAP}"
  ensure_metric_filter
  alarm_5xx_rate
  alarm_unhealthy nocturne-tg-web-unhealthy-hosts "${TG_WEB_DIM}"
  alarm_unhealthy nocturne-tg-api-unhealthy-hosts "${TG_API_DIM}"
  alarm_cpu
  alarm_db_errors
  put_dashboard

  ok "observability ready. Confirm the SNS email subscription, then test with:"
  printf '  aws cloudwatch set-alarm-state --region %s --alarm-name nocturne-alb-5xx-rate --state-value ALARM --state-reason "manual test"\n' "${AWS_REGION}"
}

main "$@"

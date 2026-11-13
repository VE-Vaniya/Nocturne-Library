#!/usr/bin/env bash
# 40-alb.sh - Application Load Balancer, target groups, listener + path rule
# (docs/ARCHITECTURE.md section 3).
#
#   nocturne-alb      internet-facing, public-a + public-b, sg-alb
#   nocturne-tg-web   HTTP 8080, GET /health, instance targets
#   nocturne-tg-api   HTTP 5000, GET /health (liveness - never the DB-backed
#                     /api/health, so an Atlas outage alarms instead of making
#                     the ASG recycle healthy instances)
#   both TGs: interval 10s, timeout 5s, healthy 2, unhealthy 2, matcher 200,
#             deregistration delay 30s, no stickiness (stateless JWT)
#   HTTP :80  default -> tg-web, priority 10 path /api/* -> tg-api
#   With ACM_CERT_ARN set: HTTPS :443 carries the rules, :80 redirects 301.
# Also seeds ${SSM_PREFIX}/CORS_ORIGINS with the public ALB origin.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="40-alb"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--set-cors] [-h|--help]

  --set-cors   Overwrite ${SSM_PREFIX}/CORS_ORIGINS with this ALB's origin even
               if the parameter already exists (e.g. after recreating the ALB).

Environment:
  ACM_CERT_ARN   Optional ACM certificate (same region) to enable HTTPS.
EOF
}

TLS_POLICY="${TLS_POLICY:-ELBSecurityPolicy-TLS13-1-2-2021-06}"
SET_CORS=0

ensure_alb() {
  local sg=$1 sub_a=$2 sub_b=$3 arn
  arn="$(alb_arn)"
  if [[ -z "${arn}" ]]; then
    arn="$(awsq elbv2 create-load-balancer --name "${ALB_NAME}" --type application \
      --scheme internet-facing --ip-address-type ipv4 \
      --subnets "${sub_a}" "${sub_b}" --security-groups "${sg}" \
      --tags "Key=Name,Value=${ALB_NAME}" "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" \
      --query 'LoadBalancers[0].LoadBalancerArn')"
    ok "creating ALB ${ALB_NAME}"
  else
    info "ALB ${ALB_NAME} exists"
    awsq elbv2 set-security-groups --load-balancer-arn "${arn}" --security-groups "${sg}" >/dev/null
  fi
  awsq elbv2 wait load-balancer-available --load-balancer-arns "${arn}" >/dev/null
  awsq elbv2 modify-load-balancer-attributes --load-balancer-arn "${arn}" --attributes \
    Key=routing.http.drop_invalid_header_fields.enabled,Value=true \
    Key=idle_timeout.timeout_seconds,Value=60 >/dev/null
  printf '%s' "${arn}"
}

# ensure_tg NAME PORT HEALTH_PATH VPC
ensure_tg() {
  local name=$1 port=$2 path=$3 vpc=$4 arn
  arn="$(tg_arn "${name}")"
  if [[ -z "${arn}" ]]; then
    arn="$(awsq elbv2 create-target-group --name "${name}" --protocol HTTP --port "${port}" \
      --vpc-id "${vpc}" --target-type instance \
      --health-check-protocol HTTP --health-check-path "${path}" --health-check-port traffic-port \
      --health-check-interval-seconds "${HC_INTERVAL}" --health-check-timeout-seconds "${HC_TIMEOUT}" \
      --healthy-threshold-count "${HC_HEALTHY}" --unhealthy-threshold-count "${HC_UNHEALTHY}" \
      --matcher HttpCode=200 \
      --tags "Key=Name,Value=${name}" "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" \
      --query 'TargetGroups[0].TargetGroupArn')"
    ok "created target group ${name} (HTTP ${port}, health ${path})"
  else
    awsq elbv2 modify-target-group --target-group-arn "${arn}" \
      --health-check-protocol HTTP --health-check-path "${path}" --health-check-port traffic-port \
      --health-check-interval-seconds "${HC_INTERVAL}" --health-check-timeout-seconds "${HC_TIMEOUT}" \
      --healthy-threshold-count "${HC_HEALTHY}" --unhealthy-threshold-count "${HC_UNHEALTHY}" \
      --matcher HttpCode=200 >/dev/null
    info "target group ${name} exists - health check reconciled"
  fi
  awsq elbv2 modify-target-group-attributes --target-group-arn "${arn}" --attributes \
    "Key=deregistration_delay.timeout_seconds,Value=${DEREG_DELAY}" \
    Key=stickiness.enabled,Value=false >/dev/null
  printf '%s' "${arn}"
}

listener_arn() {
  nn "$(awsq elbv2 describe-listeners --load-balancer-arn "$1" \
    --query "Listeners[?Port==\`$2\`].ListenerArn | [0]")"
}

# ensure_listener ALB PORT PROTOCOL DEFAULT_ACTION [extra args...]
ensure_listener() {
  local alb=$1 port=$2 proto=$3 action=$4 arn
  shift 4
  arn="$(listener_arn "${alb}" "${port}")"
  if [[ -z "${arn}" ]]; then
    arn="$(awsq elbv2 create-listener --load-balancer-arn "${alb}" --port "${port}" \
      --protocol "${proto}" --default-actions "${action}" "$@" \
      --tags "Key=Project,Value=${PROJECT}" --query 'Listeners[0].ListenerArn')"
    ok "created ${proto} :${port} listener"
  else
    awsq elbv2 modify-listener --listener-arn "${arn}" --port "${port}" --protocol "${proto}" \
      --default-actions "${action}" "$@" >/dev/null
    info "${proto} :${port} listener exists - default action reconciled"
  fi
  printf '%s' "${arn}"
}

ensure_api_rule() {
  local listener=$1 tg=$2 rule
  local cond='[{"Field":"path-pattern","PathPatternConfig":{"Values":["/api/*"]}}]'
  local act="[{\"Type\":\"forward\",\"TargetGroupArn\":\"${tg}\"}]"
  rule="$(nn "$(awsq elbv2 describe-rules --listener-arn "${listener}" \
    --query "Rules[?Priority=='${API_RULE_PRIORITY}'].RuleArn | [0]")")"
  if [[ -z "${rule}" ]]; then
    awsq elbv2 create-rule --listener-arn "${listener}" --priority "${API_RULE_PRIORITY}" \
      --conditions "${cond}" --actions "${act}" \
      --tags "Key=Project,Value=${PROJECT}" >/dev/null
    ok "rule p${API_RULE_PRIORITY}: /api/* -> ${TG_API_NAME}"
  else
    awsq elbv2 modify-rule --rule-arn "${rule}" --conditions "${cond}" --actions "${act}" >/dev/null
    info "rule p${API_RULE_PRIORITY} exists - reconciled (/api/* -> ${TG_API_NAME})"
  fi
}

seed_cors() {
  local origin=$1 name="${SSM_PREFIX}/CORS_ORIGINS"
  if awsq ssm get-parameter --name "${name}" >/dev/null 2>&1; then
    if ((SET_CORS)); then
      awsq ssm put-parameter --name "${name}" --type String --value "${origin}" --overwrite >/dev/null
      ok "updated ${name}=${origin}"
    else
      info "${name} exists (pass --set-cors to overwrite with ${origin})"
    fi
  else
    awsq ssm put-parameter --name "${name}" --type String --value "${origin}" \
      --tags "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" >/dev/null
    ok "created ${name}=${origin}"
  fi
}

main() {
  while (($#)); do
    case "$1" in
      --set-cors) SET_CORS=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) usage; die "unknown argument: $1" ;;
    esac
  done
  preflight

  local vpc sg sub_a sub_b alb web api dns http https origin
  vpc="$(require_vpc)"
  sg="$(sg_id "${SG_ALB_NAME}")"
  [[ -n "${sg}" ]] || die "${SG_ALB_NAME} not found - run infra/30-security-groups.sh first"
  sub_a="$(subnet_id "${PROJECT}-public-a")"
  sub_b="$(subnet_id "${PROJECT}-public-b")"
  [[ -n "${sub_a}" && -n "${sub_b}" ]] || die "public subnets not found - run infra/10-network.sh"

  web="$(ensure_tg "${TG_WEB_NAME}" "${WEB_PORT}" "${WEB_HEALTH_PATH}" "${vpc}")"
  api="$(ensure_tg "${TG_API_NAME}" "${API_PORT}" "${API_HEALTH_PATH}" "${vpc}")"
  alb="$(ensure_alb "${sg}" "${sub_a}" "${sub_b}")"

  local forward_web="Type=forward,TargetGroupArn=${web}"
  if [[ -n "${ACM_CERT_ARN}" ]]; then
    https="$(ensure_listener "${alb}" 443 HTTPS "${forward_web}" \
      --certificates "CertificateArn=${ACM_CERT_ARN}" --ssl-policy "${TLS_POLICY}")"
    ensure_api_rule "${https}" "${api}"
    http="$(ensure_listener "${alb}" 80 HTTP \
      'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}')"
    origin_scheme=https
  else
    warn "no ACM_CERT_ARN: HTTP-only ALB (document this in SECURITY.md)"
    http="$(ensure_listener "${alb}" 80 HTTP "${forward_web}")"
    ensure_api_rule "${http}" "${api}"
    origin_scheme=http
  fi

  dns="$(awsq elbv2 describe-load-balancers --load-balancer-arns "${alb}" \
    --query 'LoadBalancers[0].DNSName')"
  origin="${origin_scheme}://${dns}"
  seed_cors "${origin}"

  ok "ALB ready: ${origin}"
  printf '\n  Live URL: %s\n  Set GitHub repo variable APP_URL=%s\n\n' "${origin}" "${origin}"
  info "next: infra/50-compute.sh"
}

main "$@"

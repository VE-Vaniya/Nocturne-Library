#!/usr/bin/env bash
# shellcheck shell=bash
# Shared helpers for infra/*.sh. Sourced, never executed directly.
#
# Conventions used by every script:
#   * every resource is tagged Project=${PROJECT} and Name=<name>;
#   * "ensure_*" functions look a resource up (by Name tag or by its unique
#     name) and only create it when missing, so scripts are safe to re-run;
#   * the AWS CLI's text output prints "None" for null - nn() normalises it.

if [[ -n "${_NOCTURNE_COMMON_LOADED:-}" ]]; then
  return 0
fi
_NOCTURNE_COMMON_LOADED=1

# Make $(...) subshells honour set -e too, so a failing AWS call inside a
# lookup helper aborts the script instead of yielding an empty id (bash >= 4.4).
shopt -s inherit_errexit

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${INFRA_DIR}/.." && pwd)"
export INFRA_DIR REPO_ROOT

# shellcheck source=../config.env
source "${INFRA_DIR}/config.env"

SCRIPT_NAME="${SCRIPT_NAME:-$(basename "${0}")}"

# ---- logging -------------------------------------------------------------------
_ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log()  { printf '%s [%s] %s\n' "$(_ts)" "${SCRIPT_NAME}" "$*" >&2; }
info() { log "INFO  $*"; }
ok()   { log "OK    $*"; }
warn() { log "WARN  $*"; }
die()  { log "ERROR $*"; exit 1; }

on_error() {
  local rc=$? line=${1:-?}
  log "ERROR command failed (exit ${rc}) at line ${line}: ${BASH_COMMAND}"
  exit "${rc}"
}
trap 'on_error ${LINENO}' ERR

# ---- prerequisites -------------------------------------------------------------
require_cmd() {
  local c
  for c in "$@"; do
    command -v "${c}" >/dev/null 2>&1 || die "required command not found: ${c}"
  done
}

# nn VALUE -> prints VALUE, or nothing when it is empty/None/null.
nn() {
  case "${1:-}" in
    ''|None|null) printf '' ;;
    *) printf '%s' "$1" ;;
  esac
}

# awsq ... -> aws CLI in the project region with text output.
awsq() {
  aws --region "${AWS_REGION}" --output text "$@"
}

ACCOUNT_ID="${ACCOUNT_ID:-}"
account_id() {
  if [[ -z "${ACCOUNT_ID}" ]]; then
    ACCOUNT_ID="$(awsq sts get-caller-identity --query Account)"
    [[ "${ACCOUNT_ID}" =~ ^[0-9]{12}$ ]] || die "could not determine AWS account id (are you logged in? try: aws sso login)"
  fi
  printf '%s' "${ACCOUNT_ID}"
}

preflight() {
  require_cmd aws
  local v
  v="$(aws --version 2>&1)"
  [[ "${v}" == aws-cli/2.* ]] || die "AWS CLI v2 required (found: ${v})"
  local acct caller
  acct="$(account_id)"
  caller="$(awsq sts get-caller-identity --query Arn)"
  info "account ${acct} region ${AWS_REGION} as ${caller}"
}

config_bucket() { printf '%s-%s-%s' "${CONFIG_BUCKET_PREFIX}" "$(account_id)" "${AWS_REGION}"; }
backup_bucket() { printf '%s-%s-%s' "${BACKUP_BUCKET_PREFIX}" "$(account_id)" "${AWS_REGION}"; }
ecr_registry()  { printf '%s.dkr.ecr.%s.amazonaws.com' "$(account_id)" "${AWS_REGION}"; }

# ---- tagging -------------------------------------------------------------------
# ec2_tag_spec RESOURCE_TYPE NAME -> value for --tag-specifications
ec2_tag_spec() {
  printf 'ResourceType=%s,Tags=[{Key=Name,Value=%s},{Key=Project,Value=%s},{Key=Environment,Value=%s}]' \
    "$1" "$2" "${PROJECT}" "${ENV_NAME}"
}

# kv_tags NAME -> "Key=Name,Value=x Key=Project,Value=y ..." style list (one per line)
kv_tags() {
  printf 'Key=Name,Value=%s\nKey=Project,Value=%s\nKey=Environment,Value=%s\n' "$1" "${PROJECT}" "${ENV_NAME}"
}

# ---- lookups (return empty string when missing) ------------------------------
# ec2_id_by_name DESCRIBE_CMD QUERY_PATH NAME [extra filters...]
ec2_id_by_name() {
  local cmd=$1 query=$2 name=$3 flag=--filters
  shift 3
  # describe-nat-gateways is the one EC2 describe call whose option is --filter.
  [[ "${cmd}" == describe-nat-gateways ]] && flag=--filter
  nn "$(awsq ec2 "${cmd}" \
    "${flag}" "Name=tag:Name,Values=${name}" "Name=tag:Project,Values=${PROJECT}" "$@" \
    --query "${query}")"
}

vpc_id() { ec2_id_by_name describe-vpcs 'Vpcs[0].VpcId' "${VPC_NAME}"; }

require_vpc() {
  local id
  id="$(vpc_id)"
  [[ -n "${id}" ]] || die "VPC ${VPC_NAME} not found - run infra/10-network.sh first"
  printf '%s' "${id}"
}

subnet_id() {
  ec2_id_by_name describe-subnets 'Subnets[0].SubnetId' "$1"
}

sg_id() {
  ec2_id_by_name describe-security-groups 'SecurityGroups[0].GroupId' "$1"
}

tg_arn() {
  nn "$(awsq elbv2 describe-target-groups --names "$1" \
    --query 'TargetGroups[0].TargetGroupArn' 2>/dev/null || true)"
}

alb_arn() {
  nn "$(awsq elbv2 describe-load-balancers --names "${ALB_NAME}" \
    --query 'LoadBalancers[0].LoadBalancerArn' 2>/dev/null || true)"
}

sns_topic_arn() {
  printf 'arn:aws:sns:%s:%s:%s' "${AWS_REGION}" "$(account_id)" "${SNS_TOPIC_NAME}"
}

# ---- templating ------------------------------------------------------------------
# render_template FILE -> stdout, replacing __TOKEN__ placeholders with the
# values of the matching shell variables. Unknown tokens are a hard error.
render_template() {
  local file=$1 content token value
  content="$(<"${file}")"
  local tokens
  tokens="$(grep -o '__[A-Z0-9_]*__' "${file}" | sort -u || true)"
  local IFS=$'\n'
  for token in ${tokens}; do
    local var="${token#__}"
    var="${var%__}"
    if [[ -z "${!var+x}" ]]; then
      die "template ${file}: no value for ${token}"
    fi
    value="${!var}"
    content="${content//"${token}"/"${value}"}"
  done
  printf '%s\n' "${content}"
}

# ---- misc ------------------------------------------------------------------------
# confirm PROMPT -> returns 0 if the user typed "yes" (or ASSUME_YES=1)
confirm() {
  if [[ "${ASSUME_YES:-0}" == "1" ]]; then
    return 0
  fi
  local reply
  read -r -p "$1 [type 'yes' to continue]: " reply
  [[ "${reply}" == "yes" ]]
}

# wait_until DESCRIPTION TIMEOUT_SECONDS INTERVAL_SECONDS COMMAND...
# Re-runs COMMAND until it succeeds or the timeout expires.
wait_until() {
  local what=$1 timeout=$2 interval=$3
  shift 3
  local deadline=$((SECONDS + timeout))
  until "$@"; do
    if ((SECONDS >= deadline)); then
      die "timed out after ${timeout}s waiting for ${what}"
    fi
    info "waiting for ${what}..."
    sleep "${interval}"
  done
}

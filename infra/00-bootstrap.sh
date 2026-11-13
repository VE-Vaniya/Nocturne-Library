#!/usr/bin/env bash
# 00-bootstrap.sh - account-level prerequisites for Nocturne Library (run once,
# with an admin SSO profile). Safe to re-run: every step checks before creating.
#
# Creates:
#   * ECR repos nocturne-frontend / nocturne-backend (tag immutability, scan on
#     push, AES256, lifecycle policy from policies/ecr-lifecycle.json)
#   * SSM parameters under /nocturne/prod/ (SecureString secrets + image tags)
#   * S3 buckets: config (compose files, CW agent config) and backups
#   * SNS topic nocturne-alerts + email subscription
#   * AWS Budget (monthly, email alerts)
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="00-bootstrap"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Account bootstrap: ECR, SSM parameters, S3 buckets, SNS alerts, AWS Budget.

Options:
  --rotate NAME     Overwrite an existing secret (e.g. --rotate JWT_SECRET). Repeatable.
  --skip-secrets    Do not create/prompt for SSM secret parameters.
  --skip-budget     Do not create the AWS Budget.
  -h, --help        Show this help.

Environment:
  BUDGET_EMAIL      Email for budget alerts (required unless --skip-budget).
  ALERT_EMAIL       Email subscribed to the SNS alarm topic (default: BUDGET_EMAIL).
  MONGODB_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS, GOOGLE_BOOKS_API_KEY
                    Secret values. If unset and a TTY is attached you are prompted
                    (input hidden). Values are never echoed or written to disk.
  AWS_PROFILE, AWS_REGION (default ${AWS_REGION})
EOF
}

ROTATE=()
SKIP_SECRETS=0
SKIP_BUDGET=0

parse_args() {
  while (($#)); do
    case "$1" in
      --rotate) [[ $# -ge 2 ]] || die "--rotate needs a NAME"; ROTATE+=("$2"); shift 2 ;;
      --skip-secrets) SKIP_SECRETS=1; shift ;;
      --skip-budget) SKIP_BUDGET=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) usage; die "unknown argument: $1" ;;
    esac
  done
}

# ---- ECR -------------------------------------------------------------------------
ensure_ecr_repo() {
  local repo=$1
  if awsq ecr describe-repositories --repository-names "${repo}" >/dev/null 2>&1; then
    info "ECR repo ${repo} exists"
  else
    awsq ecr create-repository \
      --repository-name "${repo}" \
      --image-tag-mutability IMMUTABLE \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 \
      --tags "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" "Key=Name,Value=${repo}" \
      >/dev/null
    ok "created ECR repo ${repo}"
  fi
  # Re-apply settings every run so drift (e.g. someone toggled mutability) is fixed.
  awsq ecr put-image-tag-mutability --repository-name "${repo}" --image-tag-mutability IMMUTABLE >/dev/null
  awsq ecr put-image-scanning-configuration --repository-name "${repo}" \
    --image-scanning-configuration scanOnPush=true >/dev/null
  awsq ecr put-lifecycle-policy --repository-name "${repo}" \
    --lifecycle-policy-text "file://${INFRA_DIR}/policies/ecr-lifecycle.json" >/dev/null
  ok "ECR ${repo}: IMMUTABLE tags, scan-on-push, lifecycle policy applied"
}

# ---- SSM -------------------------------------------------------------------------
param_exists() {
  awsq ssm get-parameter --name "$1" --query Parameter.Name >/dev/null 2>&1
}

is_rotating() {
  local n
  for n in "${ROTATE[@]+"${ROTATE[@]}"}"; do
    [[ "${n}" == "$1" ]] && return 0
  done
  return 1
}

# read_secret NAME -> prints the value from env or a hidden prompt; empty if none.
read_secret() {
  local name=$1 value="${!1:-}"
  if [[ -z "${value}" && -t 0 ]]; then
    read -r -s -p "Value for ${name} (input hidden, empty to skip): " value
    printf '\n' >&2
  fi
  printf '%s' "${value}"
}

put_param() {
  local name=$1 type=$2 value=$3
  if param_exists "${name}"; then
    awsq ssm put-parameter --name "${name}" --type "${type}" --value "${value}" --overwrite >/dev/null
  else
    awsq ssm put-parameter --name "${name}" --type "${type}" --value "${value}" \
      --tags "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" >/dev/null
  fi
}

ensure_secret() {
  local key=$1 required=$2 name="${SSM_PREFIX}/$1" value
  if param_exists "${name}" && ! is_rotating "${key}"; then
    info "SSM ${name} exists (use --rotate ${key} to change it)"
    return 0
  fi
  value="$(read_secret "${key}")"
  if [[ -z "${value}" ]]; then
    if [[ "${required}" == "required" ]]; then
      die "${key} is required: export ${key}=... or run interactively"
    fi
    warn "skipping optional ${name} (no value given)"
    return 0
  fi
  if [[ "${value}" == *"'"* ]]; then
    die "${key} contains a single quote, which the instance env file cannot represent - choose another value"
  fi
  put_param "${name}" SecureString "${value}"
  ok "stored ${name} (SecureString)"
}

ensure_tag_params() {
  local p
  for p in "${SSM_IMAGE_TAG_PARAM}" "${SSM_PREVIOUS_TAG_PARAM}"; do
    if param_exists "${p}"; then
      info "SSM ${p} exists ($(awsq ssm get-parameter --name "${p}" --query Parameter.Value))"
    else
      put_param "${p}" String "${INITIAL_IMAGE_TAG:-${IMAGE_TAG_PLACEHOLDER}}"
      ok "created ${p}=${INITIAL_IMAGE_TAG:-${IMAGE_TAG_PLACEHOLDER}}"
    fi
  done
}

setup_ssm() {
  ensure_tag_params
  if ((SKIP_SECRETS)); then
    warn "--skip-secrets: not touching secret parameters"
    return 0
  fi
  local k
  IFS=' ' read -r -a req <<<"${SSM_REQUIRED_KEYS}"
  IFS=' ' read -r -a opt <<<"${SSM_OPTIONAL_KEYS}"
  for k in "${req[@]}"; do ensure_secret "${k}" required; done
  for k in "${opt[@]}"; do ensure_secret "${k}" optional; done
}

# ---- S3 --------------------------------------------------------------------------
ensure_bucket() {
  local bucket=$1 versioning=$2
  if awsq s3api head-bucket --bucket "${bucket}" >/dev/null 2>&1; then
    info "S3 bucket ${bucket} exists"
  else
    awsq s3api create-bucket --bucket "${bucket}" \
      --create-bucket-configuration "LocationConstraint=${AWS_REGION}" >/dev/null
    ok "created S3 bucket ${bucket}"
  fi
  awsq s3api put-public-access-block --bucket "${bucket}" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  awsq s3api put-bucket-encryption --bucket "${bucket}" --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
  awsq s3api put-bucket-versioning --bucket "${bucket}" --versioning-configuration "Status=${versioning}"
  awsq s3api put-bucket-tagging --bucket "${bucket}" \
    --tagging "TagSet=[{Key=Project,Value=${PROJECT}},{Key=Environment,Value=${ENV_NAME}},{Key=Name,Value=${bucket}}]"
  local BUCKET="${bucket}" policy
  policy="$(BUCKET="${BUCKET}" render_template "${INFRA_DIR}/policies/s3-tls-only.json")"
  awsq s3api put-bucket-policy --bucket "${bucket}" --policy "${policy}"
  ok "S3 ${bucket}: private, SSE-S3, TLS-only, versioning ${versioning}"
}

setup_s3() {
  local cfg bak
  cfg="$(config_bucket)"
  bak="$(backup_bucket)"
  ensure_bucket "${cfg}" Enabled
  ensure_bucket "${bak}" Suspended
  awsq s3api put-bucket-lifecycle-configuration --bucket "${bak}" --lifecycle-configuration \
    "{\"Rules\":[{\"ID\":\"expire-mongo-backups\",\"Status\":\"Enabled\",\"Filter\":{\"Prefix\":\"mongo/\"},\"Expiration\":{\"Days\":${BACKUP_RETENTION_DAYS}}}]}"
  ok "backups in s3://${bak}/mongo/ expire after ${BACKUP_RETENTION_DAYS} days"
  awsq s3api put-bucket-lifecycle-configuration --bucket "${cfg}" --lifecycle-configuration \
    '{"Rules":[{"ID":"expire-old-config-versions","Status":"Enabled","Filter":{"Prefix":""},"NoncurrentVersionExpiration":{"NoncurrentDays":30}}]}'
}

# ---- SNS -------------------------------------------------------------------------
setup_sns() {
  local arn email="${ALERT_EMAIL:-${BUDGET_EMAIL:-}}"
  arn="$(awsq sns create-topic --name "${SNS_TOPIC_NAME}" \
    --tags "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" \
    --query TopicArn)"
  ok "SNS topic ${arn}"
  if [[ -z "${email}" ]]; then
    warn "no ALERT_EMAIL/BUDGET_EMAIL set - topic has no subscriber yet"
    return 0
  fi
  local existing
  existing="$(awsq sns list-subscriptions-by-topic --topic-arn "${arn}" \
    --query "Subscriptions[?Protocol=='email' && Endpoint=='${email}'].SubscriptionArn | [0]")"
  if [[ -n "$(nn "${existing}")" ]]; then
    info "SNS email subscription for ${email} exists (${existing})"
  else
    awsq sns subscribe --topic-arn "${arn}" --protocol email --notification-endpoint "${email}" >/dev/null
    ok "subscribed ${email} - CONFIRM the subscription from the email AWS just sent"
  fi
}

# ---- Budget ----------------------------------------------------------------------
setup_budget() {
  if ((SKIP_BUDGET)); then
    warn "--skip-budget: no AWS Budget created"
    return 0
  fi
  [[ -n "${BUDGET_EMAIL:-}" ]] || die "BUDGET_EMAIL is required (or pass --skip-budget)"
  local acct
  acct="$(account_id)"
  # Budgets is a global service served from us-east-1.
  if aws budgets describe-budget --region us-east-1 --account-id "${acct}" \
      --budget-name "${BUDGET_NAME}" >/dev/null 2>&1; then
    info "budget ${BUDGET_NAME} exists"
    return 0
  fi
  local budget notifications="[" sep="" pct
  budget="{\"BudgetName\":\"${BUDGET_NAME}\",\"BudgetLimit\":{\"Amount\":\"${BUDGET_LIMIT_USD}\",\"Unit\":\"USD\"},\"TimeUnit\":\"MONTHLY\",\"BudgetType\":\"COST\"}"
  local sub="[{\"SubscriptionType\":\"EMAIL\",\"Address\":\"${BUDGET_EMAIL}\"}]"
  IFS=' ' read -r -a pcts <<<"${BUDGET_ALERT_PERCENTS}"
  for pct in "${pcts[@]}"; do
    notifications+="${sep}{\"Notification\":{\"NotificationType\":\"ACTUAL\",\"ComparisonOperator\":\"GREATER_THAN\",\"Threshold\":${pct},\"ThresholdType\":\"PERCENTAGE\"},\"Subscribers\":${sub}}"
    sep=","
  done
  notifications+="${sep}{\"Notification\":{\"NotificationType\":\"FORECASTED\",\"ComparisonOperator\":\"GREATER_THAN\",\"Threshold\":100,\"ThresholdType\":\"PERCENTAGE\"},\"Subscribers\":${sub}}]"
  aws budgets create-budget --region us-east-1 --account-id "${acct}" \
    --budget "${budget}" --notifications-with-subscribers "${notifications}"
  ok "budget ${BUDGET_NAME}: ${BUDGET_LIMIT_USD} USD/month, alerts at ${BUDGET_ALERT_PERCENTS}% actual + 100% forecast -> ${BUDGET_EMAIL}"
}

main() {
  parse_args "$@"
  preflight
  ensure_ecr_repo "${ECR_REPO_FRONTEND}"
  ensure_ecr_repo "${ECR_REPO_BACKEND}"
  setup_ssm
  setup_s3
  setup_sns
  setup_budget
  ok "bootstrap complete. ECR registry: $(ecr_registry)"
  info "next: infra/10-network.sh"
}

main "$@"

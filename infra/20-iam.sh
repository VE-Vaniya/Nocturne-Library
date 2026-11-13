#!/usr/bin/env bash
# 20-iam.sh - GitHub OIDC provider and the three least-privilege roles
# (docs/ARCHITECTURE.md section 5):
#   gha-ci      : any ref of the repo; ECR read-only on the two repos (no push)
#   gha-deploy  : production environment (main only); ECR push, image-tag params, instance refresh
#   nocturne-ec2: instance role + profile; ECR pull, /nocturne/prod/* params,
#                 config/backup S3 prefixes, SSM Session Manager, CloudWatch agent
# Policy documents live in infra/policies/*.json with __TOKEN__ placeholders
# that are rendered here (account id, region, names), so they can be reviewed
# as plain JSON. Inline policies are re-put on every run (drift is corrected).
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="20-iam"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [-h|--help]

Creates/updates the GitHub OIDC provider, roles ${ROLE_CI}, ${ROLE_DEPLOY},
${ROLE_EC2} and instance profile ${INSTANCE_PROFILE}. Prints the role ARNs to
store as GitHub repository variables.

Deploy-role trust subject: ${GITHUB_DEPLOY_SUB}
(GitHub environment '${GITHUB_DEPLOY_ENVIRONMENT}', deployment branches limited to main;
 override with GITHUB_DEPLOY_SUB)
EOF
}

# GitHub's OIDC thumbprint. AWS now validates GitHub tokens against its own
# trusted CA store, but the API still accepts/stores a thumbprint list.
GITHUB_OIDC_THUMBPRINT="${GITHUB_OIDC_THUMBPRINT:-6938fd4d98bab03faadb97b34396831e3780aea1}"

render_policy() {
  ACCOUNT_ID="$(account_id)" \
  CONFIG_BUCKET="$(config_bucket)" \
  BACKUP_BUCKET="$(backup_bucket)" \
    render_template "${INFRA_DIR}/policies/$1"
}

ensure_oidc_provider() {
  local arn
  arn="arn:aws:iam::$(account_id):oidc-provider/${OIDC_HOST}"
  if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${arn}" >/dev/null 2>&1; then
    info "OIDC provider exists: ${arn}"
    aws iam add-client-id-to-open-id-connect-provider --open-id-connect-provider-arn "${arn}" \
      --client-id sts.amazonaws.com >/dev/null 2>&1 || true
  else
    aws iam create-open-id-connect-provider \
      --url "https://${OIDC_HOST}" \
      --client-id-list sts.amazonaws.com \
      --thumbprint-list "${GITHUB_OIDC_THUMBPRINT}" \
      --tags "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" >/dev/null
    ok "created OIDC provider ${arn}"
  fi
}

# ensure_role NAME TRUST_FILE POLICY_FILE DESCRIPTION
ensure_role() {
  local name=$1 trust_file=$2 policy_file=$3 desc=$4 trust policy
  trust="$(render_policy "${trust_file}")"
  policy="$(render_policy "${policy_file}")"
  if aws iam get-role --role-name "${name}" >/dev/null 2>&1; then
    aws iam update-assume-role-policy --role-name "${name}" --policy-document "${trust}"
    info "role ${name} exists - trust policy refreshed"
  else
    aws iam create-role --role-name "${name}" \
      --assume-role-policy-document "${trust}" \
      --description "${desc}" \
      --max-session-duration 3600 \
      --tags "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" >/dev/null
    ok "created role ${name}"
  fi
  aws iam put-role-policy --role-name "${name}" --policy-name "${name}-least-privilege" \
    --policy-document "${policy}"
  ok "role ${name}: inline policy ${name}-least-privilege applied (${policy_file})"
}

attach_managed() {
  local role=$1 policy_arn=$2
  aws iam attach-role-policy --role-name "${role}" --policy-arn "${policy_arn}"
  info "role ${role}: attached ${policy_arn##*/}"
}

ensure_instance_profile() {
  if ! aws iam get-instance-profile --instance-profile-name "${INSTANCE_PROFILE}" >/dev/null 2>&1; then
    aws iam create-instance-profile --instance-profile-name "${INSTANCE_PROFILE}" \
      --tags "Key=Project,Value=${PROJECT}" "Key=Environment,Value=${ENV_NAME}" >/dev/null
    ok "created instance profile ${INSTANCE_PROFILE}"
  fi
  local roles
  roles="$(aws iam get-instance-profile --instance-profile-name "${INSTANCE_PROFILE}" \
    --output text --query 'InstanceProfile.Roles[].RoleName')"
  if [[ "${roles}" != *"${ROLE_EC2}"* ]]; then
    aws iam add-role-to-instance-profile --instance-profile-name "${INSTANCE_PROFILE}" --role-name "${ROLE_EC2}"
    ok "added ${ROLE_EC2} to ${INSTANCE_PROFILE}"
  else
    info "instance profile ${INSTANCE_PROFILE} already contains ${ROLE_EC2}"
  fi
  aws iam wait instance-profile-exists --instance-profile-name "${INSTANCE_PROFILE}"
}

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    '') ;;
    *) usage; die "unknown argument: $1" ;;
  esac
  preflight

  ensure_oidc_provider
  ensure_role "${ROLE_CI}" gha-ci-trust.json gha-ci.json \
    "GitHub Actions CI (any ref of ${GITHUB_REPO}): ECR read-only"
  ensure_role "${ROLE_DEPLOY}" gha-deploy-trust.json gha-deploy.json \
    "GitHub Actions CD (${GITHUB_DEPLOY_SUB}): ECR push + instance refresh"
  ensure_role "${ROLE_EC2}" ec2-trust.json ec2-instance.json \
    "Nocturne EC2 instances: ECR pull, SSM params, CloudWatch agent, Session Manager"
  attach_managed "${ROLE_EC2}" arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
  attach_managed "${ROLE_EC2}" arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
  ensure_instance_profile

  local acct
  acct="$(account_id)"
  ok "IAM ready. Set these GitHub repository variables (Settings > Secrets and variables > Actions > Variables):"
  printf '  AWS_REGION=%s\n' "${AWS_REGION}"
  printf '  AWS_CI_ROLE_ARN=arn:aws:iam::%s:role/%s\n' "${acct}" "${ROLE_CI}"
  printf '  AWS_DEPLOY_ROLE_ARN=arn:aws:iam::%s:role/%s\n' "${acct}" "${ROLE_DEPLOY}"
  printf '  ECR_REGISTRY=%s\n' "$(ecr_registry)"
  printf '  ASG_NAME=%s\n' "${ASG_NAME}"
  printf '  CONFIG_BUCKET=%s\n' "$(config_bucket)"
  info "next: infra/30-security-groups.sh"
}

main "$@"

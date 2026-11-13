#!/usr/bin/env bash
# 30-security-groups.sh - security groups (docs/ARCHITECTURE.md section 4).
#
#   sg-alb  in : 80, 443 from 0.0.0.0/0
#           out: 8080, 5000 -> sg-app only (default allow-all egress removed)
#   sg-app  in : 8080, 5000 from sg-alb only. NO port 22 (SSM Session Manager).
#           out: 443 (ECR, SSM, CloudWatch, S3, Google Books, GitHub for the
#                compose plugin), 27017 (MongoDB Atlas; Atlas itself only
#                allows the NAT EIP), 465 (Gmail SMTPS).
#           DNS (VPC resolver), IMDS and NTP (169.254.x) are not SG-filtered.
# Rules are added idempotently (duplicates ignored).
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="30-security-groups"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [-h|--help]

Creates/reconciles ${SG_ALB_NAME} and ${SG_APP_NAME} in ${VPC_NAME}.
EOF
}

ensure_sg() {
  local vpc=$1 name=$2 desc=$3 id
  id="$(sg_id "${name}")"
  if [[ -z "${id}" ]]; then
    id="$(awsq ec2 create-security-group --vpc-id "${vpc}" --group-name "${name}" \
      --description "${desc}" \
      --tag-specifications "$(ec2_tag_spec security-group "${name}")" --query GroupId)"
    ok "created security group ${name} ${id}"
  else
    info "security group ${name} exists: ${id}"
  fi
  printf '%s' "${id}"
}

# sg_rule ingress|egress SG_ID IP_PERMISSIONS DESCRIPTION
sg_rule() {
  local direction=$1 sg=$2 perms=$3 what=$4 err
  if err="$(awsq ec2 "authorize-security-group-${direction}" --group-id "${sg}" \
      --ip-permissions "${perms}" \
      --tag-specifications "ResourceType=security-group-rule,Tags=[{Key=Project,Value=${PROJECT}}]" \
      2>&1 >/dev/null)"; then
    ok "${sg} ${direction}: ${what}"
  elif [[ "${err}" == *InvalidPermission.Duplicate* ]]; then
    info "${sg} ${direction}: ${what} (already present)"
  else
    die "${sg} ${direction} ${what}: ${err}"
  fi
}

revoke_default_egress() {
  local sg=$1 err
  if err="$(awsq ec2 revoke-security-group-egress --group-id "${sg}" \
      --ip-permissions 'IpProtocol=-1,IpRanges=[{CidrIp=0.0.0.0/0}]' 2>&1 >/dev/null)"; then
    ok "${sg}: removed default allow-all egress"
  elif [[ "${err}" == *InvalidPermission.NotFound* ]]; then
    info "${sg}: default allow-all egress already removed"
  else
    die "revoke default egress on ${sg}: ${err}"
  fi
}

tcp_from_cidr() { printf 'IpProtocol=tcp,FromPort=%s,ToPort=%s,IpRanges=[{CidrIp=0.0.0.0/0,Description="%s"}]' "$1" "$1" "$2"; }
tcp_to_cidr()   { tcp_from_cidr "$@"; }
tcp_sg()        { printf 'IpProtocol=tcp,FromPort=%s,ToPort=%s,UserIdGroupPairs=[{GroupId=%s,Description="%s"}]' "$1" "$1" "$2" "$3"; }

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    '') ;;
    *) usage; die "unknown argument: $1" ;;
  esac
  preflight

  local vpc alb app
  vpc="$(require_vpc)"
  alb="$(ensure_sg "${vpc}" "${SG_ALB_NAME}" "Nocturne ALB: HTTP/HTTPS from the internet")"
  app="$(ensure_sg "${vpc}" "${SG_APP_NAME}" "Nocturne app instances: only from the ALB, no SSH")"

  # ---- ALB ----
  sg_rule ingress "${alb}" "$(tcp_from_cidr 80 'HTTP from internet')" "tcp/80 from 0.0.0.0/0"
  sg_rule ingress "${alb}" "$(tcp_from_cidr 443 'HTTPS from internet')" "tcp/443 from 0.0.0.0/0"
  revoke_default_egress "${alb}"
  sg_rule egress "${alb}" "$(tcp_sg "${WEB_PORT}" "${app}" 'to frontend containers')" "tcp/${WEB_PORT} -> ${SG_APP_NAME}"
  sg_rule egress "${alb}" "$(tcp_sg "${API_PORT}" "${app}" 'to backend containers')" "tcp/${API_PORT} -> ${SG_APP_NAME}"

  # ---- app instances ----
  sg_rule ingress "${app}" "$(tcp_sg "${WEB_PORT}" "${alb}" 'frontend from ALB')" "tcp/${WEB_PORT} from ${SG_ALB_NAME}"
  sg_rule ingress "${app}" "$(tcp_sg "${API_PORT}" "${alb}" 'backend from ALB')" "tcp/${API_PORT} from ${SG_ALB_NAME}"
  revoke_default_egress "${app}"
  sg_rule egress "${app}" "$(tcp_to_cidr 443 'HTTPS to AWS APIs ECR S3 Google Books GitHub')" "tcp/443 -> 0.0.0.0/0"
  sg_rule egress "${app}" "$(tcp_to_cidr 27017 'MongoDB Atlas - Atlas allowlists only the NAT EIP')" "tcp/27017 -> 0.0.0.0/0"
  sg_rule egress "${app}" "$(tcp_to_cidr 465 'Gmail SMTPS')" "tcp/465 -> 0.0.0.0/0"

  # Guard rail: fail loudly if anyone opened SSH on the app SG.
  local ssh
  ssh="$(awsq ec2 describe-security-groups --group-ids "${app}" \
    --query "SecurityGroups[0].IpPermissions[?FromPort<=\`22\` && ToPort>=\`22\`] | length(@)")"
  [[ "${ssh}" == "0" ]] || die "${SG_APP_NAME} allows port 22 - remove it (use SSM Session Manager)"

  ok "security groups ready: alb=${alb} app=${app}"
  info "next: infra/40-alb.sh"
}

main "$@"

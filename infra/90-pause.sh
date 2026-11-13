#!/usr/bin/env bash
# 90-pause.sh - stop paying for compute + NAT between work sessions.
#
#   pause : ASG min/desired -> 0 (instances terminate), NAT gateway deleted.
#           The NAT Elastic IP is KEPT so the Atlas access list stays valid
#           (an unattached EIP costs ~0.005 USD/h). The ALB keeps running
#           (~0.6 USD/day); delete it with 99-teardown.sh if pausing for weeks.
#   resume: recreate the NAT (10-network.sh, same EIP), ASG back to
#           ASG_MIN/ASG_DESIRED from config.env.
# DO NOT pause during the grading window - the live link must stay up.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="90-pause"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") pause|resume|status

  pause    scale ${ASG_NAME} to 0 and delete the NAT gateway (keeps the EIP)
  resume   recreate the NAT gateway and scale back to ${ASG_MIN}/${ASG_DESIRED}/${ASG_MAX}
  status   show ASG capacity and NAT state
EOF
}

status() {
  awsq autoscaling describe-auto-scaling-groups --auto-scaling-group-names "${ASG_NAME}" \
    --query 'AutoScalingGroups[0].[MinSize,DesiredCapacity,MaxSize,length(Instances)]' \
    | { read -r min des max n; info "ASG ${ASG_NAME}: min=${min} desired=${des} max=${max} instances=${n}"; }
  local nat
  nat="$(ec2_id_by_name describe-nat-gateways 'NatGateways[0].[NatGatewayId,State]' "${NAT_NAME}" \
    "Name=state,Values=pending,available,deleting")"
  info "NAT ${NAT_NAME}: ${nat:-none}"
}

pause() {
  awsq autoscaling update-auto-scaling-group --auto-scaling-group-name "${ASG_NAME}" \
    --min-size 0 --desired-capacity 0
  ok "ASG ${ASG_NAME} scaled to 0"
  local nat
  nat="$(ec2_id_by_name describe-nat-gateways 'NatGateways[0].NatGatewayId' "${NAT_NAME}" \
    "Name=state,Values=pending,available")"
  if [[ -n "${nat}" ]]; then
    awsq ec2 delete-nat-gateway --nat-gateway-id "${nat}" >/dev/null
    awsq ec2 wait nat-gateway-deleted --nat-gateway-ids "${nat}"
    ok "NAT gateway ${nat} deleted (EIP kept)"
  else
    info "no NAT gateway running"
  fi
}

resume() {
  "${INFRA_DIR}/10-network.sh"
  awsq autoscaling update-auto-scaling-group --auto-scaling-group-name "${ASG_NAME}" \
    --min-size "${ASG_MIN}" --max-size "${ASG_MAX}" --desired-capacity "${ASG_DESIRED}"
  ok "ASG ${ASG_NAME} back to ${ASG_MIN}/${ASG_DESIRED}/${ASG_MAX} - instances healthy in ~4 min"
}

main() {
  [[ $# -eq 1 ]] || { usage; exit 2; }
  case "$1" in
    -h|--help) usage; exit 0 ;;
    pause|resume|status) preflight; "$1" ;;
    *) usage; die "unknown command: $1" ;;
  esac
}

main "$@"

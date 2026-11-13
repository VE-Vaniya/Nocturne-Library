#!/usr/bin/env bash
# 99-teardown.sh - delete the Nocturne stack in reverse creation order.
#
# Default (infra layers 60 -> 20): alarms, dashboard, metric filter, ASG +
# instances, launch template, ALB, target groups, security groups, VPC
# endpoint, NAT gateway, Elastic IP, route tables, IGW, subnets, VPC, IAM
# roles / instance profile / OIDC provider.
# --all additionally deletes bootstrap resources that hold DATA: ECR repos
# (all images), SSM parameters (secrets), S3 buckets (config + Mongo backups),
# log groups, SNS topic and the budget.
#
# DO NOT RUN BEFORE GRADING IS COMPLETE. Requires --yes.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="99-teardown"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") --yes [--all] [--keep-eip]

  --yes        Required. Confirms you really want to delete resources.
  --all        Also delete ECR repos + images, SSM parameters, S3 buckets,
               log groups, SNS topic and the AWS Budget (irreversible).
  --keep-eip   Keep the NAT Elastic IP (Atlas allowlist stays valid; billed
               while unattached, ~3.6 USD/month).
EOF
}

YES=0
ALL=0
KEEP_EIP=0

quiet() { "$@" >/dev/null 2>&1 || true; }

teardown_observability() {
  info "deleting alarms, dashboard, metric filter"
  quiet awsq cloudwatch delete-alarms --alarm-names nocturne-alb-5xx-rate \
    nocturne-tg-web-unhealthy-hosts nocturne-tg-api-unhealthy-hosts \
    nocturne-asg-high-cpu nocturne-db-connection-errors
  quiet awsq cloudwatch delete-dashboards --dashboard-names "${DASHBOARD_NAME}"
  quiet awsq logs delete-metric-filter --log-group-name "${LOG_GROUP_CONTAINERS}" \
    --filter-name nocturne-db-connection-errors
}

asg_gone() {
  [[ -z "$(nn "$(awsq autoscaling describe-auto-scaling-groups --auto-scaling-group-names "${ASG_NAME}" \
    --query 'AutoScalingGroups[0].AutoScalingGroupName')")" ]]
}

teardown_compute() {
  if ! asg_gone; then
    info "deleting ASG ${ASG_NAME} (terminates its instances)"
    awsq autoscaling delete-auto-scaling-group --auto-scaling-group-name "${ASG_NAME}" --force-delete
    wait_until "ASG ${ASG_NAME} deletion" 900 15 asg_gone
    ok "ASG deleted"
  fi
  if awsq ec2 describe-launch-templates --launch-template-names "${LT_NAME}" >/dev/null 2>&1; then
    awsq ec2 delete-launch-template --launch-template-name "${LT_NAME}" >/dev/null
    ok "launch template deleted"
  fi
}

teardown_alb() {
  local alb tg
  alb="$(alb_arn)"
  if [[ -n "${alb}" ]]; then
    awsq elbv2 delete-load-balancer --load-balancer-arn "${alb}"
    awsq elbv2 wait load-balancers-deleted --load-balancer-arns "${alb}"
    ok "ALB deleted"
  fi
  for tg in "${TG_WEB_NAME}" "${TG_API_NAME}"; do
    local arn
    arn="$(tg_arn "${tg}")"
    if [[ -n "${arn}" ]]; then
      awsq elbv2 delete-target-group --target-group-arn "${arn}"
      ok "target group ${tg} deleted"
    fi
  done
}

delete_sg_with_retry() {
  local id=$1 name=$2 i
  for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if awsq ec2 delete-security-group --group-id "${id}" >/dev/null 2>&1; then
      ok "security group ${name} deleted"
      return 0
    fi
    info "security group ${name} still in use (ENIs draining), retry ${i}/12"
    sleep 10
  done
  die "could not delete security group ${name} (${id})"
}

teardown_security_groups() {
  local alb app
  alb="$(sg_id "${SG_ALB_NAME}")"
  app="$(sg_id "${SG_APP_NAME}")"
  # Remove the cross references first, otherwise neither group can be deleted.
  if [[ -n "${alb}" && -n "${app}" ]]; then
    quiet awsq ec2 revoke-security-group-egress --group-id "${alb}" --ip-permissions \
      "IpProtocol=tcp,FromPort=${WEB_PORT},ToPort=${WEB_PORT},UserIdGroupPairs=[{GroupId=${app}}]" \
      "IpProtocol=tcp,FromPort=${API_PORT},ToPort=${API_PORT},UserIdGroupPairs=[{GroupId=${app}}]"
    quiet awsq ec2 revoke-security-group-ingress --group-id "${app}" --ip-permissions \
      "IpProtocol=tcp,FromPort=${WEB_PORT},ToPort=${WEB_PORT},UserIdGroupPairs=[{GroupId=${alb}}]" \
      "IpProtocol=tcp,FromPort=${API_PORT},ToPort=${API_PORT},UserIdGroupPairs=[{GroupId=${alb}}]"
  fi
  [[ -z "${app}" ]] || delete_sg_with_retry "${app}" "${SG_APP_NAME}"
  [[ -z "${alb}" ]] || delete_sg_with_retry "${alb}" "${SG_ALB_NAME}"
}

teardown_network() {
  local vpc
  vpc="$(vpc_id)"
  local nat
  nat="$(ec2_id_by_name describe-nat-gateways 'NatGateways[0].NatGatewayId' "${NAT_NAME}" \
    "Name=state,Values=pending,available,deleting")"
  if [[ -n "${nat}" ]]; then
    quiet awsq ec2 delete-nat-gateway --nat-gateway-id "${nat}"
    info "deleting NAT gateway ${nat} (1-2 minutes)"
    awsq ec2 wait nat-gateway-deleted --nat-gateway-ids "${nat}"
    ok "NAT gateway deleted"
  fi
  local alloc
  alloc="$(nn "$(awsq ec2 describe-addresses \
    --filters "Name=tag:Name,Values=${NAT_EIP_NAME}" "Name=tag:Project,Values=${PROJECT}" \
    --query 'Addresses[0].AllocationId')")"
  if [[ -n "${alloc}" ]]; then
    if ((KEEP_EIP)); then
      warn "keeping Elastic IP ${alloc} (--keep-eip)"
    else
      awsq ec2 release-address --allocation-id "${alloc}"
      ok "Elastic IP released (remove it from the Atlas access list)"
    fi
  fi
  [[ -n "${vpc}" ]] || { info "VPC ${VPC_NAME} already gone"; return 0; }

  local ep
  for ep in $(awsq ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=${vpc}" \
      --query 'VpcEndpoints[].VpcEndpointId' | tr '\t' '\n'); do
    [[ -n "$(nn "${ep}")" ]] || continue
    awsq ec2 delete-vpc-endpoints --vpc-endpoint-ids "${ep}" >/dev/null
    ok "VPC endpoint ${ep} deleted"
  done

  local rt assoc
  # shellcheck disable=SC2016  # backticks are JMESPath literals
  for rt in $(awsq ec2 describe-route-tables --filters "Name=vpc-id,Values=${vpc}" \
      --query 'RouteTables[?!(Associations[?Main==`true`])].RouteTableId' | tr '\t' '\n'); do
    [[ -n "$(nn "${rt}")" ]] || continue
    for assoc in $(awsq ec2 describe-route-tables --route-table-ids "${rt}" \
        --query 'RouteTables[0].Associations[].RouteTableAssociationId' | tr '\t' '\n'); do
      if [[ -n "$(nn "${assoc}")" ]]; then awsq ec2 disassociate-route-table --association-id "${assoc}"; fi
    done
    awsq ec2 delete-route-table --route-table-id "${rt}"
    ok "route table ${rt} deleted"
  done

  local igw
  for igw in $(awsq ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=${vpc}" \
      --query 'InternetGateways[].InternetGatewayId' | tr '\t' '\n'); do
    [[ -n "$(nn "${igw}")" ]] || continue
    awsq ec2 detach-internet-gateway --internet-gateway-id "${igw}" --vpc-id "${vpc}"
    awsq ec2 delete-internet-gateway --internet-gateway-id "${igw}"
    ok "internet gateway ${igw} deleted"
  done

  local sn
  for sn in $(awsq ec2 describe-subnets --filters "Name=vpc-id,Values=${vpc}" \
      --query 'Subnets[].SubnetId' | tr '\t' '\n'); do
    [[ -n "$(nn "${sn}")" ]] || continue
    awsq ec2 delete-subnet --subnet-id "${sn}"
    ok "subnet ${sn} deleted"
  done

  awsq ec2 delete-vpc --vpc-id "${vpc}"
  ok "VPC ${vpc} deleted"
}

delete_role() {
  local role=$1 p
  aws iam get-role --role-name "${role}" >/dev/null 2>&1 || return 0
  for p in $(aws iam list-role-policies --role-name "${role}" --output text --query 'PolicyNames[]' | tr '\t' '\n'); do
    if [[ -n "$(nn "${p}")" ]]; then aws iam delete-role-policy --role-name "${role}" --policy-name "${p}"; fi
  done
  for p in $(aws iam list-attached-role-policies --role-name "${role}" --output text \
      --query 'AttachedPolicies[].PolicyArn' | tr '\t' '\n'); do
    if [[ -n "$(nn "${p}")" ]]; then aws iam detach-role-policy --role-name "${role}" --policy-arn "${p}"; fi
  done
  aws iam delete-role --role-name "${role}"
  ok "role ${role} deleted"
}

teardown_iam() {
  if aws iam get-instance-profile --instance-profile-name "${INSTANCE_PROFILE}" >/dev/null 2>&1; then
    quiet aws iam remove-role-from-instance-profile --instance-profile-name "${INSTANCE_PROFILE}" --role-name "${ROLE_EC2}"
    aws iam delete-instance-profile --instance-profile-name "${INSTANCE_PROFILE}"
    ok "instance profile deleted"
  fi
  delete_role "${ROLE_EC2}"
  delete_role "${ROLE_DEPLOY}"
  delete_role "${ROLE_CI}"
  local arn
  arn="arn:aws:iam::$(account_id):oidc-provider/${OIDC_HOST}"
  if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${arn}" >/dev/null 2>&1; then
    aws iam delete-open-id-connect-provider --open-id-connect-provider-arn "${arn}"
    ok "OIDC provider deleted"
  fi
}

empty_and_delete_bucket() {
  local bucket=$1 batch
  awsq s3api head-bucket --bucket "${bucket}" >/dev/null 2>&1 || return 0
  batch="$(mktemp)"
  while :; do
    # shellcheck disable=SC2016  # backticks are JMESPath literals
    awsq s3api list-object-versions --bucket "${bucket}" --max-items 500 --output json \
      --query '{Objects: [Versions, DeleteMarkers][][].{Key: Key, VersionId: VersionId}, Quiet: `true`}' \
      >"${batch}"
    grep -q '"Key"' "${batch}" || break
    awsq s3api delete-objects --bucket "${bucket}" --delete "file://${batch}" >/dev/null
  done
  rm -f "${batch}"
  awsq s3api delete-bucket --bucket "${bucket}"
  ok "bucket ${bucket} deleted"
}

teardown_data() {
  local repo name
  for repo in "${ECR_REPO_FRONTEND}" "${ECR_REPO_BACKEND}"; do
    if awsq ecr describe-repositories --repository-names "${repo}" >/dev/null 2>&1; then
      awsq ecr delete-repository --repository-name "${repo}" --force >/dev/null
      ok "ECR repo ${repo} deleted (with images)"
    fi
  done
  for name in $(awsq ssm get-parameters-by-path --path "${SSM_PREFIX}" --recursive \
      --query 'Parameters[].Name' | tr '\t' '\n'); do
    [[ -n "$(nn "${name}")" ]] || continue
    awsq ssm delete-parameter --name "${name}"
    ok "SSM ${name} deleted"
  done
  empty_and_delete_bucket "$(config_bucket)"
  empty_and_delete_bucket "$(backup_bucket)"
  local lg
  for lg in "${LOG_GROUP_CONTAINERS}" "${LOG_GROUP_BOOTSTRAP}"; do
    quiet awsq logs delete-log-group --log-group-name "${lg}"
  done
  ok "log groups deleted"
  quiet awsq sns delete-topic --topic-arn "$(sns_topic_arn)"
  ok "SNS topic deleted"
  quiet aws budgets delete-budget --region us-east-1 --account-id "$(account_id)" --budget-name "${BUDGET_NAME}"
  ok "budget deleted"
}

main() {
  while (($#)); do
    case "$1" in
      --yes) YES=1; shift ;;
      --all) ALL=1; shift ;;
      --keep-eip) KEEP_EIP=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) usage; die "unknown argument: $1" ;;
    esac
  done
  if ((!YES)); then
    usage
    die "refusing to delete anything without --yes"
  fi
  preflight
  warn "tearing down ${PROJECT} in account $(account_id) / ${AWS_REGION} (all=${ALL})"

  teardown_observability
  teardown_compute
  teardown_alb
  teardown_security_groups
  teardown_network
  teardown_iam
  if ((ALL)); then
    teardown_data
  else
    info "kept ECR images, SSM parameters, S3 buckets, log groups, SNS, budget (use --all to delete)"
  fi
  ok "teardown complete"
}

main "$@"

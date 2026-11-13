#!/usr/bin/env bash
# 50-compute.sh - runtime config upload, launch template, Auto Scaling Group,
# target tracking policy (docs/ARCHITECTURE.md sections 3, 6, 7).
#
#   * uploads docker-compose.yml + docker-compose.prod.yml, the rendered
#     CloudWatch agent config and ops helper scripts to the private config
#     bucket (instances download them at boot via the S3 gateway endpoint)
#   * launch template nocturne-lt: Amazon Linux 2023 resolved at launch from the
#     public SSM parameter (every instance refresh picks up the patched AMI),
#     t3.micro (standard CPU credits: no surprise burst charges), IMDSv2
#     required with hop limit 1 (containers cannot reach instance credentials),
#     encrypted gp3 root, nocturne-ec2 instance profile, sg-app, no key pair,
#     user data rendered from infra/user-data.sh. A new LT version is created
#     only when the rendered data changes (sha256 kept in a tag).
#   * ASG nocturne-asg: private-app-a + private-app-b, min/desired/max 2/2/4,
#     attached to both target groups, ELB health checks, grace 120s, default
#     instance warmup 120s, 1-minute group metrics
#   * target tracking: CPU 50% (default) or ALBRequestCountPerTarget
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="50-compute"
# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --refresh            After updating the launch template, start an instance
                       refresh (MinHealthy ${REFRESH_MIN_HEALTHY}%, warmup ${INSTANCE_WARMUP}s) and wait.
  --skip-image-check   Do not verify that the images for the current tag exist in ECR.
  --wait               Wait until the target groups report ${ASG_DESIRED} healthy targets.
  -h, --help           Show this help.

Environment overrides: INSTANCE_TYPE, ASG_MIN/ASG_MAX/ASG_DESIRED,
SCALING_METRIC=cpu|requests, CPU_TARGET, REQUESTS_PER_TARGET (see config.env).
EOF
}

DO_REFRESH=0
SKIP_IMAGE_CHECK=0
DO_WAIT=0

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | cut -d' ' -f1
  else
    shasum -a 256 | cut -d' ' -f1
  fi
}

check_image_tag() {
  local tag repo
  tag="$(nn "$(awsq ssm get-parameter --name "${SSM_IMAGE_TAG_PARAM}" --query Parameter.Value 2>/dev/null || true)")"
  if [[ -z "${tag}" || "${tag}" == "${IMAGE_TAG_PLACEHOLDER}" ]]; then
    die "${SSM_IMAGE_TAG_PARAM} is not set. Push the first images (docs/DEPLOY.md step 6) and run:
    aws ssm put-parameter --name ${SSM_IMAGE_TAG_PARAM} --type String --overwrite --value <tag>"
  fi
  if ((SKIP_IMAGE_CHECK)); then
    warn "skipping ECR image check for tag ${tag}"
    return 0
  fi
  for repo in "${ECR_REPO_FRONTEND}" "${ECR_REPO_BACKEND}"; do
    awsq ecr describe-images --repository-name "${repo}" --image-ids "imageTag=${tag}" >/dev/null 2>&1 \
      || die "image ${repo}:${tag} not found in ECR"
  done
  ok "images for tag ${tag} present in ECR"
}

upload_runtime_config() {
  local bucket cw_rendered
  bucket="$(config_bucket)"
  awsq s3 cp "${REPO_ROOT}/docker-compose.yml" "s3://${bucket}/compose/docker-compose.yml" --only-show-errors
  awsq s3 cp "${REPO_ROOT}/docker-compose.prod.yml" "s3://${bucket}/compose/docker-compose.prod.yml" --only-show-errors
  cw_rendered="$(render_template "${INFRA_DIR}/cloudwatch-agent.json")"
  printf '%s\n' "${cw_rendered}" | awsq s3 cp - "s3://${bucket}/config/cloudwatch-agent.json" --only-show-errors
  local s
  for s in healthcheck.sh backup-mongo.sh restore-mongo.sh; do
    if [[ -f "${REPO_ROOT}/scripts/${s}" ]]; then
      awsq s3 cp "${REPO_ROOT}/scripts/${s}" "s3://${bucket}/config/bin/${s}" --only-show-errors
    fi
  done
  ok "runtime config uploaded to s3://${bucket}/{compose,config}/"
}

# Prints the launch template data JSON.
launch_template_data() {
  local sg=$1 user_data
  user_data="$(
    CONFIG_BUCKET="$(config_bucket)" ECR_REGISTRY="$(ecr_registry)" \
      render_template "${INFRA_DIR}/user-data.sh" | base64 | tr -d '\n'
  )"
  local tags="[{\"Key\":\"Name\",\"Value\":\"${INSTANCE_NAME}\"},{\"Key\":\"Project\",\"Value\":\"${PROJECT}\"},{\"Key\":\"Environment\",\"Value\":\"${ENV_NAME}\"}]"
  cat <<JSON
{
  "ImageId": "resolve:ssm:${AMI_SSM_PARAM}",
  "InstanceType": "${INSTANCE_TYPE}",
  "IamInstanceProfile": { "Name": "${INSTANCE_PROFILE}" },
  "SecurityGroupIds": ["${sg}"],
  "MetadataOptions": {
    "HttpEndpoint": "enabled",
    "HttpTokens": "required",
    "HttpPutResponseHopLimit": 1
  },
  "BlockDeviceMappings": [{
    "DeviceName": "/dev/xvda",
    "Ebs": { "VolumeSize": ${ROOT_VOLUME_GB}, "VolumeType": "gp3", "Encrypted": true, "DeleteOnTermination": true }
  }],
  "CreditSpecification": { "CpuCredits": "standard" },
  "Monitoring": { "Enabled": false },
  "TagSpecifications": [
    { "ResourceType": "instance", "Tags": ${tags} },
    { "ResourceType": "volume", "Tags": ${tags} }
  ],
  "UserData": "${user_data}"
}
JSON
}

ensure_launch_template() {
  local sg=$1 data digest current version
  data="$(launch_template_data "${sg}")"
  digest="$(printf '%s' "${data}" | sha256)"
  if ! awsq ec2 describe-launch-templates --launch-template-names "${LT_NAME}" >/dev/null 2>&1; then
    awsq ec2 create-launch-template --launch-template-name "${LT_NAME}" \
      --version-description "initial" --launch-template-data "${data}" \
      --tag-specifications "ResourceType=launch-template,Tags=[{Key=Name,Value=${LT_NAME}},{Key=Project,Value=${PROJECT}},{Key=Environment,Value=${ENV_NAME}},{Key=DataSha256,Value=${digest}}]" \
      >/dev/null
    ok "created launch template ${LT_NAME}"
    LT_CHANGED=1
    return 0
  fi
  current="$(nn "$(awsq ec2 describe-launch-templates --launch-template-names "${LT_NAME}" \
    --query "LaunchTemplates[0].Tags[?Key=='DataSha256'].Value | [0]")")"
  if [[ "${current}" == "${digest}" ]]; then
    info "launch template ${LT_NAME} up to date"
    LT_CHANGED=0
    return 0
  fi
  version="$(awsq ec2 create-launch-template-version --launch-template-name "${LT_NAME}" \
    --version-description "$(date -u +%Y%m%dT%H%M%SZ)" --launch-template-data "${data}" \
    --query LaunchTemplateVersion.VersionNumber)"
  awsq ec2 modify-launch-template --launch-template-name "${LT_NAME}" --default-version "${version}" >/dev/null
  local lt_id
  lt_id="$(awsq ec2 describe-launch-templates --launch-template-names "${LT_NAME}" \
    --query 'LaunchTemplates[0].LaunchTemplateId')"
  awsq ec2 create-tags --resources "${lt_id}" --tags "Key=DataSha256,Value=${digest}"
  ok "launch template ${LT_NAME}: new default version ${version}"
  LT_CHANGED=1
}

asg_exists() {
  [[ -n "$(nn "$(awsq autoscaling describe-auto-scaling-groups --auto-scaling-group-names "${ASG_NAME}" \
    --query 'AutoScalingGroups[0].AutoScalingGroupName')")" ]]
}

ensure_asg() {
  local subnets=$1 web=$2 api=$3
  local lt="LaunchTemplateName=${LT_NAME},Version=\$Default"
  if asg_exists; then
    awsq autoscaling update-auto-scaling-group --auto-scaling-group-name "${ASG_NAME}" \
      --launch-template "${lt}" --min-size "${ASG_MIN}" --max-size "${ASG_MAX}" \
      --vpc-zone-identifier "${subnets}" \
      --health-check-type ELB --health-check-grace-period "${ASG_HEALTH_GRACE}" \
      --default-instance-warmup "${INSTANCE_WARMUP}"
    awsq autoscaling attach-load-balancer-target-groups --auto-scaling-group-name "${ASG_NAME}" \
      --target-group-arns "${web}" "${api}"
    info "ASG ${ASG_NAME} exists - settings reconciled (desired capacity untouched)"
  else
    awsq autoscaling create-auto-scaling-group --auto-scaling-group-name "${ASG_NAME}" \
      --launch-template "${lt}" \
      --min-size "${ASG_MIN}" --max-size "${ASG_MAX}" --desired-capacity "${ASG_DESIRED}" \
      --vpc-zone-identifier "${subnets}" \
      --target-group-arns "${web}" "${api}" \
      --health-check-type ELB --health-check-grace-period "${ASG_HEALTH_GRACE}" \
      --default-instance-warmup "${INSTANCE_WARMUP}" \
      --tags \
        "ResourceId=${ASG_NAME},ResourceType=auto-scaling-group,Key=Project,Value=${PROJECT},PropagateAtLaunch=true" \
        "ResourceId=${ASG_NAME},ResourceType=auto-scaling-group,Key=Environment,Value=${ENV_NAME},PropagateAtLaunch=true" \
        "ResourceId=${ASG_NAME},ResourceType=auto-scaling-group,Key=Name,Value=${INSTANCE_NAME},PropagateAtLaunch=true"
    ok "created ASG ${ASG_NAME} (${ASG_MIN}/${ASG_DESIRED}/${ASG_MAX}) across ${subnets}"
  fi
  awsq autoscaling enable-metrics-collection --auto-scaling-group-name "${ASG_NAME}" --granularity 1Minute
}

ensure_scaling_policy() {
  local web=$1 cfg
  case "${SCALING_METRIC}" in
    cpu)
      cfg="{\"PredefinedMetricSpecification\":{\"PredefinedMetricType\":\"ASGAverageCPUUtilization\"},\"TargetValue\":${CPU_TARGET},\"DisableScaleIn\":false}"
      ;;
    requests)
      local alb label
      alb="$(alb_arn)"
      [[ -n "${alb}" ]] || die "ALB not found - run infra/40-alb.sh"
      # ResourceLabel = app/<alb>/<id>/targetgroup/<tg>/<id>
      label="${alb#*:loadbalancer/}/targetgroup/${web#*:targetgroup/}"
      cfg="{\"PredefinedMetricSpecification\":{\"PredefinedMetricType\":\"ALBRequestCountPerTarget\",\"ResourceLabel\":\"${label}\"},\"TargetValue\":${REQUESTS_PER_TARGET},\"DisableScaleIn\":false}"
      ;;
    *) die "SCALING_METRIC must be cpu or requests (got ${SCALING_METRIC})" ;;
  esac
  awsq autoscaling put-scaling-policy --auto-scaling-group-name "${ASG_NAME}" \
    --policy-name "${SCALING_POLICY_NAME}" --policy-type TargetTrackingScaling \
    --target-tracking-configuration "${cfg}" >/dev/null
  ok "target tracking policy ${SCALING_POLICY_NAME}: ${SCALING_METRIC}"
}

healthy_count() {
  awsq elbv2 describe-target-health --target-group-arn "$1" \
    --query "length(TargetHealthDescriptions[?TargetHealth.State=='healthy'])"
}

targets_healthy() {
  local web=$1 api=$2 w a
  w="$(healthy_count "${web}")"
  a="$(healthy_count "${api}")"
  info "healthy targets: web=${w} api=${a} (want ${ASG_DESIRED})"
  ((w >= ASG_DESIRED && a >= ASG_DESIRED))
}

main() {
  while (($#)); do
    case "$1" in
      --refresh) DO_REFRESH=1; shift ;;
      --skip-image-check) SKIP_IMAGE_CHECK=1; shift ;;
      --wait) DO_WAIT=1; shift ;;
      -h|--help) usage; exit 0 ;;
      *) usage; die "unknown argument: $1" ;;
    esac
  done
  preflight
  require_vpc >/dev/null

  local sg sub_a sub_b web api
  sg="$(sg_id "${SG_APP_NAME}")"
  [[ -n "${sg}" ]] || die "${SG_APP_NAME} not found - run infra/30-security-groups.sh"
  sub_a="$(subnet_id "${PROJECT}-private-app-a")"
  sub_b="$(subnet_id "${PROJECT}-private-app-b")"
  [[ -n "${sub_a}" && -n "${sub_b}" ]] || die "private subnets not found - run infra/10-network.sh"
  web="$(tg_arn "${TG_WEB_NAME}")"
  api="$(tg_arn "${TG_API_NAME}")"
  [[ -n "${web}" && -n "${api}" ]] || die "target groups not found - run infra/40-alb.sh"
  aws iam get-instance-profile --instance-profile-name "${INSTANCE_PROFILE}" >/dev/null 2>&1 \
    || die "instance profile ${INSTANCE_PROFILE} not found - run infra/20-iam.sh"

  check_image_tag
  upload_runtime_config
  LT_CHANGED=0
  ensure_launch_template "${sg}"
  local had_asg=0
  if asg_exists; then had_asg=1; fi
  ensure_asg "${sub_a},${sub_b}" "${web}" "${api}"
  ensure_scaling_policy "${web}"

  if ((had_asg && LT_CHANGED)); then
    if ((DO_REFRESH)); then
      "${REPO_ROOT}/scripts/deploy.sh" --refresh-only
    else
      warn "launch template changed but running instances use the old version;"
      warn "run with --refresh (or scripts/deploy.sh --refresh-only) to roll them"
    fi
  fi

  if ((DO_WAIT)); then
    wait_until "healthy targets" 900 20 targets_healthy "${web}" "${api}"
  fi
  ok "compute ready: ASG ${ASG_NAME} (instances take ~3-4 min to boot and pass health checks)"
  info "next: infra/60-observability.sh"
}

main "$@"

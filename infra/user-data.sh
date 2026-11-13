#!/usr/bin/env bash
# user-data.sh - EC2 boot script for Nocturne app instances (Amazon Linux 2023).
#
# This file is a TEMPLATE: infra/50-compute.sh fills in the placeholder values (double-underscore names)
# and puts the result into the launch template. It contains NO secrets.
#
# Boot sequence:
#   1. install docker, the docker compose plugin (pinned, sha256-verified) and
#      amazon-cloudwatch-agent
#   2. download runtime config from the private config bucket (S3 gateway
#      endpoint): docker-compose.yml + docker-compose.prod.yml (uploaded by
#      50-compute.sh / scripts/deploy.sh from the repo), the rendered CloudWatch
#      agent config and the ops helper scripts
#   3. start the CloudWatch agent (container logs + memory/disk metrics)
#   4. read /nocturne/prod/* from SSM Parameter Store (SecureStrings decrypted)
#      into /opt/nocturne/.env (root:root, 0600) - secrets never touch the AMI,
#      launch template, images or repo
#   5. log in to ECR, pull images ${IMAGE_TAG} (from /nocturne/prod/image_tag),
#      docker compose up -d, wait for local liveness
# Output goes to /var/log/nocturne-bootstrap.log (shipped to CloudWatch).
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

REGION="__AWS_REGION__"
SSM_PREFIX="__SSM_PREFIX__"
IMAGE_TAG_PARAM="__SSM_IMAGE_TAG_PARAM__"
IMAGE_TAG_PLACEHOLDER="__IMAGE_TAG_PLACEHOLDER__"
CONFIG_BUCKET="__CONFIG_BUCKET__"
ECR_REGISTRY="__ECR_REGISTRY__"
COMPOSE_VERSION="__COMPOSE_VERSION__"
WEB_PORT="__WEB_PORT__"
API_PORT="__API_PORT__"

APP_DIR=/opt/nocturne
ENV_FILE="${APP_DIR}/.env"
LOG_FILE=/var/log/nocturne-bootstrap.log
CW_CONFIG=/opt/aws/amazon-cloudwatch-agent/etc/nocturne.json
COMPOSE_PROJECT=nocturne
export AWS_DEFAULT_REGION="${REGION}"

exec > >(tee -a "${LOG_FILE}") 2>&1

log() { printf '%s [user-data] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "ERROR $*"; exit 1; }
trap 'log "ERROR line ${LINENO}: ${BASH_COMMAND} failed"' ERR

retry() {
  local n=0 max=5 delay=5
  until "$@"; do
    n=$((n + 1))
    ((n >= max)) && return 1
    log "retry ${n}/${max} in ${delay}s: $*"
    sleep "${delay}"
    delay=$((delay * 2))
  done
}

install_packages() {
  log "installing docker, cloudwatch agent"
  retry dnf install -y -q docker amazon-cloudwatch-agent python3
  mkdir -p /etc/docker
  # Default log options. Compose sets json-file + rotation per service; the
  # daemon merges these defaults in, adding the compose service name to every
  # log line ("attrs") so CloudWatch Logs Insights can filter per service.
  cat >/etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5", "labels": "com.docker.compose.service" },
  "live-restore": true
}
JSON
  systemctl enable --now docker
}

install_compose_plugin() {
  local arch dest=/usr/local/lib/docker/cli-plugins/docker-compose url sum
  arch="$(uname -m)"
  url="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-${arch}"
  mkdir -p "$(dirname "${dest}")"
  log "installing docker compose ${COMPOSE_VERSION} (${arch})"
  retry curl -fsSL -o "${dest}" "${url}"
  sum="$(retry curl -fsSL "${url}.sha256" | cut -d' ' -f1)"
  printf '%s  %s\n' "${sum}" "${dest}" | sha256sum -c - || die "docker compose checksum mismatch"
  chmod 0755 "${dest}"
  docker compose version
}

fetch_config() {
  log "fetching runtime config from s3://${CONFIG_BUCKET}"
  install -d -m 0755 "${APP_DIR}" "${APP_DIR}/bin" "${APP_DIR}/backend"
  retry aws s3 cp "s3://${CONFIG_BUCKET}/compose/docker-compose.yml" "${APP_DIR}/docker-compose.yml"
  retry aws s3 cp "s3://${CONFIG_BUCKET}/compose/docker-compose.prod.yml" "${APP_DIR}/docker-compose.prod.yml"
  retry aws s3 cp "s3://${CONFIG_BUCKET}/config/cloudwatch-agent.json" "${CW_CONFIG}"
  # Ops helpers (healthcheck / backup) for use over SSM Session Manager.
  aws s3 cp --recursive "s3://${CONFIG_BUCKET}/config/bin/" "${APP_DIR}/bin/" || log "no helper scripts uploaded (optional)"
  chmod 0755 "${APP_DIR}"/bin/*.sh 2>/dev/null || true
  # The base compose file references ./backend/compose.env (local dev only);
  # the prod override resets env_file, this empty file is a belt-and-braces guard.
  : >"${APP_DIR}/backend/compose.env"
}

start_cloudwatch_agent() {
  log "starting amazon-cloudwatch-agent"
  /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -s -c "file:${CW_CONFIG}"
}

write_env_file() {
  local tag tmp
  tag="$(retry aws ssm get-parameter --name "${IMAGE_TAG_PARAM}" --query Parameter.Value --output text)"
  [[ -n "${tag}" && "${tag}" != "${IMAGE_TAG_PLACEHOLDER}" ]] \
    || die "${IMAGE_TAG_PARAM} is '${tag}' - push images and set the tag before launching instances"
  log "image tag ${tag}"

  umask 077
  tmp="$(mktemp "${APP_DIR}/.env.XXXXXX")"
  # Secrets go straight from the SSM API into the 0600 file - never to argv or stdout.
  aws ssm get-parameters-by-path --path "${SSM_PREFIX}" --with-decryption \
      --query 'Parameters[].{n:Name,v:Value}' --output json \
    | python3 -c '
import json, re, sys
out = []
for p in json.load(sys.stdin):
    key = p["n"].rsplit("/", 1)[-1]
    if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
        continue  # image_tag, previous_image_tag, ...
    val = p["v"]
    if "\x27" in val or "\n" in val:
        sys.exit("parameter %s contains a quote or newline" % key)
    out.append("%s=\x27%s\x27" % (key, val))
print("\n".join(out))
' >"${tmp}"
  printf 'ECR_REGISTRY=%s\nIMAGE_TAG=%s\nCOMPOSE_PROJECT_NAME=%s\n' \
    "${ECR_REGISTRY}" "${tag}" "${COMPOSE_PROJECT}" >>"${tmp}"
  umask 022

  local k
  for k in MONGODB_URI JWT_SECRET CORS_ORIGINS; do
    grep -q "^${k}=" "${tmp}" || { rm -f "${tmp}"; die "missing SSM parameter ${SSM_PREFIX}/${k}"; }
  done
  chown root:root "${tmp}"
  chmod 0600 "${tmp}"
  mv -f "${tmp}" "${ENV_FILE}"
  log "wrote ${ENV_FILE} (0600, $(wc -l <"${ENV_FILE}") entries)"
}

compose() {
  docker compose --project-directory "${APP_DIR}" --project-name "${COMPOSE_PROJECT}" \
    --env-file "${ENV_FILE}" \
    -f "${APP_DIR}/docker-compose.yml" -f "${APP_DIR}/docker-compose.prod.yml" "$@"
}

start_stack() {
  log "logging in to ${ECR_REGISTRY}"
  aws ecr get-login-password | docker login --username AWS --password-stdin "${ECR_REGISTRY}"
  log "pulling images"
  retry compose pull --quiet
  log "starting stack"
  compose up -d --no-build --remove-orphans
}

wait_healthy() {
  local deadline=$((SECONDS + 180))
  until curl -fsS -o /dev/null "http://127.0.0.1:${WEB_PORT}/health" \
     && curl -fsS -o /dev/null "http://127.0.0.1:${API_PORT}/health"; do
    ((SECONDS < deadline)) || { compose ps; die "containers not live after 180s"; }
    sleep 5
  done
  log "liveness OK (web :${WEB_PORT}, api :${API_PORT})"
  # Readiness (DB) is informative only - an Atlas problem must not fail the boot.
  if curl -fsS -o /dev/null "http://127.0.0.1:${API_PORT}/api/health"; then
    log "readiness OK (database connected)"
  else
    log "WARN readiness failed (/api/health) - check Atlas allowlist / MONGODB_URI"
  fi
  compose ps
}

main() {
  log "bootstrap start"
  install_packages
  install_compose_plugin
  fetch_config
  start_cloudwatch_agent
  write_env_file
  start_stack
  wait_healthy
  log "bootstrap complete"
}

main "$@"

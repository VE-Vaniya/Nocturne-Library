#!/usr/bin/env bash
# deploy.sh - roll a new image tag out to the ASG (pipeline stage 11).
#
#   1. verify nocturne-frontend:<tag> and nocturne-backend:<tag> exist in ECR
#   2. wait for any running instance refresh to finish
#   3. copy /nocturne/prod/image_tag -> /nocturne/prod/previous_image_tag,
#      write <tag> to /nocturne/prod/image_tag
#   4. (optional) upload the compose files to the config bucket
#   5. start an ASG instance refresh (Rolling, MinHealthyPercentage 50,
#      InstanceWarmup 120) and wait for it - new instances read the tag from
#      SSM at boot, old ones drain from the ALB (30 s deregistration delay)
# Exit 0 = refresh Successful. Exit 1 = failed/timed out (the caller should
# run scripts/rollback.sh with the previous tag; see .github/workflows).
#
# Env: AWS_REGION, ASG_NAME, SSM_IMAGE_TAG_PARAM, SSM_PREVIOUS_TAG_PARAM,
#      CONFIG_BUCKET (optional), REFRESH_TIMEOUT, SKIP_IMAGE_CHECK.
# GitHub outputs: previous_tag, image_tag, refresh_id.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="deploy"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${HERE}/lib/common.sh"
# shellcheck source=lib/refresh.sh
source "${HERE}/lib/refresh.sh"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--force] [--no-wait] <image_tag>
       $(basename "$0") --refresh-only [--no-wait]

  <image_tag>     Tag pushed to both ECR repos (e.g. sha-1a2b3c4 or v1.3.0).
  --force         Refresh even if <image_tag> is already the current tag.
  --refresh-only  Do not change tags; just roll instances (e.g. after a
                  launch template change by infra/50-compute.sh).
  --no-wait       Start the refresh and return immediately.

Environment (defaults): AWS_REGION=${AWS_REGION} ASG_NAME=${ASG_NAME}
  SSM_IMAGE_TAG_PARAM=${SSM_IMAGE_TAG_PARAM}
  SSM_PREVIOUS_TAG_PARAM=${SSM_PREVIOUS_TAG_PARAM}
  CONFIG_BUCKET     if set, docker-compose*.yml from the repo root are uploaded
                    to s3://\$CONFIG_BUCKET/compose/ before the refresh
  REFRESH_TIMEOUT=${REFRESH_TIMEOUT}s  REFRESH_MIN_HEALTHY=${REFRESH_MIN_HEALTHY}  REFRESH_WARMUP=${REFRESH_WARMUP}
USAGE
}

FORCE=0
NO_WAIT=0
REFRESH_ONLY=0
TAG=""

parse_args() {
  while (($#)); do
    case "$1" in
      --force) FORCE=1 ;;
      --no-wait) NO_WAIT=1 ;;
      --refresh-only) REFRESH_ONLY=1 ;;
      -h|--help) usage; exit 0 ;;
      -*) usage; die "unknown option: $1" ;;
      *) [[ -z "${TAG}" ]] || die "only one image tag allowed"; TAG=$1 ;;
    esac
    shift
  done
  if ((REFRESH_ONLY)); then
    [[ -z "${TAG}" ]] || die "--refresh-only takes no image tag"
  else
    [[ -n "${TAG}" ]] || { usage; die "missing <image_tag>"; }
    valid_tag "${TAG}" || die "invalid image tag: ${TAG}"
  fi
}

sync_compose_files() {
  [[ -n "${CONFIG_BUCKET:-}" ]] || return 0
  local root f
  root="$(cd "${HERE}/.." && pwd)"
  for f in docker-compose.yml docker-compose.prod.yml; do
    [[ -f "${root}/${f}" ]] || die "missing ${root}/${f}"
    awsq s3 cp "${root}/${f}" "s3://${CONFIG_BUCKET}/compose/${f}" --only-show-errors
  done
  ok "compose files uploaded to s3://${CONFIG_BUCKET}/compose/"
}

main() {
  parse_args "$@"
  require_cmd aws
  info "region ${AWS_REGION}, ASG ${ASG_NAME}"
  wait_no_active_refresh

  if ((!REFRESH_ONLY)); then
    require_images "${TAG}"
    local current
    current="$(get_param "${SSM_IMAGE_TAG_PARAM}")"
    info "current tag: ${current:-<none>}, new tag: ${TAG}"
    gh_output previous_tag "${current}"
    gh_output image_tag "${TAG}"
    if [[ "${current}" == "${TAG}" ]]; then
      if ((!FORCE)); then
        ok "${TAG} is already deployed - nothing to do (use --force to roll instances anyway)"
        return 0
      fi
      warn "--force: re-rolling instances on ${TAG}"
    else
      if [[ -n "${current}" && "${current}" != "unset" ]]; then
        put_param "${SSM_PREVIOUS_TAG_PARAM}" "${current}"
      fi
      put_param "${SSM_IMAGE_TAG_PARAM}" "${TAG}"
    fi
  fi

  sync_compose_files
  local id
  id="$(start_refresh)"
  if ((NO_WAIT)); then
    info "--no-wait: not waiting for ${id}"
    return 0
  fi
  if ! wait_refresh "${id}"; then
    die "deploy of ${TAG:-current tag} failed - roll back with: scripts/rollback.sh $(get_param "${SSM_PREVIOUS_TAG_PARAM}")"
  fi
  ok "deployed ${TAG:-current tag} to ${ASG_NAME}"
}

main "$@"

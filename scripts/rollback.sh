#!/usr/bin/env bash
# rollback.sh - put a known-good image tag back on the ASG.
#
#   rollback.sh <image_tag>   roll back (or forward) to any tag present in ECR
#   rollback.sh               use /nocturne/prod/previous_image_tag
#
# Cancels a running instance refresh (e.g. the failed deploy), writes the tag
# to /nocturne/prod/image_tag, starts a new instance refresh (MinHealthy 50%,
# warmup 120 s) and waits for it. previous_image_tag is NOT modified, so it
# keeps pointing at the last known-good release. Used by the CD workflow after
# a failed smoke test and by the manual rollback workflow (workflow_dispatch).
#
# Env: AWS_REGION, ASG_NAME, SSM_IMAGE_TAG_PARAM, SSM_PREVIOUS_TAG_PARAM,
#      REFRESH_TIMEOUT, SKIP_IMAGE_CHECK.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="rollback"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${HERE}/lib/common.sh"
# shellcheck source=lib/refresh.sh
source "${HERE}/lib/refresh.sh"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--no-wait] [<image_tag>]

Without <image_tag> the value of ${SSM_PREVIOUS_TAG_PARAM} is used.
Environment: AWS_REGION=${AWS_REGION} ASG_NAME=${ASG_NAME} REFRESH_TIMEOUT=${REFRESH_TIMEOUT}
USAGE
}

main() {
  local tag="" no_wait=0
  while (($#)); do
    case "$1" in
      --no-wait) no_wait=1 ;;
      -h|--help) usage; exit 0 ;;
      -*) usage; die "unknown option: $1" ;;
      *) [[ -z "${tag}" ]] || die "only one image tag allowed"; tag=$1 ;;
    esac
    shift
  done
  require_cmd aws

  if [[ -z "${tag}" ]]; then
    tag="$(get_param "${SSM_PREVIOUS_TAG_PARAM}")"
    [[ -n "${tag}" && "${tag}" != "unset" ]] || die "no image tag given and ${SSM_PREVIOUS_TAG_PARAM} is empty"
    info "using previous tag from SSM: ${tag}"
  fi
  valid_tag "${tag}" || die "invalid image tag: ${tag}"
  require_images "${tag}"

  local current
  current="$(get_param "${SSM_IMAGE_TAG_PARAM}")"
  warn "ROLLBACK ${ASG_NAME}: ${current:-<none>} -> ${tag}"
  gh_output rolled_back_from "${current}"
  gh_output image_tag "${tag}"

  cancel_active_refresh
  put_param "${SSM_IMAGE_TAG_PARAM}" "${tag}"
  local id
  id="$(start_refresh)"
  if ((no_wait)); then
    info "--no-wait: not waiting for ${id}"
    return 0
  fi
  wait_refresh "${id}" || die "rollback refresh ${id} failed - check ASG activity history and /nocturne/prod/bootstrap logs"
  ok "rolled back to ${tag}"
}

main "$@"

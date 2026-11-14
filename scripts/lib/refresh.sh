#!/usr/bin/env bash
# shellcheck shell=bash
set -euo pipefail
# Image-tag state in SSM + ASG instance refresh helpers (deploy.sh, rollback.sh).
# Sourced after lib/common.sh.

REFRESH_MIN_HEALTHY="${REFRESH_MIN_HEALTHY:-50}"
REFRESH_WARMUP="${REFRESH_WARMUP:-120}"
REFRESH_TIMEOUT="${REFRESH_TIMEOUT:-1200}"   # seconds
REFRESH_POLL="${REFRESH_POLL:-15}"
SKIP_IMAGE_CHECK="${SKIP_IMAGE_CHECK:-0}"

# get_param NAME -> value, or empty if the parameter does not exist.
# Any other error (auth, throttling, network) is fatal.
get_param() {
  local v errfile err
  errfile="$(mktemp)"
  if v="$(awsq ssm get-parameter --name "$1" --query Parameter.Value 2>"${errfile}")"; then
    rm -f "${errfile}"
    case "${v}" in None|null) v="" ;; *) ;; esac
    printf '%s' "${v}"
    return 0
  fi
  err="$(cat "${errfile}")"
  rm -f "${errfile}"
  if [[ "${err}" == *ParameterNotFound* ]]; then
    return 0
  fi
  die "reading SSM $1 failed: ${err}"
}

put_param() {
  awsq ssm put-parameter --name "$1" --type String --overwrite --value "$2" >/dev/null
  info "SSM $1 = $2"
}

require_images() {
  local tag=$1 repo
  if [[ "${SKIP_IMAGE_CHECK}" == "1" ]]; then
    warn "SKIP_IMAGE_CHECK=1: not verifying ${tag} in ECR"
    return 0
  fi
  for repo in "${ECR_REPO_FRONTEND}" "${ECR_REPO_BACKEND}"; do
    if ! awsq ecr describe-images --repository-name "${repo}" --image-ids "imageTag=${tag}" >/dev/null 2>&1; then
      gh_error "image ${repo}:${tag} not found in ECR"
      die "image ${repo}:${tag} not found in ECR"
    fi
  done
  ok "images ${ECR_REPO_FRONTEND}:${tag} and ${ECR_REPO_BACKEND}:${tag} exist"
}

# Prints the id of a refresh that is still running (empty if none).
active_refresh() {
  local id
  id="$(awsq autoscaling describe-instance-refreshes --auto-scaling-group-name "${ASG_NAME}" \
    --query "InstanceRefreshes[?contains(['Pending','InProgress','Cancelling','Baking','RollbackInProgress'], Status)] | [0].InstanceRefreshId")"
  case "${id}" in None|null) id="" ;; *) ;; esac
  printf '%s' "${id}"
}

wait_no_active_refresh() {
  local deadline=$((SECONDS + REFRESH_TIMEOUT)) id
  while :; do
    id="$(active_refresh)"
    [[ -z "${id}" ]] && return 0
    ((SECONDS < deadline)) || die "instance refresh ${id} still active after ${REFRESH_TIMEOUT}s"
    info "waiting for running instance refresh ${id} to finish..."
    sleep "${REFRESH_POLL}"
  done
}

cancel_active_refresh() {
  local id
  id="$(active_refresh)"
  if [[ -n "${id}" ]]; then
    warn "cancelling running instance refresh ${id}"
    awsq autoscaling cancel-instance-refresh --auto-scaling-group-name "${ASG_NAME}" >/dev/null || true
  fi
  wait_no_active_refresh
}

start_refresh() {
  local prefs id
  prefs="{\"MinHealthyPercentage\":${REFRESH_MIN_HEALTHY},\"InstanceWarmup\":${REFRESH_WARMUP},\"SkipMatching\":false,\"ScaleInProtectedInstances\":\"Ignore\",\"StandbyInstances\":\"Ignore\"}"
  id="$(awsq autoscaling start-instance-refresh --auto-scaling-group-name "${ASG_NAME}" \
    --strategy Rolling --preferences "${prefs}" --query InstanceRefreshId)"
  ok "started instance refresh ${id} on ${ASG_NAME} (MinHealthy ${REFRESH_MIN_HEALTHY}%, warmup ${REFRESH_WARMUP}s)"
  gh_output refresh_id "${id}"
  printf '%s' "${id}"
}

# wait_refresh ID -> 0 on Successful, 1 otherwise
wait_refresh() {
  local id=$1 deadline=$((SECONDS + REFRESH_TIMEOUT)) status pct reason
  while :; do
    IFS=$'\t' read -r status pct reason < <(awsq autoscaling describe-instance-refreshes \
      --auto-scaling-group-name "${ASG_NAME}" --instance-refresh-ids "${id}" \
      --query 'InstanceRefreshes[0].[Status,PercentageComplete,StatusReason]')
    info "refresh ${id}: ${status} ${pct}% ${reason:+(${reason})}"
    case "${status}" in
      Successful) ok "instance refresh ${id} completed"; return 0 ;;
      Failed|Cancelled|RollbackSuccessful|RollbackFailed)
        gh_error "instance refresh ${id} ended with ${status}: ${reason}"
        log "ERROR instance refresh ${id} ended with ${status}"
        return 1 ;;
      *) ;;
    esac
    if ((SECONDS >= deadline)); then
      gh_error "instance refresh ${id} timed out after ${REFRESH_TIMEOUT}s"
      log "ERROR instance refresh ${id} timed out after ${REFRESH_TIMEOUT}s (still ${status})"
      return 1
    fi
    sleep "${REFRESH_POLL}"
  done
}

#!/usr/bin/env bash
# shellcheck shell=bash
# Shared helpers for scripts/*.sh (deploy, rollback, smoke test, ops).
# Sourced, never executed. Only depends on bash, coreutils, curl and (for the
# AWS scripts) AWS CLI v2 - works on GitHub-hosted runners and Amazon Linux.

if [[ -n "${_NOCTURNE_SCRIPTS_COMMON:-}" ]]; then
  return 0
fi
_NOCTURNE_SCRIPTS_COMMON=1

# Make $(...) subshells honour set -e too, so a failing AWS call inside a
# helper is never silently turned into an empty string (bash >= 4.4).
shopt -s inherit_errexit

SCRIPT_NAME="${SCRIPT_NAME:-$(basename "${0}")}"

_ts() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log()  { printf '%s [%s] %s\n' "$(_ts)" "${SCRIPT_NAME}" "$*" >&2; }
info() { log "INFO  $*"; }
ok()   { log "OK    $*"; }
warn() { log "WARN  $*"; }
die()  { log "ERROR $*"; exit 1; }

# GitHub Actions annotations when running in a workflow.
gh_error() {
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    printf '::error title=%s::%s\n' "${SCRIPT_NAME}" "$*"
  fi
}

# gh_output KEY VALUE -> appended to $GITHUB_OUTPUT when set.
gh_output() {
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "$1" "$2" >>"${GITHUB_OUTPUT}"
  fi
}

require_cmd() {
  local c
  for c in "$@"; do
    command -v "${c}" >/dev/null 2>&1 || die "required command not found: ${c}"
  done
}

# Image tags: what ECR accepts, and what CI produces (sha-<short>, vX.Y.Z).
valid_tag() {
  [[ "$1" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]
}

# ---- deploy env contract (shared with .github/workflows) -------------------
AWS_REGION="${AWS_REGION:-ap-south-1}"
ASG_NAME="${ASG_NAME:-nocturne-asg}"
SSM_IMAGE_TAG_PARAM="${SSM_IMAGE_TAG_PARAM:-/nocturne/prod/image_tag}"
SSM_PREVIOUS_TAG_PARAM="${SSM_PREVIOUS_TAG_PARAM:-/nocturne/prod/previous_image_tag}"
ECR_REPO_FRONTEND="${ECR_REPO_FRONTEND:-nocturne-frontend}"
ECR_REPO_BACKEND="${ECR_REPO_BACKEND:-nocturne-backend}"
export AWS_REGION

awsq() {
  aws --region "${AWS_REGION}" --output text "$@"
}

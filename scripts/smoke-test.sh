#!/usr/bin/env bash
# smoke-test.sh - post-deployment smoke test against the load balancer
# (pipeline stage 12). Re-runs the whole suite with exponential backoff until
# it passes or SMOKE_TIMEOUT (default 120 s) expires.
#
# Checks:
#   GET /             200, text/html, contains the SPA root element   (tg-web)
#   GET /health       200                                           (nginx liveness)
#   GET /api/health   200 and "db":"connected"                      (tg-api readiness)
#   GET /api/books    401 without a token                           (auth enforced)
#
# Exit 0 = all checks passed; 1 = a check still failing at the deadline
# (the CD workflow then runs scripts/rollback.sh); 2 = usage error.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="smoke-test"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${HERE}/lib/common.sh"

SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-120}"
SMOKE_MAX_DELAY="${SMOKE_MAX_DELAY:-20}"
CURL_TIMEOUT="${CURL_TIMEOUT:-10}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") <base_url>
  e.g. $(basename "$0") http://nocturne-alb-123.ap-south-1.elb.amazonaws.com

Environment: SMOKE_TIMEOUT=${SMOKE_TIMEOUT}s (total), SMOKE_MAX_DELAY=${SMOKE_MAX_DELAY}s, CURL_TIMEOUT=${CURL_TIMEOUT}s
USAGE
}

BASE=""
WORK=""
FAILURES=()

cleanup() { [[ -z "${WORK}" ]] || rm -rf "${WORK}"; }
trap cleanup EXIT

# fetch PATH -> sets HTTP_CODE, CONTENT_TYPE; body in ${WORK}/body
fetch() {
  local out
  out="$(curl -sS -o "${WORK}/body" --max-time "${CURL_TIMEOUT}" \
    -H 'Accept: */*' -H 'User-Agent: nocturne-smoke-test' \
    -w '%{http_code}\t%{content_type}' "${BASE}$1" 2>"${WORK}/err" || true)"
  HTTP_CODE="${out%%$'\t'*}"
  CONTENT_TYPE="${out#*$'\t'}"
  [[ -n "${HTTP_CODE}" ]] || HTTP_CODE="000"
}

fail() {
  local snippet
  snippet="$(head -c 200 "${WORK}/body" 2>/dev/null | tr -d '\r\n' || true)"
  [[ -s "${WORK}/err" ]] && snippet="$(tr -d '\r\n' <"${WORK}/err")"
  FAILURES+=("$1 (got HTTP ${HTTP_CODE}${snippet:+: ${snippet}})")
}

check_root() {
  fetch /
  if [[ "${HTTP_CODE}" == 200 && "${CONTENT_TYPE}" == text/html* ]] \
     && grep -qiE '<div id="root"|<html' "${WORK}/body"; then
    ok "GET / -> 200 html"
  else
    fail "GET / expected 200 text/html with the SPA shell"
  fi
}

check_health() {
  fetch /health
  if [[ "${HTTP_CODE}" == 200 ]]; then ok "GET /health -> 200"; else fail "GET /health expected 200"; fi
}

check_api_health() {
  fetch /api/health
  if [[ "${HTTP_CODE}" == 200 ]] && grep -qE '"db"[[:space:]]*:[[:space:]]*"connected"' "${WORK}/body"; then
    ok "GET /api/health -> 200 db connected"
  else
    fail "GET /api/health expected 200 with \"db\":\"connected\""
  fi
}

check_auth_enforced() {
  fetch /api/books
  if [[ "${HTTP_CODE}" == 401 ]]; then ok "GET /api/books (no token) -> 401"; else fail "GET /api/books without token expected 401"; fi
}

run_suite() {
  FAILURES=()
  check_root
  check_health
  check_api_health
  check_auth_enforced
  ((${#FAILURES[@]} == 0))
}

main() {
  case "${1:-}" in
    -h|--help) usage; exit 0 ;;
    '') usage >&2; exit 2 ;;
    *) ;;
  esac
  [[ $# -eq 1 ]] || { usage >&2; exit 2; }
  BASE="${1%/}"
  [[ "${BASE}" =~ ^https?:// ]] || { log "ERROR base_url must start with http:// or https://"; exit 2; }
  require_cmd curl
  WORK="$(mktemp -d)"

  local deadline=$((SECONDS + SMOKE_TIMEOUT)) attempt=1 delay=2
  while :; do
    info "attempt ${attempt} against ${BASE}"
    if run_suite; then
      ok "smoke test PASSED (${attempt} attempt(s), ${SECONDS}s)"
      return 0
    fi
    local f
    for f in "${FAILURES[@]}"; do warn "${f}"; done
    if ((SECONDS + delay > deadline)); then
      break
    fi
    info "retrying in ${delay}s"
    sleep "${delay}"
    attempt=$((attempt + 1))
    delay=$((delay * 2 > SMOKE_MAX_DELAY ? SMOKE_MAX_DELAY : delay * 2))
  done

  local IFS=';'
  local msg="smoke test FAILED against ${BASE} after ${attempt} attempt(s) / ${SMOKE_TIMEOUT}s: ${FAILURES[*]}"
  gh_error "${msg}"
  log "ERROR ${msg}"
  exit 1
}

main "$@"

#!/usr/bin/env bash
# healthcheck.sh - local health summary of the Docker Compose stack.
#
# Works on an EC2 instance (via SSM Session Manager: sudo /opt/nocturne/bin/healthcheck.sh)
# and on a developer machine running `docker compose up`.
#   * every container of the compose project: state, Docker health, image, restarts
#   * liveness  : GET :8080/health (nginx), GET :5000/health (API)
#   * readiness : GET :5000/api/health (API + MongoDB)
# Exit 0 = all healthy; 1 = a container or liveness check failed;
#      2 = only readiness failed (DB problem) - or 1 with --strict.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="healthcheck"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${HERE}/lib/common.sh" ]]; then
  # shellcheck source=lib/common.sh
  source "${HERE}/lib/common.sh"
else
  # Copied standalone to /opt/nocturne/bin on the instances.
  log()  { printf '%s [%s] %s\n' "$(date -u +%H:%M:%SZ)" "${SCRIPT_NAME}" "$*" >&2; }
  info() { log "INFO  $*"; }
  ok()   { log "OK    $*"; }
  warn() { log "WARN  $*"; }
  die()  { log "ERROR $*"; exit 1; }
  require_cmd() { local c; for c in "$@"; do command -v "${c}" >/dev/null 2>&1 || die "missing ${c}"; done; }
fi

PROJECT="${COMPOSE_PROJECT_NAME:-nocturne}"
HOST="${HEALTH_HOST:-127.0.0.1}"
WEB_PORT="${WEB_PORT:-8080}"
API_PORT="${API_PORT:-5000}"
STRICT=0
EXPECTED_SERVICES="${EXPECTED_SERVICES:-frontend backend}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--project NAME] [--strict]

  --project NAME  compose project name (default ${PROJECT})
  --strict        treat a failed readiness check (/api/health) as fatal
Environment: HEALTH_HOST=${HOST} WEB_PORT=${WEB_PORT} API_PORT=${API_PORT}
             EXPECTED_SERVICES="${EXPECTED_SERVICES}"
USAGE
}

probe() {
  local name=$1 url=$2 code
  code="$(curl -s -o /dev/null --max-time 5 -w '%{http_code}' "${url}" || true)"
  if [[ "${code}" == 200 ]]; then
    printf '  %-10s %-38s %s\n' "${name}" "${url}" "OK (200)"
    return 0
  fi
  printf '  %-10s %-38s %s\n' "${name}" "${url}" "FAIL (${code:-000})"
  return 1
}

main() {
  while (($#)); do
    case "$1" in
      --project) [[ $# -ge 2 ]] || die "--project needs a value"; PROJECT=$2; shift ;;
      --strict) STRICT=1 ;;
      -h|--help) usage; exit 0 ;;
      *) usage; die "unknown argument: $1" ;;
    esac
    shift
  done
  require_cmd docker curl

  local bad=0 rows svc
  rows="$(docker ps -a --filter "label=com.docker.compose.project=${PROJECT}" \
    --format '{{.ID}}\t{{.Label "com.docker.compose.service"}}\t{{.State}}\t{{.Image}}')"
  printf 'Containers (project %s):\n' "${PROJECT}"
  printf '  %-10s %-9s %-10s %-8s %s\n' SERVICE STATE HEALTH RESTARTS IMAGE
  local seen=" "
  if [[ -n "${rows}" ]]; then
    local id service state image health restarts
    while IFS=$'\t' read -r id service state image; do
      health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}n/a{{end}}' "${id}")"
      restarts="$(docker inspect --format '{{.RestartCount}}' "${id}")"
      printf '  %-10s %-9s %-10s %-8s %s\n' "${service}" "${state}" "${health}" "${restarts}" "${image##*/}"
      seen+="${service} "
      if [[ "${state}" != running || "${health}" == unhealthy ]]; then
        bad=1
      fi
    done <<<"${rows}"
  fi
  IFS=' ' read -r -a expected <<<"${EXPECTED_SERVICES}"
  for svc in "${expected[@]}"; do
    if [[ "${seen}" != *" ${svc} "* ]]; then
      printf '  %-10s %s\n' "${svc}" "MISSING"
      bad=1
    fi
  done

  printf '\nEndpoints:\n'
  probe liveness "http://${HOST}:${WEB_PORT}/health" || bad=1
  probe liveness "http://${HOST}:${API_PORT}/health" || bad=1
  local ready=0
  probe readiness "http://${HOST}:${API_PORT}/api/health" || ready=1
  printf '\nDisk: %s used on /   Memory: %s\n' \
    "$(df -h / | awk 'NR==2 {print $5}')" \
    "$(free -m 2>/dev/null | awk '/^Mem:/ {printf "%d/%d MiB", $3, $2}' || echo n/a)"

  if ((bad)); then
    log "ERROR stack unhealthy (container or liveness failure) - see: docker compose -p ${PROJECT} logs --tail 100"
    exit 1
  fi
  if ((ready)); then
    if ((STRICT)); then
      log "ERROR readiness failed: API cannot reach MongoDB (check Atlas access list / MONGODB_URI)"
      exit 1
    fi
    warn "readiness failed: API cannot reach MongoDB (check Atlas access list / MONGODB_URI)"
    exit 2
  fi
  ok "all containers running and healthy"
}

main "$@"

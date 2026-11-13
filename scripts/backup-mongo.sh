#!/usr/bin/env bash
# backup-mongo.sh - logical backup of the Nocturne MongoDB (Atlas M0).
#
#   mongodump --archive --gzip of MONGODB_URI -> nocturne-<UTC timestamp>.archive.gz
#   * --bucket B (or BACKUP_BUCKET): upload to s3://B/mongo/YYYY/MM/DD/ (SSE-S3)
#     and delete the local copy; the bucket lifecycle rule (infra/00-bootstrap.sh)
#     expires objects after 30 days (BACKUP_RETENTION_DAYS).
#   * otherwise: keep in --dir (default ./backups), pruning to the newest --keep N.
#
# Atlas only accepts connections from the NAT Elastic IP, so run it on an app
# instance over SSM Session Manager:
#   sudo /opt/nocturne/bin/backup-mongo.sh --from-ssm --bucket nocturne-backups-<acct>-ap-south-1
# or from a laptop after temporarily adding your IP to the Atlas access list.
# Uses a local `mongodump` if installed, else the official mongo image (Docker).
# The connection string is passed via the environment, never on a command line.
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="backup-mongo"
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

AWS_REGION="${AWS_REGION:-ap-south-1}"
MONGO_TOOLS_IMAGE="${MONGO_TOOLS_IMAGE:-mongo:7.0.48}"   # same version as docker-compose.yml
SSM_URI_PARAM="${SSM_URI_PARAM:-/nocturne/prod/MONGODB_URI}"
BUCKET="${BACKUP_BUCKET:-}"
DIR="${BACKUP_DIR:-./backups}"
KEEP="${BACKUP_KEEP:-7}"
FROM_SSM=0
TMPDIR_CLEANUP=""

usage() {
  cat <<USAGE
Usage: $(basename "$0") [--from-ssm] [--bucket NAME | --dir PATH] [--keep N]

  --from-ssm     read MONGODB_URI from SSM ${SSM_URI_PARAM} (instance role)
  --bucket NAME  upload to s3://NAME/mongo/YYYY/MM/DD/ (env BACKUP_BUCKET)
  --dir PATH     local backup directory when no bucket (default ${DIR})
  --keep N       local copies to keep (default ${KEEP})
Environment: MONGODB_URI (unless --from-ssm), MONGO_TOOLS_IMAGE=${MONGO_TOOLS_IMAGE}
USAGE
}

cleanup() {
  if [[ -n "${TMPDIR_CLEANUP}" ]]; then
    rm -rf "${TMPDIR_CLEANUP}"
  fi
}
trap cleanup EXIT

dump_to() {
  local out=$1
  if command -v mongodump >/dev/null 2>&1; then
    mongodump --uri="${MONGODB_URI}" --archive="${out}" --gzip --quiet
  else
    require_cmd docker
    # shellcheck disable=SC2016  # $MONGODB_URI is expanded inside the container
    docker run --rm -e MONGODB_URI "${MONGO_TOOLS_IMAGE}" \
      sh -c 'exec mongodump --uri="$MONGODB_URI" --archive --gzip --quiet' >"${out}"
  fi
}

prune_local() {
  local files n i
  mapfile -t files < <(find "${DIR}" -maxdepth 1 -name 'nocturne-*.archive.gz' -type f | sort -r)
  n=${#files[@]}
  if ((n > KEEP)); then
    for ((i = KEEP; i < n; i++)); do
      rm -f -- "${files[i]}"
      info "pruned ${files[i]}"
    done
  fi
}

main() {
  while (($#)); do
    case "$1" in
      --from-ssm) FROM_SSM=1 ;;
      --bucket) [[ $# -ge 2 ]] || die "--bucket needs a value"; BUCKET=$2; shift ;;
      --dir) [[ $# -ge 2 ]] || die "--dir needs a value"; DIR=$2; shift ;;
      --keep) [[ $# -ge 2 && "$2" =~ ^[0-9]+$ ]] || die "--keep needs a number"; KEEP=$2; shift ;;
      -h|--help) usage; exit 0 ;;
      *) usage; die "unknown argument: $1" ;;
    esac
    shift
  done

  if ((FROM_SSM)); then
    require_cmd aws
    MONGODB_URI="$(aws ssm get-parameter --region "${AWS_REGION}" --name "${SSM_URI_PARAM}" \
      --with-decryption --query Parameter.Value --output text)"
  fi
  [[ -n "${MONGODB_URI:-}" ]] || die "MONGODB_URI is not set (export it or use --from-ssm)"
  export MONGODB_URI

  local stamp name out size
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  name="nocturne-${stamp}.archive.gz"
  umask 077
  if [[ -n "${BUCKET}" ]]; then
    TMPDIR_CLEANUP="$(mktemp -d)"
    out="${TMPDIR_CLEANUP}/${name}"
  else
    mkdir -p "${DIR}"
    out="${DIR}/${name}"
  fi

  info "dumping database -> ${name}"
  dump_to "${out}"
  [[ -s "${out}" ]] || die "dump produced an empty file"
  gzip -t "${out}" || die "archive failed gzip integrity check"
  size="$(du -h "${out}" | cut -f1)"
  ok "dump complete (${size})"

  if [[ -n "${BUCKET}" ]]; then
    require_cmd aws
    local key="mongo/${stamp:0:4}/${stamp:4:2}/${stamp:6:2}/${name}"
    aws s3 cp "${out}" "s3://${BUCKET}/${key}" --region "${AWS_REGION}" --sse AES256 --only-show-errors
    ok "uploaded s3://${BUCKET}/${key} (expires via bucket lifecycle)"
    printf '%s\n' "s3://${BUCKET}/${key}"
  else
    prune_local
    ok "saved ${out} (keeping newest ${KEEP})"
    printf '%s\n' "${out}"
  fi
}

main "$@"

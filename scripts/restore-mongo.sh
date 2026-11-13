#!/usr/bin/env bash
# restore-mongo.sh - restore drill for backups made by backup-mongo.sh.
#
# DEFAULT = DRILL: restores <source_db>.* into <source_db>_restore_drill on the
# target cluster (never touches the live database), prints per-collection
# document counts as evidence, fails if nothing was restored, and optionally
# drops the drill database again (--cleanup).
# --in-place restores over the live database (with --drop) and needs --yes;
# use it only for real disaster recovery.
#
#   restore-mongo.sh [--from-ssm] [--source-db nocturnelibrary] [--cleanup] <archive.gz | s3://...>
#   restore-mongo.sh --in-place --yes <archive>
# Target: RESTORE_URI if set, else MONGODB_URI (or --from-ssm).
set -Eeuo pipefail
shopt -s inherit_errexit
IFS=$'\n\t'

SCRIPT_NAME="restore-mongo"
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
MONGO_TOOLS_IMAGE="${MONGO_TOOLS_IMAGE:-mongo:7.0.48}"
SSM_URI_PARAM="${SSM_URI_PARAM:-/nocturne/prod/MONGODB_URI}"
SOURCE_DB="${SOURCE_DB:-nocturnelibrary}"
FROM_SSM=0
IN_PLACE=0
YES=0
CLEANUP=0
SRC=""
TMPDIR_CLEANUP=""

usage() {
  cat <<USAGE
Usage: $(basename "$0") [options] <archive.gz | s3://bucket/key>

  --source-db NAME  database name inside the archive (default ${SOURCE_DB})
  --from-ssm        read the target URI from SSM ${SSM_URI_PARAM}
  --cleanup         drop the drill database after verifying counts
  --in-place        restore over the live database (requires --yes)
  --yes             confirm --in-place
Environment: RESTORE_URI (target; default MONGODB_URI), MONGO_TOOLS_IMAGE=${MONGO_TOOLS_IMAGE}
USAGE
}

cleanup() {
  if [[ -n "${TMPDIR_CLEANUP}" ]]; then
    rm -rf "${TMPDIR_CLEANUP}"
  fi
}
trap cleanup EXIT

# mongorestore_archive ARGS... < archive  (URI passed via env TARGET_URI)
mongorestore_archive() {
  if command -v mongorestore >/dev/null 2>&1; then
    mongorestore --uri="${TARGET_URI}" "$@"
  else
    require_cmd docker
    # shellcheck disable=SC2016  # $TARGET_URI is expanded inside the container
    docker run --rm -i -e TARGET_URI "${MONGO_TOOLS_IMAGE}" \
      sh -c 'exec mongorestore --uri="$TARGET_URI" "$@"' sh "$@"
  fi
}

mongosh_eval() {
  local js=$1
  if command -v mongosh >/dev/null 2>&1; then
    mongosh "${TARGET_URI}" --quiet --eval "${js}"
  else
    require_cmd docker
    # shellcheck disable=SC2016  # $TARGET_URI is expanded inside the container
    docker run --rm -e TARGET_URI "${MONGO_TOOLS_IMAGE}" \
      sh -c 'exec mongosh "$TARGET_URI" --quiet --eval "$1"' sh "${js}"
  fi
}

main() {
  while (($#)); do
    case "$1" in
      --source-db) [[ $# -ge 2 ]] || die "--source-db needs a value"; SOURCE_DB=$2; shift ;;
      --from-ssm) FROM_SSM=1 ;;
      --cleanup) CLEANUP=1 ;;
      --in-place) IN_PLACE=1 ;;
      --yes) YES=1 ;;
      -h|--help) usage; exit 0 ;;
      -*) usage; die "unknown option: $1" ;;
      *) [[ -z "${SRC}" ]] || die "only one archive allowed"; SRC=$1 ;;
    esac
    shift
  done
  [[ -n "${SRC}" ]] || { usage; die "missing archive path"; }
  [[ "${SOURCE_DB}" =~ ^[A-Za-z0-9_-]+$ ]] || die "invalid --source-db"
  if ((IN_PLACE && !YES)); then
    die "--in-place overwrites the live database; add --yes to confirm"
  fi

  if ((FROM_SSM)); then
    require_cmd aws
    TARGET_URI="$(aws ssm get-parameter --region "${AWS_REGION}" --name "${SSM_URI_PARAM}" \
      --with-decryption --query Parameter.Value --output text)"
  else
    TARGET_URI="${RESTORE_URI:-${MONGODB_URI:-}}"
  fi
  [[ -n "${TARGET_URI}" ]] || die "set RESTORE_URI or MONGODB_URI (or use --from-ssm)"
  export TARGET_URI

  local archive
  if [[ "${SRC}" == s3://* ]]; then
    require_cmd aws
    TMPDIR_CLEANUP="$(mktemp -d)"
    archive="${TMPDIR_CLEANUP}/restore.archive.gz"
    aws s3 cp "${SRC}" "${archive}" --region "${AWS_REGION}" --only-show-errors
    ok "downloaded ${SRC}"
  else
    archive="${SRC}"
    [[ -f "${archive}" ]] || die "archive not found: ${archive}"
  fi
  gzip -t "${archive}" || die "archive is corrupt (gzip -t failed)"

  local target_db
  if ((IN_PLACE)); then
    target_db="${SOURCE_DB}"
    warn "IN-PLACE restore: dropping and replacing collections in ${target_db}"
    mongorestore_archive --archive --gzip --drop --quiet <"${archive}"
  else
    target_db="${SOURCE_DB}_restore_drill"
    info "DRILL: restoring ${SOURCE_DB}.* -> ${target_db}.*"
    mongorestore_archive --archive --gzip --drop --quiet \
      "--nsFrom=${SOURCE_DB}.*" "--nsTo=${target_db}.*" <"${archive}"
  fi
  ok "mongorestore finished"

  info "document counts in ${target_db}:"
  mongosh_eval "const d = db.getSiblingDB('${target_db}'); let total = 0; d.getCollectionNames().sort().forEach(c => { const n = d.getCollection(c).countDocuments(); total += n; print('  ' + c.padEnd(24) + n); }); print('  TOTAL'.padEnd(26) + total); if (total === 0) { quit(3); }" \
    || die "verification failed: ${target_db} is empty or unreachable"
  ok "restore verified (non-empty) in ${target_db}"

  if ((CLEANUP && !IN_PLACE)); then
    mongosh_eval "db.getSiblingDB('${target_db}').dropDatabase()" >/dev/null
    ok "dropped drill database ${target_db}"
  elif ((!IN_PLACE)); then
    info "drill database ${target_db} left in place - re-run with --cleanup or drop it manually"
  fi
}

main "$@"

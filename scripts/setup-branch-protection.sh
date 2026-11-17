#!/usr/bin/env bash
# setup-branch-protection.sh - protect the trunk and require every CI stage.
#
# Applies classic branch protection to BRANCH (default: main) so that:
#   * changes land only through a pull request with 1 approving review
#   * all 9 CI jobs (stages 2-10 in .github/workflows/ci.yml) must pass,
#     and the branch must be up to date with the trunk before merging
#   * force pushes and branch deletion are blocked, admins included
#
# Needs: gh (GitHub CLI) logged in as a repo ADMIN (`gh auth login`).
# Note: on a PRIVATE repo, branch protection needs the owner to be on GitHub
# Pro/Team (free via the GitHub Student Developer Pack); otherwise the API
# returns 403 "Upgrade to GitHub Pro or make this repository public".
#
# Usage:  scripts/setup-branch-protection.sh [owner/repo] [branch]
#         scripts/setup-branch-protection.sh --show [owner/repo] [branch]
set -Eeuo pipefail
IFS=$'\n\t'

SHOW_ONLY=false
if [[ "${1:-}" == "--show" ]]; then
  SHOW_ONLY=true
  shift
fi

REPO="${1:-VE-Vaniya/Nocturne-Library}"
BRANCH="${2:-main}"

# Must match the `name:` of every job in .github/workflows/ci.yml.
CHECKS=(
  secret-scan
  lint
  format
  dockerfile-lint
  test
  sonarcloud
  dependency-scan
  build
  image-scan
)

log() { printf '[branch-protection] %s\n' "$*" >&2; }
die() { log "ERROR $*"; exit 1; }

command -v gh >/dev/null 2>&1 || die "gh not found - install GitHub CLI and run 'gh auth login'"
gh auth status >/dev/null 2>&1 || die "gh is not logged in - run 'gh auth login'"

if [[ "${SHOW_ONLY}" == true ]]; then
  gh api "repos/${REPO}/branches/${BRANCH}/protection" \
    --jq '{checks: .required_status_checks.contexts, strict: .required_status_checks.strict,
           reviews: .required_pull_request_reviews.required_approving_review_count,
           enforce_admins: .enforce_admins.enabled, force_push: .allow_force_pushes.enabled}'
  exit 0
fi

gh api "repos/${REPO}/branches/${BRANCH}" --silent \
  || die "branch '${BRANCH}' not found on ${REPO} (rename master -> main first?)"

contexts_json="$(printf '"%s",' "${CHECKS[@]}")"
contexts_json="[${contexts_json%,}]"

payload="$(cat <<JSON
{
  "required_status_checks": { "strict": true, "contexts": ${contexts_json} },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
)"

log "protecting ${REPO}@${BRANCH} with ${#CHECKS[@]} required checks"
printf '%s' "${payload}" \
  | gh api --method PUT "repos/${REPO}/branches/${BRANCH}/protection" --input - --silent
log "done - verify with: $0 --show ${REPO} ${BRANCH}"

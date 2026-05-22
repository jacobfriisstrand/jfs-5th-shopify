#!/bin/bash
#
# bin/setup-main-protection.sh
#
# Configure branch protection on `main` via the GitHub REST API so the
# production deploy workflow (`.github/workflows/theme-production.yml`)
# only runs on changes that have passed CI on a PR.
#
# Applied rules:
#   - require pull request before merge (0 approvals, dismiss stale reviews;
#     gates merge through PR review UI without requiring a second approver)
#   - require linear history (no merge commits, only squash/rebase)
#   - require status checks to pass and branches to be up-to-date
#       * Shopify theme check        (theme-check.yml)
#       * Check perf budgets         (perf-budget.yml)
#       * Push preview theme         (theme-preview.yml)
#   - block force-push and deletion
#   - enforce rules for admins too (no override)
#
# Run from the repo root:
#
#   bash bin/setup-main-protection.sh
#
# Requires:
#   - gh CLI authenticated against this repo (`gh auth status`)
#   - the authenticated user must have "admin" permission on the repo

set -euo pipefail

REPO="jacobfriisstrand/jfs-5th-shopify"
BRANCH="main"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '\033[32m✔ %s\033[0m\n' "$1"; }
err()  { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; }

if ! command -v gh >/dev/null 2>&1; then
  err "gh CLI is not installed. See https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh CLI is not authenticated. Run: gh auth login"
  exit 1
fi

bold "Applying branch protection to $REPO@$BRANCH"
echo

# The PUT body for the branch-protection endpoint. See:
# https://docs.github.com/en/rest/branches/branch-protection
PAYLOAD=$(cat <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Shopify theme check",
      "Check perf budgets",
      "Push preview theme"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON
)

echo "$PAYLOAD" | gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/$REPO/branches/$BRANCH/protection" \
  --input -

echo
ok "Branch protection applied to $BRANCH."
echo
bold "Verify with:"
echo "  gh api repos/$REPO/branches/$BRANCH/protection | jq ."
echo
bold "Note:"
echo "  Required status check names must match each workflow job's 'name:'"
echo "  value. If a job is renamed, update the contexts array above and"
echo "  re-run this script."

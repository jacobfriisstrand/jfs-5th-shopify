#!/bin/bash
#
# bin/setup-prod-secrets.sh
#
# Interactive helper to set the two GitHub Actions secrets required by
# `.github/workflows/theme-production.yml`:
#
#   SHOPIFY_PROD_CLI_THEME_TOKEN  Theme Access app password for the
#                                 production store.
#   SHOPIFY_PROD_FLAG_STORE       Production store domain
#                                 (e.g. my-store.myshopify.com).
#
# The script walks you through obtaining each value, then pipes them to
# `gh secret set` so the token never lands in your shell history.
#
# Run it from the repo root:
#
#   bash bin/setup-prod-secrets.sh
#
# Requires: gh CLI authenticated against this repo (`gh auth status`).
#
# Note: it is fine to point these secrets at the playground store
# initially to test the production workflow end-to-end before there is a
# real production store. The workflow does not care which store; only the
# secret values determine the target.

set -euo pipefail

REPO="jacobfriisstrand/jfs-5th-shopify"

# ---------- pretty-print helpers --------------------------------------------

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
dim()  { printf '\033[2m%s\033[0m\n' "$1"; }
ok()   { printf '\033[32m✔ %s\033[0m\n' "$1"; }
warn() { printf '\033[33m! %s\033[0m\n' "$1"; }
err()  { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; }

# ---------- preflight --------------------------------------------------------

if ! command -v gh >/dev/null 2>&1; then
  err "gh CLI is not installed. See https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh CLI is not authenticated. Run: gh auth login"
  exit 1
fi

bold "GitHub Actions secrets setup for theme-production workflow"
echo "Target repo: $REPO"
echo

# ---------- SHOPIFY_PROD_FLAG_STORE -----------------------------------------

bold "1/2  SHOPIFY_PROD_FLAG_STORE"
cat <<'EOF'

This is the production store's .myshopify.com domain. If you do not yet
have a real production store, point it at the playground store
(jfs-playground.myshopify.com) for testing.

EOF

read -r -p "Enter the store domain (without https://, no trailing slash): " STORE_DOMAIN
STORE_DOMAIN="${STORE_DOMAIN// /}"

if [[ ! "$STORE_DOMAIN" =~ \.myshopify\.com$ ]]; then
  warn "Value does not end in .myshopify.com — double-check before continuing."
  read -r -p "Use \"$STORE_DOMAIN\" anyway? [y/N] " CONFIRM
  [[ "$CONFIRM" =~ ^[Yy]$ ]] || { err "Aborted."; exit 1; }
fi

printf '%s' "$STORE_DOMAIN" | gh secret set SHOPIFY_PROD_FLAG_STORE --repo "$REPO"
ok "SHOPIFY_PROD_FLAG_STORE set."
echo

# ---------- SHOPIFY_PROD_CLI_THEME_TOKEN ------------------------------------

bold "2/2  SHOPIFY_PROD_CLI_THEME_TOKEN"
cat <<'EOF'

This is a Theme Access password for the production store — a free,
store-scoped credential from Shopify's first-party "Theme Access" app.
It is NOT your admin password and NOT a private app token.

How to get it (≈3 minutes):

  1. Open the production store admin in your browser:
       https://<your-store>.myshopify.com/admin
  2. Install the "Theme Access" app from the Shopify App Store:
       https://apps.shopify.com/theme-access
  3. Open the Theme Access app from the Apps menu in the admin.
  4. Click "Create password".
       - Email: any address you control (just receives the token).
       - Name:  something traceable, e.g. "github-actions-prod-deploy".
  5. Check your email. The token starts with "shptka_" followed by a
     long hex string. THIS IS THE ONLY TIME IT IS SHOWN — copy it now.
     If you lose it, delete the password in the Theme Access app and
     regenerate.

Security:
  - Treat this token like a password. Anyone with it can push/pull/delete
    themes on that one store.
  - To rotate: delete it in the Theme Access app, generate a new one,
    re-run this script.
  - Never paste it into chat, commit it, or share via screenshare.

EOF

read -r -p "Press Enter once you have the shptka_… token ready..." _
echo

# -s so the token is not echoed to the terminal.
read -r -s -p "Paste SHOPIFY_PROD_CLI_THEME_TOKEN (input hidden): " THEME_TOKEN
echo

if [[ -z "$THEME_TOKEN" ]]; then
  err "Empty token — aborting."
  exit 1
fi

if [[ ! "$THEME_TOKEN" =~ ^shptka_ ]]; then
  warn "Token does not start with 'shptka_'. That is the expected Theme Access prefix."
  read -r -p "Use it anyway? [y/N] " CONFIRM
  [[ "$CONFIRM" =~ ^[Yy]$ ]] || { err "Aborted."; exit 1; }
fi

printf '%s' "$THEME_TOKEN" | gh secret set SHOPIFY_PROD_CLI_THEME_TOKEN --repo "$REPO"
ok "SHOPIFY_PROD_CLI_THEME_TOKEN set."
echo

# ---------- summary ----------------------------------------------------------

bold "Done."
echo "Both production secrets are now set on $REPO."
echo
dim "Verify with:"
dim "  gh secret list --repo $REPO"
echo
dim "Next steps:"
dim "  1. Bootstrap the named theme on the store (one-time):"
dim "       SHOPIFY_CLI_THEME_TOKEN=<token> SHOPIFY_FLAG_STORE=<store> \\"
dim "         npx shopify theme push --unpublished --theme \"Production\""
dim "     Then publish it via admin (Online Store → Themes → Publish)."
dim "  2. Merge a PR into main to trigger theme-production.yml."

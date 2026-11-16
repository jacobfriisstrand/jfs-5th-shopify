#!/bin/bash
set -euo pipefail

# Load .env.local if present so vars like SHOPIFY_FLAG_STORE_PASSWORD are
# available to the Shopify CLI invocations below. Without this, the comment
# at step 1b ("set via .env.local") would be a lie — bash does not source
# dotenv files automatically.
if [[ -f ".env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.local"
  set +a
fi

# Command-line flags:
#   --pull-live  Force re-pulling the live theme's data files (step 3). By
#                default that pull runs only once — when the pulled data
#                files don't exist locally yet — so local edits to them
#                survive dev server restarts.
PULL_LIVE=false
for arg in "$@"; do
  case "$arg" in
    --pull-live) PULL_LIVE=true ;;
    *) echo "[dev] Unknown argument: $arg (supported: --pull-live)" >&2; exit 1 ;;
  esac
done

# Development script: builds schemas + scripts + CSS once, starts Shopify theme
# dev, waits for its initial sync to complete, THEN starts file watchers.
#
# Why this order matters:
#   `shopify theme dev --theme-editor-sync` performs a full initial pull of
#   every remote theme file (sections, blocks, snippets, locales, templates,
#   ...). Tailwind's `@source` globs in src/styles/app.css cover those same
#   directories, so if `vp build --watch` is already running, every file
#   pulled by Shopify triggers a Tailwind/Vite rebuild — producing hundreds
#   of rebuilds that drown the success banner and prevent the dev server
#   from becoming responsive. We avoid this by deferring the watchers until
#   after Shopify is ready.

# 1. Initial one-shot builds — produce assets/app.css + assets/*.js + inject
#    schemas before Shopify starts syncing.
npm run schemas
npm run scripts
vp build

# 1b. Storefront password (set via `export SHOPIFY_FLAG_STORE_PASSWORD=...` in
#     your shell or `.env.local`). Required by `shopify theme dev` when the
#     dev store has password protection enabled; the CLI cannot prompt because
#     we background it below. Only `theme dev` accepts --store-password;
#     `theme push` uses the Admin API and doesn't need it.
STORE_PASSWORD_FLAG=()
if [[ -n "${SHOPIFY_FLAG_STORE_PASSWORD:-}" ]]; then
  STORE_PASSWORD_FLAG=(--store-password "$SHOPIFY_FLAG_STORE_PASSWORD")
fi

# Live store — theme dev pushes/pulls/previews data against this store, not
# the dev/playground store the CLI is otherwise bound to. Override in
# .env.local if the live store ever moves.
STORE="${SHOPIFY_FLAG_STORE_LIVE:-5th-element-dev.myshopify.com}"
STORE_FLAG=(--store "$STORE")

# Helper: open a URL in the default browser (macOS `open`, Linux `xdg-open`).
open_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url" 2>/dev/null || true
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" 2>/dev/null || true
  else
    echo "[dev] Open this link manually: $url" >&2
  fi
}

# Helper: extract the user-verification URL from a Shopify CLI error payload
# and open it in the default browser. Returns 1 when the payload contains no
# verification challenge (i.e. a different failure).
open_verification_url() {
  local output="$1"
  local url
  url=$(printf '%s\n' "$output" | grep -oE 'https://admin\.shopify\.com/challenges/user_verification\?token=[^"[:space:]]+' | head -1 || true)
  if [[ -z "$url" ]]; then
    return 1
  fi
  echo "[dev] Shopify needs to verify your identity — opening the verification link."
  open_url "$url"
  return 0
}

# Helper: run a Shopify CLI command (streaming its output through `tee $log`)
# and retry the "Shopify needs to verify your identity" abort. That challenge
# can only be completed in a browser, so the first occurrence opens the
# verification link once and the command is retried every few seconds (up to
# VERIFY_TIMEOUT seconds, override with SHOPIFY_VERIFY_TIMEOUT) — once
# verification completes a retry succeeds and the script continues
# unattended. Returns 1 for any other failure or on timeout.
VERIFY_TIMEOUT="${SHOPIFY_VERIFY_TIMEOUT:-300}"
run_shopify_verified() {
  local log="$1"
  shift
  local opened=false
  local wait_start=0
  while true; do
    if "$@" 2>&1 | tee "$log"; then
      return 0
    fi
    if grep -q "user_verification" "$log" 2>/dev/null; then
      if [[ "$opened" == false ]]; then
        opened=true
        wait_start=$(date +%s)
        if ! open_verification_url "$(cat "$log")"; then
          echo "[dev] ERROR: verification challenge detected but no link found in its output." >&2
          return 1
        fi
      fi
      if (( $(date +%s) - wait_start > VERIFY_TIMEOUT )); then
        echo "[dev] Timed out waiting for identity verification (${VERIFY_TIMEOUT}s)." >&2
        echo "[dev] Complete the verification in the opened browser tab, then re-run bin/dev.sh." >&2
        return 1
      fi
      echo "[dev] Waiting for identity verification to complete (retrying in 5s)..."
      sleep 5
      continue
    fi
    return 1
  done
}

# 2. Cleanup trap (PIDs filled in below as watchers are launched).
VP_PID=""
ESBUILD_PID=""
SHOPIFY_PID=""
SHOPIFY_LOG=""
PULL_LOG=""
PUSH_LOG=""
cleanup() {
  [[ -n "$VP_PID"      ]] && kill "$VP_PID"      2>/dev/null || true
  [[ -n "$ESBUILD_PID" ]] && kill "$ESBUILD_PID" 2>/dev/null || true
  [[ -n "$SHOPIFY_PID" ]] && kill "$SHOPIFY_PID" 2>/dev/null || true
  [[ -n "$SHOPIFY_LOG" ]] && rm -f "$SHOPIFY_LOG" 2>/dev/null || true
  [[ -n "$PULL_LOG"    ]] && rm -f "$PULL_LOG"   2>/dev/null || true
  [[ -n "$PUSH_LOG"    ]] && rm -f "$PUSH_LOG"   2>/dev/null || true
}
trap cleanup EXIT

# 3. Pull the PUBLISHED theme's data into local so the preview reflects the
#    live store, not a blank dev theme. `shopify theme dev` builds its
#    development theme from local files, so unless local carries the live
#    theme's data-bearing files the preview renders with no header menu,
#    logo, announcement, or page content.
#
#    Pulled (content/data edited via the theme editor):
#      - config/settings_data.json       global settings (colors, fonts, ...)
#      - sections/header-group.json      header content + menus
#      - sections/footer-group.json      footer content + menus
#      - templates/*.json                per-page section content (homepage,
#        cart, collection, article, blog, page, ... incl. customers/*.json)
#
#    NOT pulled (source code owned by this repo):
#      sections/*.liquid, blocks/*.liquid, snippets/, assets/, locales/,
#      config/settings_schema.json, templates/gift_card.liquid
#
#    The pull runs only ONCE: the pulled files are gitignored, so their
#    absence marks a fresh clone. On every later run the pull is skipped and
#    local edits to these files (hand edits or theme-editor-sync changes)
#    survive dev server restarts. Live-theme edits made after that first
#    pull never reach local automatically — re-sync explicitly with
#    `bin/dev.sh --pull-live` (it overwrites the local copies).
#
#    --live   pull from the remote LIVE (published) theme
#    --only   restrict the pull to the data-bearing files
LIVE_CONFIG_FILES=(
  "--only" "config/settings_data.json"
  "--only" "sections/header-group.json"
  "--only" "sections/footer-group.json"
  "--only" "templates/*.json"
  "--only" "templates/customers/*.json"
)

if [[ "$PULL_LIVE" == false && -f sections/header-group.json && -f templates/index.json ]]; then
  echo "[dev] Live theme data already pulled — skipping (pass --pull-live to re-pull from the published theme)."
else
  echo "[dev] Pulling live theme data from the published store..."
  PULL_LOG=$(mktemp -t shopify-pull.XXXXXX)
  if ! run_shopify_verified "$PULL_LOG" shopify theme pull "${STORE_FLAG[@]}" \
    --live \
    --nodelete \
    "${LIVE_CONFIG_FILES[@]}"; then
    echo "[dev] ERROR: shopify theme pull failed. Run it manually to diagnose:" >&2
    echo "  shopify theme pull --live --nodelete ${LIVE_CONFIG_FILES[*]}" >&2
    echo "[dev] Then re-run bin/dev.sh." >&2
    exit 1
  fi
fi

# 3b. Push local files (now including the live theme's data) to the remote dev
#     theme BEFORE starting `shopify theme dev`. Without this, any divergence
#     between local and the remote dev theme triggers an interactive
#     "Reconciliation Strategy" prompt during `theme dev`'s initial sync.
#     Because we background the CLI (so we can grep its log for the ready
#     banner before starting watchers), keystrokes typed at this terminal go to
#     the bash script's foreground process group rather than the backgrounded
#     CLI — so the prompt is unanswerable. By aligning local→remote up front
#     with a non-interactive `theme push`, the prompt never happens.
#
#     --development   target the linked dev theme (creates one if needed)
#     --nodelete      don't delete remote-only files (some are managed by
#                     Shopify, not us)
#     --json          machine-readable, suppresses interactive prompts
#
#     The CLI occasionally aborts with a "Shopify needs to verify your
#     identity" challenge. run_shopify_verified opens the challenge link in
#     the browser and retries the same command until verification completes
#     (or VERIFY_TIMEOUT elapses).
echo "[dev] Aligning remote dev theme with local files..."
PUSH_LOG=$(mktemp -t shopify-push.XXXXXX)
if ! run_shopify_verified "$PUSH_LOG" shopify theme push \
  "${STORE_FLAG[@]}" \
  --development \
  --nodelete \
  --json; then
  echo "[dev] ERROR: shopify theme push failed. Run it manually to diagnose:" >&2
  echo "  shopify theme push --development --nodelete --json" >&2
  echo "[dev] Then re-run bin/dev.sh." >&2
  exit 1
fi

# 4. Start `shopify theme dev` in the background, mirroring its output to a
#    log file so we can grep for the "Preview your theme" ready banner.
#    The pre-push above ensures no reconciliation prompt is needed.
#
#    --theme-editor-sync syncs theme-editor saves (added sections, content
#    edits) down into the local files, so they survive dev server restarts:
#    the next run's push (step 3b) then carries them back to the remote dev
#    theme. Without it, editor saves live only in the remote dev theme and
#    are wiped by that push on the next start.
#
#    --reconciliation-strategy is mandatory for unattended runs: the default
#    is an interactive prompt the backgrounded CLI can never receive. We use
#    keep-remote so an editor save to a file with concurrent local edits is
#    synced down rather than dropped — a dropped save would resurface as the
#    "my editor section vanished" bug on the next restart's push.
SHOPIFY_LOG=$(mktemp -t shopify-dev.XXXXXX)

shopify theme dev \
  "${STORE_FLAG[@]}" \
  --live-reload=hot-reload \
  --theme-editor-sync \
  --reconciliation-strategy=keep-remote \
  "${STORE_PASSWORD_FLAG[@]}" \
  2>&1 | tee "$SHOPIFY_LOG" &
SHOPIFY_PID=$!

# 5. Wait for Shopify CLI's initial sync to finish — signaled by the
#    "Preview your theme" success banner. Time out after 5 minutes so we
#    never hang forever.
echo "[dev] Waiting for Shopify theme dev to finish initial sync..."
WAIT_START=$(date +%s)
WAIT_TIMEOUT=300
while true; do
  if grep -q "Preview your theme" "$SHOPIFY_LOG" 2>/dev/null; then
    echo "[dev] Shopify sync complete — starting watchers."

    # Auto-open the theme editor in the default browser. The Shopify CLI
    # prints the editor URL in its success banner but does not open it
    # automatically (you'd otherwise have to press `e` in the interactive
    # terminal). Extract the URL and open it.
    EDITOR_URL=$(grep -oE 'https://[^[:space:]]+/admin/themes/[0-9]+/editor[^[:space:]]*' "$SHOPIFY_LOG" | head -1)
    if [[ -n "$EDITOR_URL" ]]; then
      echo "[dev] Opening theme editor: $EDITOR_URL"
      open_url "$EDITOR_URL"
    fi
    break
  fi
  if ! kill -0 "$SHOPIFY_PID" 2>/dev/null; then
    if grep -q "user_verification" "$SHOPIFY_LOG" 2>/dev/null; then
      open_verification_url "$(cat "$SHOPIFY_LOG")" || true
      echo "[dev] Complete the verification in the opened browser tab, then re-run bin/dev.sh." >&2
    else
      echo "[dev] shopify theme dev exited before becoming ready." >&2
    fi
    exit 1
  fi
  if (( $(date +%s) - WAIT_START > WAIT_TIMEOUT )); then
    echo "[dev] Timed out waiting for Shopify dev server (${WAIT_TIMEOUT}s)." >&2
    exit 1
  fi
  sleep 1
done

# 6. Now start the watchers. Use `npx tsx` so the script doesn't depend on
#    `tsx` being globally installed (the previous bare `tsx` invocation
#    failed silently in shells without node_modules/.bin on PATH).
vp build --watch &
VP_PID=$!

npx tsx src/scripts/build.ts --watch &
ESBUILD_PID=$!

# 7. Wait on the foreground Shopify process so the script stays attached and
#    Ctrl-C propagates correctly.
wait "$SHOPIFY_PID"

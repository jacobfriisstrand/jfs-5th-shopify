#!/bin/bash
set -euo pipefail

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

# 2. Cleanup trap (PIDs filled in below as watchers are launched).
VP_PID=""
ESBUILD_PID=""
SHOPIFY_PID=""
SHOPIFY_LOG=""
cleanup() {
  [[ -n "$VP_PID"      ]] && kill "$VP_PID"      2>/dev/null || true
  [[ -n "$ESBUILD_PID" ]] && kill "$ESBUILD_PID" 2>/dev/null || true
  [[ -n "$SHOPIFY_PID" ]] && kill "$SHOPIFY_PID" 2>/dev/null || true
  [[ -n "$SHOPIFY_LOG" ]] && rm -f "$SHOPIFY_LOG" 2>/dev/null || true
}
trap cleanup EXIT

# 3. Push local theme files to the remote dev theme BEFORE starting
#    `shopify theme dev`. Without this, any divergence between local and
#    the remote dev theme triggers an interactive "Reconciliation Strategy"
#    prompt during `theme dev`'s initial sync. Because we background the CLI
#    (so we can grep its log for the ready banner before starting watchers),
#    keystrokes typed at this terminal go to the bash script's foreground
#    process group rather than the backgrounded CLI — so the prompt is
#    unanswerable. By aligning local→remote up front with a non-interactive
#    `theme push`, the divergence (and therefore the prompt) never happens.
#
#    --development   target the linked dev theme (creates one if needed)
#    --nodelete      don't delete remote-only files (some are managed by
#                    Shopify, not us)
#    --json          machine-readable, suppresses interactive prompts
#    --ignore        config/settings_schema.json is generated locally from
#                    src/schemas/** and intentionally diverges; same ignore
#                    as the `theme dev --theme-editor-sync` invocation below
echo "[dev] Aligning remote dev theme with local files..."
shopify theme push \
  --development \
  --nodelete \
  --json \
  --ignore "config/settings_schema.json" >/dev/null

# 4. Start `shopify theme dev` in the background, mirroring its output to a
#    log file so we can grep for the "Preview your theme" ready banner.
#    The pre-push above ensures no reconciliation prompt is needed.
SHOPIFY_LOG=$(mktemp -t shopify-dev.XXXXXX)

shopify theme dev \
  --live-reload=hot-reload \
  --theme-editor-sync \
  --ignore "config/settings_schema.json" \
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
      if command -v open >/dev/null 2>&1; then
        open "$EDITOR_URL" 2>/dev/null || true
      elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$EDITOR_URL" 2>/dev/null || true
      fi
    fi
    break
  fi
  if ! kill -0 "$SHOPIFY_PID" 2>/dev/null; then
    echo "[dev] shopify theme dev exited before becoming ready." >&2
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

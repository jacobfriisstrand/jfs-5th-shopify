# jfs-5th-shopify

A **minimal Shopify theme starter** stripped down from Shopify's
[Horizon](https://github.com/Shopify/horizon) theme. Ships only the runtime
plumbing (cart, header, footer skeleton, product page, predictive search,
section/block schema runtime) so you can compose your own UI
on top with Tailwind v4.

See [`AGENTS.md`](./AGENTS.md) for full architectural notes (Copilot reads it
automatically via the `copilot-instructions.md` symlink).

## Stack

- **TypeScript** everywhere — schemas in `src/schemas/`, web components in
  `src/scripts/`.
- **[vite-plus](https://github.com/voidzero-dev)** for CSS / Tailwind v4 build
  - the custom Shopify schema hot-reload plugin.
- **esbuild** type-strip mode for `src/scripts/*.ts` → `assets/*.js`. No
  bundling — browsers load native ES modules via an importmap declared in
  `snippets/scripts.liquid`.

## Getting started

```sh
npm install
bash bin/setup-preview-secrets.sh   # one-time: set GitHub Actions secrets (see CI)
npm run dev                         # bin/dev.sh — schema build + script watch + theme dev
```

`bin/dev.sh` runs everything in parallel and auto-opens the dev theme editor
once the Shopify CLI dev server is bound to `:9292`.

> **Note**: `bin/setup-preview-secrets.sh` is required on every fresh clone /
> new contributor setup. It sets the two GitHub Actions secrets used by the
> PR preview workflow (`SHOPIFY_FLAG_STORE`, `SHOPIFY_CLI_THEME_TOKEN`).
> Without them the `theme-preview` CI job fails fast on every PR. See
> [CI → Required secrets](#required-secrets) for details.

## Common commands

| Command              | What it does                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `npm run dev`        | Full dev loop (schemas + script watch + theme dev + auto-open editor) |
| `npm run build`      | `npm run schemas && npm run scripts && vp build`                      |
| `npm run schemas`    | Compile `src/schemas/**/*.schema.ts` → JSON → inject into liquid      |
| `npm run scripts`    | esbuild-strip `src/scripts/*.ts` → `assets/*.js`                      |
| `npm run theme:push` | `npm run build && shopify theme push`                                 |

## CI

| Workflow            | Trigger                                 | Purpose                                                                                  |
| ------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `theme-check.yml`   | `pull_request` / `push` (main, develop) | Runs `shopify theme check --fail-level=error` after `npm run build`.                     |
| `perf-budget.yml`   | `pull_request` / `push`                 | Enforces `perf-budget.json`.                                                             |
| `theme-preview.yml` | `pull_request` (main, develop)          | Pushes an unpublished preview theme on every PR push, posts the URL as a sticky comment, |
|                     |                                         | and deletes the theme on PR close.                                                       |

### Required secrets

`theme-preview.yml` needs two repository secrets (Settings → Secrets and
variables → Actions):

| Secret                    | Value                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `SHOPIFY_CLI_THEME_TOKEN` | Theme Access app token for the playground store. **Never** an admin password. Generate via the Theme Access app or Shopify Partners. |
| `SHOPIFY_FLAG_STORE`      | Playground store domain, e.g. `jfs-playground.myshopify.com`.                                                                        |

Without these, the workflow fails fast on `shopify theme push`. Rotate the
token immediately if it leaks.

Fastest way to set them: run the interactive helper from the repo root:

```sh
bash bin/setup-preview-secrets.sh
```

It walks you through obtaining each value (including how to install the
Theme Access app and generate the `shptka_…` token) and pipes them to
`gh secret set` so the token never lands in your shell history.

## Layout

```
assets/      # Compiled output (app.css, base.css, *.js gitignored)
blocks/      # Theme blocks (.liquid)
config/      # Global theme settings
layout/      # theme.liquid + password.liquid
locales/     # Translations
sections/    # Section .liquid files
snippets/    # Reusable Liquid fragments (incl. scripts.liquid importmap)
src/
  scripts/   # TypeScript web components → assets/*.js
  schemas/   # TypeScript schema definitions → liquid {% schema %} tags
  styles/    # Tailwind v4 entry, tokens, base.css
  vite/      # Custom vite-plus plugin for schema hot reload
templates/   # JSON template stubs
```

## License

See [`LICENSE.md`](./LICENSE.md). This repository inherits Shopify's Horizon
license — derivative themes **cannot** be submitted to the Shopify Theme
Store.

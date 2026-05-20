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
npm run dev          # bin/dev.sh — schema build + script watch + theme dev
```

`bin/dev.sh` runs everything in parallel and auto-opens the dev theme editor
once the Shopify CLI dev server is bound to `:9292`.

## Common commands

| Command              | What it does                                                          |
| -------------------- | --------------------------------------------------------------------- |
| `npm run dev`        | Full dev loop (schemas + script watch + theme dev + auto-open editor) |
| `npm run build`      | `npm run schemas && npm run scripts && vp build`                      |
| `npm run schemas`    | Compile `src/schemas/**/*.schema.ts` → JSON → inject into liquid      |
| `npm run scripts`    | esbuild-strip `src/scripts/*.ts` → `assets/*.js`                      |
| `npm run theme:push` | `npm run build && shopify theme push`                                 |

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

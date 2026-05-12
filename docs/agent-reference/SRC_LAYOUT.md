# `src/` Layout — Minimal Commerce Starter

This is a deliberately barebones Shopify theme. `src/` contains only what is
required to run a basic, functioning storefront (browse → variant pick → add
to cart → checkout). No slideshows, modals beyond `<dialog>`, media galleries,
infinite scroll, or theme-editor instrumentation. Build it back up as the
project demands.

## Directory map

```
src/
├── schemas/                        # TypeScript → Liquid {% schema %} compiler
│   ├── build.ts                    # Compiles .schema.ts → JSON, injects into matching .liquid
│   ├── types.ts                    # All Shopify setting types
│   ├── settings.ts                 # Typed factory helpers (text(), imagePicker(), …)
│   ├── settings.schema.ts          # Source for config/settings_schema.json
│   ├── sections/*.schema.ts        # One per sections/<name>.liquid
│   └── blocks/*.schema.ts          # One per blocks/<name>.liquid
│
├── scripts/                        # Custom-element runtime (esbuild type-strip → assets/)
│   ├── build.ts                    # esbuild driver (`npm run scripts`)
│   ├── global.d.ts                 # Shopify / Theme global type declarations
│   │
│   │  Framework primitives
│   ├── component.ts                # Base custom-element class (refs, lifecycle, schedulers)
│   ├── events.ts                   # Typed event bus (ThemeEvents enum, custom event classes)
│   ├── utilities.ts                # DOM helpers (debounce, breakpoints, sanitisers, etc.)
│   ├── morph.ts                    # DOM-diff for swap-in-place updates (cart, sections)
│   ├── focus.ts                    # Focus management (a11y for drawers / dialogs)
│   ├── scrolling.ts                # Scroll-lock helpers
│   ├── performance.ts              # `requestIdleCallback`-style scheduler
│   ├── popover-polyfill.ts         # Popover API polyfill for older browsers
│   │
│   │  Section system
│   ├── section-renderer.ts         # Server-side section render API client
│   ├── section-hydration.ts        # Re-attach behaviour after server render
│   │
│   │  Commerce
│   ├── product-form.ts             # Add-to-cart form with variant + qty handling
│   ├── product-price.ts            # Price display (handles compare_at, ranges)
│   ├── product-sku.ts              # SKU display, updates with variant
│   ├── variant-picker.ts           # Variant option selector (radio / select)
│   ├── component-quantity-selector.ts  # +/- qty input
│   ├── money-formatting.ts         # Format prices with currency rules
│   ├── localization.ts             # Country / language selector
│   ├── dialog.ts                    # Native `<dialog>` wrapper (cart drawer, modals)
│   ├── view-transitions.ts          # Tags cross-document navigations with VT types
│   └── theme-editor.ts              # Editor preview hooks (no-op outside design mode)
│
├── styles/
│   ├── app.css                     # Tailwind v4 entry, @source globs, token imports
│   ├── base.css                    # Reset + sane defaults + .visually-hidden + cross-document view-transitions
│   ├── colors.css                  # `--color-bg`, `--color-fg` → Tailwind tokens
│   ├── typography.css              # `--font-primary` → Tailwind tokens
│   └── radii.css                   # `--radius-input` → Tailwind tokens
│
└── vite/
    └── shopify-schema-plugin.ts    # Vite plugin: HMR for .schema.ts → .liquid {% schema %}
```

## What was deliberately removed

The fork started from Shopify's Horizon theme. The following modules were
deleted to keep the starter minimal — restore from git history if you need them:

| Removed                        | Why                                          |
|--------------------------------|----------------------------------------------|
| `media.ts`, `media-gallery.ts` | Use `<img>` + `featured_image` until you need a gallery |
| `slideshow.ts`                 | Carousels are a design choice — add when needed |
| `accordion-custom.ts`          | Use native `<details>` |
| `anchored-popover.ts`          | Use the popover-polyfill primitive directly |
| `auto-close-details.ts`        | Native `<details>` is enough |
| `floating-panel.ts`            | UI nicety |
| `overflow-list.ts`             | Header-menu overflow trickery |
| `paginated-list.ts`, `paginated-list-aspect-ratio.ts` | Use Shopify's default pagination |
| `product-card.ts`              | Render cards in Liquid; rehydrate per-variant via section render |
| `product-title-truncation.ts`  | Use CSS `line-clamp` |
| `quick-add.ts`                 | Send users to the product page |
| `rte-formatter.ts`             | Style RTE output with CSS |
| `show-more.ts`                 | Use native `<details>` |
| `assets/*.js` (orphans)        | `cart-drawer`, `cart-icon`, `predictive-search`, `facets`, `header`, `results-list`, `search-page-input` — never had `.ts` sources |

`src/scripts/build.ts` only compiles files present in `src/scripts/`, so
deleting a `.ts` file removes its `assets/<name>.js` output on the next build.
The runtime importmap lives in `snippets/scripts.liquid` — keep it in sync
when you add or remove modules.

## Adding a new module

1. Create `src/scripts/my-thing.ts`.
2. If other scripts import from it, add a line to the importmap in
   `snippets/scripts.liquid`.
3. If it registers a custom element used in Liquid, add a
   `<script src="{{ 'my-thing.js' | asset_url }}" type="module">` tag.
4. `npm run build` regenerates `assets/my-thing.js`.

## Adding a new section / block

1. Create `sections/my-section.liquid` with the required `{% schema %}{}{% endschema %}` placeholder.
2. Create `src/schemas/sections/my-section.schema.ts` — see `docs/agent-reference/examples/` for templates.
3. `npm run schemas` (or `npm run build`) compiles the TS schema and injects the JSON into the liquid file.

## Style tokens

See `docs/agent-reference/STYLE_TOKENS.md`. All tokens (color, font, radius, spacing) are developer-defined via Tailwind `@theme` in `src/styles/`. Editors get **no** colour-picker / font-picker / freeform settings.

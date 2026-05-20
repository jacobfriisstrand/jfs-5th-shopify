# AGENTS.md

🚨 MANDATORY: YOU MUST CALL "learn_shopify_api" ONCE WHEN WORKING WITH LIQUID THEMES.

## About this starter

This repository is a **minimal Shopify theme starter** derived from Shopify's
**Horizon** theme. The original Horizon design system was deliberately stripped
down to leave only the **core runtime** — meaning:

- **Kept**: cart drawer, header/footer skeleton, product information, variant
  picker, predictive search, the section/block schema runtime,
  and the JS components that power them.
- **Removed**: Horizon's full design system in `assets/base.css` (~4,876 lines
  reduced to ~205 lines of reset + utilities), all
  marketing-style sections (`hero`, `featured-product`, `marquee`, etc.), and a
  long tail of optional features (`gift-card-recipient-form`, `local-pickup`,
  `recently-viewed-products`, `qr-code-generator`, `volume-pricing`,
  `comparison-slider`, `jumbo-text`, `header-drawer`, etc.).
- **Templates**: every `.json` template was rewritten to a minimal stub:
  `{ "sections": { "main": { "type": "<TYPE>", "settings": {} } }, "order": ["main"] }`
  so you can compose your own page layouts in the theme editor or by hand.

The intent is that you build your own UI (with Tailwind v4) on top of this
trimmed runtime. If you need any of the removed features, restore them from the
`Horizon` reference (or from this repo's git history).

### Supplementary reference

Detailed Horizon-derived guidance (accessibility patterns, theme architecture
notes, section/block examples) lives in
[`docs/agent-reference/`](./docs/agent-reference/). These files were originally
Cursor `.mdc` rules; load them on demand when you need deeper context.

### Accessibility canon

The `*-accessibility.mdc` files in
[`docs/agent-reference/`](./docs/agent-reference/) are the **canonical
accessibility reference** for any component matching their topic. Treat them as
authoritative.

Rules:

- Before building or modifying an interactive component (forms, dialogs,
  menus, accordions, tabs, comboboxes, carousels, etc.), check
  `docs/agent-reference/` for a matching `*-accessibility.mdc` file and follow
  it.
- **Deviations require justification.** A PR that intentionally departs from a
  rule must reference the specific rule line in the PR description and explain
  why the deviation is correct (e.g. "the `.mdc` rule predates Floating UI's
  built-in focus management"). If the rule itself is wrong, amend the `.mdc`
  in the same PR.
- A `.mdc` file for a component category we have explicitly excluded from this
  starter (e.g. `flip-card-accessibility.mdc`) is removed in a separate atomic
  commit so the directory stays signal-rich for grep.
- Lighthouse accessibility ≥ 95 (mobile/4G) is the CI floor, but it is not a
  substitute for the `.mdc` rules — Lighthouse catches structural issues; the
  `.mdc` files cover keyboard interaction, focus order, ARIA wiring, and
  screen-reader announcement patterns that Lighthouse does not check.

See [ADR-0003](./docs/adr/0003-architectural-pillars.md), pillar 8, for the
rationale.

### Headings: always via the `heading` snippet

**All `<h1>`–`<h6>` elements MUST be rendered via
[`snippets/heading.liquid`](./snippets/heading.liquid).** Direct heading
literals (`<h1>…</h1>`, `<h2>…</h2>`, …) in `.liquid` files are forbidden,
except inside the snippet itself.

```liquid
{% render 'heading',
  text: collection.title,
  level: 1,
  id: heading_id,
  class: 'text-2xl font-medium sm:text-3xl'
%}
```

Rules in brief (full reasoning in
[ADR-0008](./docs/adr/0008-heading-snippet-for-all-headings.md)):

- The `level` prop is mandatory unless you want the snippet default
  (`level: 2`). Never pass `level: 2` redundantly — omit it.
- Reusable components (product card, blog card, accordion row, etc.) that
  render a heading MUST accept a `heading_level` parameter and forward it
  to the snippet. They MUST NOT hard-code a level.
- Container components derive child levels as `parent + 1` (e.g. a
  carousel at `heading_level: 2` passes `heading_level: 3` to its cards).
- Existing direct heading literals are migrated opportunistically: when
  you touch a file for unrelated work, convert its headings in the same
  commit.

### Skill canon for liquid, JS/TS, and CSS work

The two skills below are **canonical** for any work in this repo that touches
markup, scripts, or styles. Load and follow them **whenever you create or
edit** a `.liquid`, `.ts`, `.js`, or `.css` file — not just when scaffolding
something new:

- [`.agents/skills/html/SKILL.md`](./.agents/skills/html/SKILL.md) — semantic,
  accessible, low-noise markup. Governs element choice, landmarks, headings,
  forms, and replacement of custom controls with native HTML. Applies to
  `sections/`, `blocks/`, `snippets/`, `layout/`, and any HTML produced by
  `src/scripts/*.ts`.
- [`.agents/skills/css-motion-systems/SKILL.md`](./.agents/skills/css-motion-systems/SKILL.md)
  — motion design for any transitions, keyframes, `linear()` easing, and
  transform strategy. Applies to `src/styles/*.css`,
  Tailwind utility choices in liquid markup, and any animation-related JS.

These are **in addition to** the topic-specific `*-accessibility.mdc` rules in
[`docs/agent-reference/`](./docs/agent-reference/) (see "Accessibility canon"
above). The skills set the baseline; the `.mdc` files cover component-specific
interaction patterns. Both apply.

**Discipline:** if you are about to edit any `.liquid`, `.ts`, `.js`, or
`.css` file and you have not already opened these two skills in the current
session, open them first. Re-reading is cheap; shipping noisy markup or
ad-hoc motion is expensive.

### Minimal scaffolding & least privilege for editor controls

When scaffolding a new `.liquid` file (Section, Block, Snippet, or Layout) you
**must** start from the absolute minimum and only add what was explicitly
asked for.

Guiding principle: **the theme editor exposes as little control over the UI
as possible.** The developer decides which knobs the merchant gets, on a
case-by-case basis. The merchant edits **content** by default; structure,
layout, color, spacing, typography, and motion are owned by code unless the
developer explicitly asks for them to be settings.

Rules:

- Default schema for a new section/block: `name` + `preset` only; **no
  settings unless asked**.
- Markup: smallest correct structure for the request — no "helpful" extras
  (alignment toggles, color overrides, padding controls, spacing presets,
  decorative wrappers, hover affordances, etc.).
- If a setting feels obvious but wasn't asked for ("surely they want a
  heading?"), **ask first** instead of adding it. Apply the principle of
  least privilege: only grant editor control when the developer confirms it.
- Prefer hard-coded values over settings. A setting is a long-term contract
  — deletion is a breaking change in `config/settings_data.json` and any
  `templates/*.json` referencing it.
- When asked to "scaffold a hero / product card / X", interpret literally:
  structural shell only. Wait for follow-up before adding settings or visual
  variations.

### Settings ↔ markup parity

Every setting declared in a section/block schema **must** be both assigned
and referenced in the corresponding `.liquid` file:

1. Add `assign <name> = block.settings.<id>` (or `section.settings.<id>`)
   inside the file's `{% liquid %}` block.
2. Reference `<name>` in the markup with the appropriate guard
   (`{% if <name> != blank %}`, `{% if <name> %}`, etc.).

Conversely, every variable referenced in markup must come from a setting
or a literal Liquid object (`product`, `cart`, …).

Why this is a hard rule: Liquid silently coerces undefined identifiers to
`nil`/empty. A guard like `{% if image != blank %}` over an unassigned
`image` evaluates to `false` forever — the markup inside is dead code,
and **no build step (esbuild, schemas, vp check, theme check) catches
it**. The defect is invisible until someone notices the feature doesn't
work in the editor.

Self-check before declaring a block/section done:

- Diff the schema's `settings[].id` list against the `assign` lines in
  `{% liquid %}` — they should match 1:1 (minus settings the markup
  intentionally ignores, which should be rare and commented).
- Grep the file for each setting id; every id should appear at least
  once in markup.

### One `{% liquid %}` block per file, hoisted to the top

Every `.liquid` file has **at most one `{% liquid %}` block**, placed at
the very top of the file (after the `{% doc %}` header for
snippets/blocks, before any markup or `{% schema %}` tag). All variable
assignments, defaults, and pre-render computation live inside it.

Do **not** sprinkle multiple `{% liquid %}` tags through the file. Do not
use bare mid-file `{% assign %}` or branching blocks whose only purpose
is to compute a value — fold them into the prologue. Conditional
assignments use `if`/`case` _inside_ the prologue.

`{% render %}` and `{% content_for %}` tags stay in the markup (they
produce output, not values). Tiny inline output expressions like
`{{ product.title }}` are fine in markup; they are not "computation".

Rationale and a full before/after example: [ADR-0007](./docs/adr/0007-single-liquid-tag-per-file.md).

## Build pipeline

This project uses **vite-plus** (`vp`), **esbuild** (TypeScript type-strip mode),
and a custom schema generator. There is no bundler in the runtime path —
browsers load native ES modules via an importmap.

### Tooling

- **`vite-plus`** — CSS/Tailwind build, schema hot reload via custom plugin.
  Invoked as `vp build` (one-shot) or `vp build --watch`.
- **`esbuild`** — strips TypeScript syntax from `src/scripts/*.ts` and writes
  ESM output to `assets/<name>.js`. Configured with `bundle: false`,
  `format: 'esm'`, `target: 'es2022'` so `@theme/*` bare specifiers are
  preserved verbatim and resolved at runtime by the browser via the importmap.
- **Schema build** — `tsx src/schemas/build.ts` compiles all
  `src/schemas/**/*.schema.ts` to JSON and injects them into the corresponding
  `{% schema %}` tag of each `.liquid` file.

### Commands

| Command           | What it does                                                     |
| ----------------- | ---------------------------------------------------------------- |
| `npm run build`   | `npm run schemas && npm run scripts && vp build` (~150ms)        |
| `npm run scripts` | esbuild type-strips all `src/scripts/*.ts` → `assets/*.js`       |
| `npm run schemas` | Compiles `*.schema.ts` → JSON → injects into liquid              |
| `bin/dev.sh`      | Builds once, then runs `vp build --watch`, esbuild watch, and    |
|                   | `shopify theme dev --live-reload=hot-reload --theme-editor-sync` |
|                   | in parallel.                                                     |

### Browser runtime: native ESM + importmap

`snippets/scripts.liquid` declares a single `<script type="importmap">` that maps
every `@theme/<name>` specifier to its compiled `assets/<name>.js` URL. Section
and block `.liquid` files load scripts via:

```liquid
<script src="{{ 'product-form.js' | asset_url }}" type="module" fetchpriority="low"></script>
```

The script then `import`s its dependencies via the bare specifier `@theme/...`
which the browser resolves through the importmap. This means **no bundling**
ever happens in production — every script is its own ES module loaded on demand.

When you add a new script under `src/scripts/`, also add an entry to the
importmap in `snippets/scripts.liquid` so it can be imported by other modules.

## Theme Architecture

**Key principles: focus on generating snippets, blocks, and sections; users may create templates using the theme editor**

### Directory structure

```
.
├── assets/         # Compiled output: app.css, *.js (gitignored), critical.css, base.css
├── blocks/         # Reusable, nestable, customizable components (.liquid)
├── config/         # Global theme settings and customization options
├── layout/         # Top-level wrappers for pages (layout templates)
├── locales/        # Translation files for theme internationalization
├── sections/       # Modular full-width page components
├── snippets/       # Reusable Liquid code or HTML fragments
├── src/            # TypeScript source (NOT deployed to Shopify)
│   ├── scripts/    # JS components (TypeScript) — compiled to assets/*.js by esbuild
│   │   ├── component.ts       # Base class for all custom elements
│   │   ├── ...                # 46 modules (cart-drawer, product-form, etc.)
│   │   ├── build.ts           # esbuild entry — type-strip + emit ESM
│   │   └── global.d.ts        # Ambient global typings
│   ├── schemas/    # TypeScript schema definitions
│   │   ├── types.ts           # Schema types + defineSection/defineBlock helpers
│   │   ├── build.ts           # Build script: compiles TS → JSON → injects into liquid
│   │   ├── settings.ts        # Global settings_schema.json source
│   │   ├── templates.ts       # JSON template helpers
│   │   ├── sections/*.schema.ts   # Section schema definitions (one per section)
│   │   └── blocks/*.schema.ts     # Block schema definitions (one per block)
│   ├── styles/                # Tailwind v4 entry + tokens
│   │   ├── app.css            # Tailwind entry, @source directives, @theme tokens
│   │   ├── colors.css         # Color tokens
│   │   ├── typography.css     # Font tokens
│   │   └── radii.css          # Border-radius tokens
│   └── vite/
│       └── shopify-schema-plugin.ts  # Vite plugin for schema hot reload
├── templates/      # JSON templates combining sections/blocks for page layouts
├── tsconfig.json   # TS config (paths: @/* and @theme/*)
└── AGENTS.md       # This file
```

`assets/*.js` is **gitignored** — the source of truth lives in `src/scripts/`
and is regenerated by `npm run scripts`.

### TypeScript layout

- `src/scripts/*.ts` — runtime JS components. Originally JSDoc-typed JavaScript
  from Horizon, bulk-converted to TypeScript and compiled via esbuild's
  type-strip mode. Files that pass strict-ish checks (`noImplicitAny: false`,
  `strictNullChecks: false`) have **no `@ts-nocheck`**; the rest carry a
  `@ts-nocheck` header marked _"pending refinement"_ and should be progressively
  converted to native TS types as you touch them.
- `src/schemas/**/*.schema.ts` — fully type-checked. Define section/block
  schemas using `defineSection()` / `defineBlock()`. The build script writes the
  JSON output back into the matching `.liquid` file's `{% schema %}` tag.
- `tsconfig.json` paths:
  - `@/*` → `./src/*`
  - `@theme/*` → `./src/scripts/*` (matches the runtime importmap)

#### `sections`

- Sections are `.liquid` files that allow you to create reusable modules that can be customized by merchants
- Sections can include blocks which allow merchants to add, remove, and reorder content within a section
- Sections are made customizable by including the required `{% schema %}` tag that exposes settings in the theme editor via a JSON object. Validate that JSON object using the `schemas/section.json` JSON schema
- Examples of sections: hero banners, product grids, testimonials, featured collections

#### `blocks`

- Blocks are `.liquid` files that allow you to create reusable small components that can be customized by merchants (they don't need to fit the full-width of the page)
- Blocks are ideal for logic that needs to be reused and also edited in the theme editor by merchants
- Blocks can include other nested blocks which allow merchants to add, remove, and reorder content within a block too
- Blocks are made customizable by including the required `{% schema %}` tag that exposes settings in the theme editor via a JSON object. Validate that JSON object using the `schemas/theme_block.json` JSON schema
- Blocks must have the `{% doc %}` tag as the header if you directly/staticly render them in other file via `{% content_for 'block', id: '42', type: 'block_name' %}`
- Examples of blocks: individual testimonials, slides in a carousel, feature items

#### `snippets`

- Snippets are reusable code fragments rendered in blocks, sections, and layouts files via the `render` tag
- Snippets are ideal for logic that needs to be reused but not directly edited in the theme editor by merchants
- Snippets accept parameters when rendered for dynamic behavior
- Snippets must have the `{% doc %}` tag as the header
- Examples of sections: buttons, meta-tags, and form elements

#### `layout`

- Defines the overall HTML structure of the site, including `<head>` and `<body>`, and wraps other templates to provide a consistent frame
- Contains repeated global elements like navigation, cart drawer, footer, and usually includes CSS/JS assets and meta tags
- Must include `{{ content_for_header }}` to inject Shopify scripts in the `<head>` and `{{ content_for_layout }}` to render the page content

#### `config`

- `config/settings_schema.json` is a JSON file that defines schema for global theme settings. Validate the shape shape of this JSON file using the `schemas/theme_settings.json` JSON schema
- `config/settings_data.json` is JSON file that holds the data for the settings defined by `config/settings_schema.json`

#### `assets`

- Contains compiled output (`app.css` from Tailwind/Vite) and static files like `critical.css`
- `assets/app.css` is auto-generated by `vp build` — do NOT edit it directly
- Only `critical.css` and truly static files should be manually managed here

#### `locales`

- Stores translation files organized by language code (e.g., `en.default.json`, `fr.json`) to localize all user-facing theme content and editor strings
- Enables multi-language support by providing translations accessible via filters like `{{ 'key' | t }}` in Liquid for proper internationalization
- Validate `locales` JSON files using the `schemas/translations.json` JSON schema

#### `templates`

- JSON file that define the structure, ordering, and which sections and blocks appear on each page type, allowing merchants to customize layouts without code changes

### CSS with Tailwind v4

This project uses **TailwindCSS v4** via the `@tailwindcss/vite` plugin. All styling should use Tailwind utility classes directly in Liquid templates.

**Rules:**

- Use Tailwind utility classes in Liquid markup — do NOT use `{% stylesheet %}` blocks
- **No custom (semantic) classnames in markup or schemas.** Do not write `class="main-page"`, `class="product-card"`, `class="section-wrapper"`, or any similar bespoke class. Likewise, do not set the section schema `class` property to a custom name. Style with Tailwind utilities only. If a pattern truly cannot be expressed with utilities, define it as a Tailwind `@utility` (or `@layer components` rule) in `src/styles/` so it is part of the design system, not an ad-hoc class. The compiled CSS should contain zero hand-named selectors that exist only to be matched against markup.
- Use `{% javascript %}` tags only when component-scoped JS is needed
- Tailwind theme tokens are defined in `src/styles/app.css` via the `@theme` directive
- Shopify CSS variables (defined in `src/styles/` with defaults, overridden by theme settings in layouts) are mapped to Tailwind tokens:
  - `bg-bg` / `text-bg` → `var(--color-background)`
  - `bg-fg` / `text-fg` → `var(--color-foreground)`
  - `font-primary` → `var(--font-primary--family)`
  - `rounded-input` → `var(--style-border-radius-inputs)`
- For new theme tokens, add them to the `@theme` block in `src/styles/app.css`
- Use `@source` directives in `app.css` to ensure Tailwind scans new directories
- **Do not combine a custom `@utility` with a built-in Tailwind utility that
  sets the SAME property.** Custom `@utility` rules and Tailwind's built-in
  utilities live in the same layer with equal specificity, so source order
  decides the winner. For example, a custom `@utility foo { width: 100vw }`
  combined with `class="foo w-full"` will lose: `.w-full { width: 100% }` is
  emitted after the custom rule. Either use the custom utility alone, or
  ensure the custom utility and the Tailwind utility set _different_
  properties (e.g. `grid-column` vs `width`) so they compose cleanly.

**Example — Tailwind in Liquid:**

```liquid
<div class="flex flex-col gap-4 bg-bg text-fg font-primary">
  <h2 class="text-2xl font-bold">{{ section.settings.title }}</h2>
  <button class="bg-fg text-bg px-6 py-3 rounded-input">
    {{ 'general.submit' | t }}
  </button>
</div>
```

### LiquidDoc

Snippets and blocks (when blocks are statically rendered) must include the LiquidDoc header that documents the purpose of the file and required parameters. Example:

```liquid
{% doc %}
  Renders a responsive image that might be wrapped in a link.

  @param {image} image - The image to be rendered
  @param {string} [url] - An optional destination URL for the image

  @example
  {% render 'image', image: product.featured_image %}
{% enddoc %}

<a href="{{ url | default: '#' }}">{{ image | image_url: width: 200, height: 200 | image_tag }}</a>
```

## TypeScript Schema System

**Key principle: NEVER edit `{% schema %}` tags in `.liquid` files directly. Always define schemas in TypeScript.**

All section and block schemas are defined as TypeScript files under `src/schemas/`. The build system compiles them to JSON and injects the result into the corresponding `.liquid` file's `{% schema %}` tag.

### Creating a new schema

**For sections:** Create `src/schemas/sections/<name>.schema.ts`
**For blocks:** Create `src/schemas/blocks/<name>.schema.ts`

The file must `export default` a schema object using `defineSection()` or `defineBlock()`:

```typescript
import { defineSection } from "../types.js";

export default defineSection({
  name: "t:sections.hero.name",
  tag: "section",
  class: "hero",
  settings: [
    {
      type: "text",
      id: "title",
      label: "t:labels.title",
      default: "Hero Title",
    },
    {
      type: "image_picker",
      id: "background",
      label: "t:labels.background",
    },
  ],
  blocks: [{ type: "@theme" }],
  presets: [
    {
      name: "t:sections.hero.name",
      category: "t:general.layout",
    },
  ],
});
```

```typescript
import { defineBlock } from "../types.js";

export default defineBlock({
  name: "t:blocks.slide.name",
  settings: [
    {
      type: "image_picker",
      id: "image",
      label: "t:labels.image",
    },
  ],
  presets: [{ name: "t:blocks.slide.name" }],
});
```

### Building schemas

- **Manual build:** `npm run schemas` (runs `tsx src/schemas/build.ts`)
- **Single file:** `npx tsx src/schemas/build.ts src/schemas/sections/header.schema.ts`
- **Watch mode:** `vp build --watch` — the Vite plugin watches `.schema.ts` files and rebuilds only the changed file when its values change
- **Full build:** `vp build` — builds all schemas + compiles CSS

### Schema types reference

All Shopify setting types are typed in `src/schemas/types.ts`. Key interfaces:

- **`SectionSchema`** — full section schema (name, tag, class, settings, blocks, presets, enabled_on, disabled_on, etc.)
- **`BlockSchema`** — block schema (name, settings, blocks, presets, limit, etc.)
- **`ShopifySetting`** — union of all 30+ setting types (text, textarea, number, range, select, image_picker, color, font_picker, url, product, collection, etc.)
- **`defineSection(schema)`** / **`defineBlock(schema)`** — identity helpers that provide type inference

### How the build works

1. TypeScript schema files are imported dynamically by `src/schemas/build.ts`
2. The default export is serialized to JSON
3. The JSON is compared with the existing `{% schema %}` content in the target `.liquid` file
4. The liquid file is **only written if the JSON actually changed** — no unnecessary file writes

## The `{% schema %}` tag on blocks and sections

**Key principle: the `{% schema %}` tag content is auto-generated from TypeScript schema files. Do NOT edit it manually in `.liquid` files.**

### Good practices

When defining the `{% schema %}` tag on sections and blocks, follow these guidelines to use the values:

**Single property settings**: For settings that correspond to a single CSS property, use inline styles:

```liquid
<div class="collection" style="gap: {{ block.settings.gap }}px">
  Example
</div>
```

The corresponding TypeScript schema:

```typescript
{
  type: "range",
  label: "t:labels.gap",
  id: "gap",
  min: 0,
  max: 100,
  unit: "px",
  default: 0,
}
```

**Multiple property settings**: For settings that control multiple CSS properties, use Tailwind classes via Liquid conditionals:

```liquid
{% liquid
  case block.settings.layout
    when 'full-width'
      assign layout_classes = 'w-full px-0'
    when 'narrow'
      assign layout_classes = 'max-w-2xl mx-auto px-4'
  endcase
%}

<div class="collection {{ layout_classes }}">
  Example
</div>
```

The corresponding TypeScript schema:

```typescript
{
  type: "select",
  id: "layout",
  label: "t:labels.layout",
  options: [
    { value: "full-width", label: "t:options.full" },
    { value: "narrow", label: "t:options.narrow" },
  ],
}
```

#### Mobile layouts

If you need to create a mobile layout and you want the merchant to be able to select one or two columns, use a select setting in your TypeScript schema:

```typescript
{
  type: "select",
  id: "columns_mobile",
  label: "t:labels.columns_mobile",
  options: [
    { value: "1", label: "1" },
    { value: "2", label: "2" },
  ],
}
```

## Liquid

This file does **not** duplicate Liquid's syntax reference. For tags, filters,
objects, delimiters, whitespace control and the `{% liquid %}` block, consult:

- <https://shopify.dev/docs/api/liquid> — official Liquid reference
- <https://shopify.dev/docs/storefronts/themes/architecture> — theme architecture

Anything project-specific (e.g. our schema build pipeline, importmap, or
section/block conventions) lives elsewhere in this document.

## Translation development standards

### Translation requirements

- **Every user-facing text** must use translation filters.
- **Update `locales/en.default.json`** with all new keys.
- **Use descriptive, hierarchical keys** for organization.
- **Only add English text**; translators handle other languages.

### Translation filter usage

**Use `{{ 'key' | t }}` for all text:**

```liquid
<!-- Good -->
<h2>{{ 'sections.featured_collection.title' | t }}</h2>
<p>{{ 'sections.featured_collection.description' | t }}</p>
<button>{{ 'products.add_to_cart' | t }}</button>

<!-- Bad -->
<h2>Featured Collection</h2>
<p>Check out our best products</p>
<button>Add to cart</button>
```

### Translation with variables

**Use variables for interpolation:**

```liquid
<!-- Liquid template -->
<p>{{ 'products.price_range' | t: min: product.price_min | money, max: product.price_max | money }}</p>
<p>{{ 'general.pagination.page' | t: page: paginate.current_page, pages: paginate.pages }}</p>
```

**Corresponding keys in locale files:**

```json
{
  "products": {
    "price_range": "From {{ min }} to {{ max }}"
  },
  "general": {
    "pagination": {
      "page": "Page {{ page }} of {{ pages }}"
    }
  }
}
```

### Best practices

**Content guidelines:**

- Write clear, concise text.
- **Use sentence case** for all user-facing text, including titles, headings, and button labels (capitalize only the first word and proper nouns; e.g., `Featured collection` → `Featured collection`, not `Featured Collection`).
- Be consistent with terminology.
- Consider character limits for UI elements.

**Variable usage:**

- Use interpolation rather than appending strings together.
- Prioritize clarity over brevity for variable naming.
- Escape variables unless they output HTML: `{{ variable | escape }}`.

## Localization standards

Auto-attached when working in `locales/` directory.

### File structure

```
locales/
├── en.default.json          # English (required)
├── en.default.schema.json   # English (required)
├── es.json                  # Spanish
├── est.schema.json          # Spanish
├── fr.json                  # French
├── frt.schema.json          # French
└── pt-BR.json               # Portuguese
└── pt-BR..schema.json       # Portuguese
```

#### Locale files

Locale files are JSON files containing translations for all the text strings used throughout a Shopify theme and its editor. They let merchants easily update and localize repeated words and phrases, making it possible to translate store content and settings into multiple languages for international customers. These files provide a centralized way to manage and edit translations.

**Example:**

```json
{
  "general": {
    "cart": "Cart",
    "checkout": "Checkout"
  },
  "products": {
    "add_to_cart": "Add to Cart"
  }
}
```

#### Schema locale files

Schema locale files, saved with a .schema.json extension, store translation strings specifically for theme editor setting schemas. They follow a structured organization—category, group, and description—to give context to each translation, enabling accurate localization of editor content. Schema locale files must use the IETF language tag format in their naming, such as en-GB.schema.json for British English or fr-CA.schema.json for Canadian French.

**Example:**

```json
{
  "products": {
    "card": {
      "description": "Product card layout"
    }
  }
}
```

### Key organization

**Hierarchical structure:**

```json
{
  "general": {
    "meta": {
      "title": "{{ shop_name }}",
      "description": "{{ shop_description }}"
    },
    "accessibility": {
      "skip_to_content": "Skip to content",
      "close": "Close"
    }
  },
  "products": {
    "add_to_cart": "Add to cart",
    "quick_view": "Quick view",
    "price": {
      "regular": "Regular price",
      "sale": "Sale price",
      "unit": "Unit price"
    }
  }
}
```

**Usage**

```liquid
{{ 'general.meta.title' | t: shop_name: shop.name }}
{{ 'general.meta.description' | t: shop_description: shop.description }}
```

### Translation guidelines

**Key naming:**

- Use descriptive, hierarchical keys
- Maximum 3 levels deep
- Use snake_case for key names
- Group related translations

**Content rules:**

- Keep text concise for UI elements
- Use variables for dynamic content
- Consider character limits
- Maintain consistent terminology

## Examples per kind of asset

Reference snippets, sections and blocks live in
[`docs/agent-reference/`](./docs/agent-reference/) (originally Cursor `.mdc`
rules from Shopify's Horizon theme). Consult them for documented patterns
around accessibility, schema authoring, and section/block composition.

## Agent skills

### Issue tracker

Issues live in GitHub Issues at `jacobfriisstrand/jfs-5th-shopify`, accessed via the `gh` CLI. See [`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md).

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See [`docs/agents/triage-labels.md`](./docs/agents/triage-labels.md).

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See [`docs/agents/domain.md`](./docs/agents/domain.md).

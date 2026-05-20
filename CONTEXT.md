# jfs-5th-shopify

A minimal Shopify theme starter derived from Shopify's **Horizon** theme, with a TypeScript schema build, native-ESM importmap runtime, and Tailwind v4 styling. This file fixes the vocabulary used in issues, ADRs, refactors, and merchant-facing copy so terms don't drift.

## Language

### Theme primitives

**Section**:
A full-width modular page component, defined as a `.liquid` file in `sections/`, customizable in the theme editor.
_Avoid_: Module, widget, component (ambiguous — see below).

**Block**:
A reusable, nestable, merchant-customizable unit (`.liquid` in `blocks/`) that can be placed inside a Section or another Block.
_Avoid_: Component, widget, partial.

**Snippet**:
A reusable Liquid fragment in `snippets/` rendered via `{% render %}`. Not editable in the theme editor.
_Avoid_: Partial, include, helper.

**Template**:
A `.json` file in `templates/` that composes Sections for a given page type. In this starter, templates are intentionally minimal stubs — merchants compose layouts in the editor.
_Avoid_: Page, layout (Layout means something else here).

**Layout**:
A top-level `.liquid` wrapper in `layout/` that provides `<head>`, `<body>`, and globals. Currently `theme.liquid` and `password.liquid`.
_Avoid_: Wrapper, shell.

### Build pipeline

**Schema**:
A TypeScript file under `src/schemas/**/*.schema.ts` exporting a `defineSection()` or `defineBlock()` object. Compiled to JSON and injected into the matching `.liquid` file's `{% schema %}` tag by `npm run schemas`. **Never hand-edit the `{% schema %}` tag.**
_Avoid_: Settings, config, manifest.

**Schema build**:
The `tsx src/schemas/build.ts` step that compiles schemas and writes them into liquid files only when JSON content actually changed.

**vp / vite-plus**:
The build tool wrapping Vite. Used for CSS (Tailwind v4), schema hot-reload, and the project's `vp check` / `vp fmt` standards. `vp` is the canonical CLI; do not invoke `vite` directly.
_Avoid_: Vite (when referring to the project's build entry point).

**Importmap runtime**:
The browser-native ESM loader configured in `snippets/scripts.liquid` that maps every `@theme/<name>` specifier to its compiled `assets/<name>.js`. There is no bundler in the runtime path.
_Avoid_: Bundle, bundler output.

**`@theme/*` specifier**:
The bare-module specifier convention (e.g. `import { Component } from '@theme/component'`) resolved at runtime by the importmap and at type-check time by the `@theme/*` path in `tsconfig.json`. New scripts must register an importmap entry.

**Compiled asset**:
A file under `assets/` produced by the build (`app.css`, `*.js`). Gitignored except for `critical.css` and other manually-curated static files. Source of truth lives in `src/`.
_Avoid_: Bundle, build output.

### Styling

**Token**:
A design value exposed both as a Shopify CSS variable (e.g. `--color-background`, set per-theme by merchant settings) and as a Tailwind theme value (e.g. `bg-bg`) declared in `src/styles/app.css` under `@theme`.
_Avoid_: Variable, theme value (alone — both are too vague).

**Custom element / JS component**:
A `class extends HTMLElement` defined under `src/scripts/` (e.g. `cart-drawer`, `product-form`). The base class is in `src/scripts/component.ts`. Use this term when discussing runtime behaviour; use **Block** or **Section** for the merchant-facing concept.
_Avoid_: Component (alone — ambiguous with Block).

### Heritage

**Horizon**:
Shopify's reference theme. This starter is a stripped-down derivative — core runtime kept, design system and marketing sections removed. When restoring a removed feature, port from Horizon (or this repo's git history).

### Runtime patterns

**Variant update**:
The flow that propagates a variant change through the page. Triggered by `<variant-picker>`, which fetches the section from Shopify (`?section_id=…`) and dispatches a `VariantUpdateEvent` carrying both the variant JSON and the new HTML snapshot. Each interested **Custom element** listens on its closest section and reads its own block out of the snapshot. The server-rendered HTML is the source of truth — see [ADR-0001](docs/adr/0001-variant-updates-use-server-rendered-html.md) for why this is **not** unified into a transactional module.
_Avoid_: Variant sync, variant propagation, variant pipeline.

**Section Rendering**:
The pipeline that re-renders a section server-side via Shopify's Section Rendering API (`?section_id=…`) and patches the live DOM in place using a morph diff. Implemented by `src/scripts/section-renderer.ts` (fetch + cache + dedupe) and `src/scripts/morph.ts` (DOM diff + Custom element `updatedCallback` hook). The default mode replaces the whole section subtree; **Hydration** is the surgical alternative.
_Avoid_: Section refresh, partial render, section reload.

**Hydration**:
A targeted **Section Rendering** mode that morphs only the elements carrying a `data-hydration-key="<value>"` attribute, leaving every other node untouched. Designed for serving a cache-friendly page with stale personalized fragments (cart count, recommendations, B2B pricing, country-dependent copy) and refreshing only those fragments after first paint. Opt in by adding `data-hydration-key` to the elements that need it and calling `hydrate(section.id)` from `@theme/section-hydration`. See [ADR-0002](docs/adr/0002-section-rendering-and-hydration.md).
_Avoid_: Rehydrate, soft refresh, partial update.

**Morph preserver**:
A function registered via `registerMorphPreserver(fn)` from `@theme/morph` that copies state (typically `style` or `data-*` attributes) from the old DOM node to the new one during a **Section Rendering** morph. **Custom elements** that hold UI state not present in the server response (positioned popovers, expanded panels, locally-toggled flags) register a preserver at module top-level. Co-locating the rule with the element that owns it avoids a centralized list in `morph.ts`.
_Avoid_: Morph hook, attribute pin, state guard.

**Defer-load**:
A pattern where a **Custom element** module is not in the initial page bundle and is fetched via dynamic `import('@theme/<name>')` only when the user signals intent (typically focus, hover, or first interaction). Deferred modules count as **0 KB** against the route's **Perf budget** because they are not in the initial bundle. Used in this codebase for predictive search (loaded on first focus of the search input) — see [ADR-0003](docs/adr/0003-architectural-pillars.md). Distinct from a code-split bundle: there is no bundler; the dynamic import resolves through the **Importmap runtime** to an existing `assets/<name>.js`.
_Avoid_: Lazy-load (overloaded with image lazy-loading), code-split.

### Performance contract

**Perf budget**:
The per-route and per-file size + Lighthouse-score contract enforced in CI. Source of truth is `perf-budget.json` at the repo root. Per-route budgets cap the gzipped JS shipped on a route's initial paint (homepage 25 KB, collection 40 KB, PDP 60 KB, cart 50 KB). Per-file caps prevent any single **Compiled asset** from blowing the budget alone (15 KB JS, 30 KB CSS gzipped). Lighthouse-mobile-4G thresholds are perf 90, a11y 95, best-practices 95, SEO 95. Enforced by `scripts/check-budgets.ts` (per-file + per-route, iteration 1) and Lighthouse CI (deferred to iteration 2). See [docs/perf-budget.md](docs/perf-budget.md).
_Avoid_: Performance limit, size cap, weight target.

**Budget change**:
A deliberate edit to `perf-budget.json`. The CI gate fails any PR that exceeds budget; the legitimate path is to raise the relevant number in `perf-budget.json` within the same PR and justify the increase in the PR description. Visible and auditable via `git log perf-budget.json`.
_Avoid_: Budget override, perf waiver.

### Iteration discipline

**Vertical slice**:
A scope-limiting unit of work: ship one route end-to-end (template + sections + blocks + scripts + perf-budget verification + a11y check) before broadening. Iteration 1 is a hero-only homepage slice; iteration 2 broadens to a real PDP and collection. Avoids the failure mode of half-built sections piling up across every template.
_Avoid_: MVP, increment, sprint goal (all overloaded).

### Product model

**Product**:
One Shopify product per merchandise item (e.g. "Hoodie Classic"). Color and size are **Variant option**s on that product — never separate products. See [ADR-0009](docs/adr/0009-product-model-standard-variants.md). This supersedes the colour-as-product model in [ADR-0004](docs/adr/0004-product-model.md).
_Avoid_: Color product, color group (legacy terms, rejected — do not use).

**Variant**:
A Shopify variant on a **Product**, defined by the combination of its **Variant option** values (e.g. `Color: Blue, Size: M`). Variant selection swaps DOM in place via the **Section morph** contract — no route change.
_Avoid_: SKU (overloaded), product variant (verbose).

**Variant option**:
An attribute axis on a **Product** (Shopify supports up to three). The catalogue uses two: `Color` as option 1 and `Size` as option 2. Position is fixed by convention so [`blocks/_product-media-gallery.liquid`](blocks/_product-media-gallery.liquid) can read the active color from `variant.option1` without name lookup.
_Avoid_: Variant axis, option group.

**Variant gallery** (metaobject `variant_gallery`):
A Shopify metaobject with two fields — `color` (product variant reference, pointing at the specific variant the gallery belongs to) and `images` (list of image file references). Authored in Admin → Content → Metaobjects via the native file picker; no JSON, no media IDs. The metaobject definition must have **Storefronts → Read** access enabled (type + fields) so Liquid can read it. The PDP enumerates entries globally via `shop.metaobjects.variant_gallery.values` and matches the entry whose `color` references the active variant. There is **no product metafield** — entries link to variants directly. The matched entry's `images` follow `variant.featured_image` as additional slides; no `product.media` spillover. See [ADR-0009](docs/adr/0009-product-model-standard-variants.md).
_Avoid_: Color gallery metaobject, variant image set, variant gallery metafield (the prior product-metafield approach is deprecated).

## Relationships

- A **Template** composes one or more **Section**s
- A **Section** may contain **Block**s; a **Block** may contain other **Block**s
- A **Section** or **Block** is paired with exactly one **Schema** (TS) that generates its `{% schema %}` tag
- A **Block** or **Section** may render one or more **Snippet**s via `{% render %}`
- A **Section** or **Block** loads a **Custom element** by `<script type="module">` whose imports resolve through the **Importmap runtime**
- A **Custom element** imports peers via the **`@theme/*` specifier**
- The **Schema build** writes into the `{% schema %}` tag of a **Section** or **Block** liquid file
- A **Product** has many **Variant**s, each defined by one value per **Variant option**; option 1 is `Color`, option 2 is `Size`
- A **Variant gallery** metaobject references a specific **Variant** via its `color` field; the PDP enumerates `shop.metaobjects.variant_gallery.values` and renders the `images` of the entry whose `color` matches the active variant
- Every **Compiled asset** under `assets/` is constrained by the **Perf budget**; route-level totals follow the **Importmap runtime** + `<script>` graph

## Example dialogue

> **Dev:** "I need to add a testimonial carousel. Should it be a Section or a Block?"
> **Domain expert:** "If it's the full-width thing the merchant drops onto a Template, it's a **Section**. The individual testimonials inside it are **Block**s with `type: '@theme'` allowing nesting. Define the **Schema** in `src/schemas/sections/testimonials.schema.ts` — don't touch the `{% schema %}` tag in liquid directly. If you need shared markup like a star-rating, factor it as a **Snippet**."
>
> **Dev:** "And the JS for the carousel?"
> **Domain expert:** "A **Custom element** in `src/scripts/testimonials-carousel.ts`. Add it to the **Importmap** in `snippets/scripts.liquid` so other modules can import it via `@theme/testimonials-carousel`."

## Authoring rules

### Skill canon for liquid, JS/TS, and CSS work

The two skills below are **canonical** for any work in this repo that touches markup, scripts, or styles. Load and follow them **whenever you create or edit** a `.liquid`, `.ts`, `.js`, or `.css` file — not just when scaffolding something new:

- [`.agents/skills/html/SKILL.md`](.agents/skills/html/SKILL.md) — semantic, accessible, low-noise markup. Governs element choice, landmarks, headings, forms, and replacement of custom controls with native HTML. Applies to `sections/`, `blocks/`, `snippets/`, `layout/`, and any HTML produced by `src/scripts/*.ts`.
- [`.agents/skills/css-motion-systems/SKILL.md`](.agents/skills/css-motion-systems/SKILL.md) — motion design for any transitions, keyframes, `linear()` easing, and transform strategy. Applies to `src/styles/*.css`, Tailwind utility choices in liquid markup, and any animation-related JS.

These are in addition to the topic-specific `*-accessibility.mdc` rules in [`docs/agent-reference/`](docs/agent-reference/), which remain the canonical accessibility reference for matching component categories (see AGENTS.md → "Accessibility canon"). The skills set the baseline; the `.mdc` files cover component-specific interaction patterns. Both apply.

**Discipline:** if you are about to edit any `.liquid`, `.ts`, `.js`, or `.css` file and you have not already opened these two skills in the current session, open them first. Re-reading is cheap; shipping noisy markup or ad-hoc motion is expensive.

### Minimal scaffolding & least privilege for editor controls

When scaffolding a new `.liquid` file (Section, Block, Snippet, or Layout) you **must** start from the absolute minimum and only add what was explicitly asked for.

Guiding principle: **the theme editor exposes as little control over the UI as possible.** I (the developer) decide which knobs the merchant gets, on a case-by-case basis. The merchant edits **content** by default; structure, layout, color, spacing, typography, and motion are owned by code unless I explicitly ask for them to be settings.

Rules:

- Default schema for a new section/block: name + preset only; **no settings unless asked**.
- Markup: smallest correct structure for the request — no "helpful" extras (alignment toggles, color overrides, padding controls, spacing presets, decorative wrappers, hover affordances, etc.).
- If a setting feels obvious but wasn't asked for ("surely they want a heading?"), **ask first** instead of adding it. Apply the principle of least privilege: only grant editor control when I confirm I want it.
- Prefer hard-coded values over settings. A setting is a long-term contract — deletion is a breaking change in `settings_data.json`.
- When asked to "scaffold a hero / product card / X", interpret literally: structural shell only. Wait for follow-up before adding settings or visual variations.

### Branching & commits

**Branch model:**

- `develop` — **default branch** and integration branch. All feature branches fork from and merge back into `develop`. Because it is the default branch, GitHub's built-in "closing keywords on merge" behaviour (`Closes #N`, `Fixes #N`, `Resolves #N` in PR body) auto-closes referenced issues when their PR merges here.
- `main` — release branch. Only updated by merging `develop` at release time. Never commit directly. Shares full history with `develop` so `develop → main` merges are always fast-forward / conflict-free.
- `feature/<issue-number>-<slug>` — short-lived feature branches off `develop` (e.g. `feature/12-hamburger-menu`). One branch per issue. Delete after merge.

**Commits:**

Every commit message must follow [Conventional Commits](https://www.conventionalcommits.org/) **and** include the GitHub issue number + short title in the scope so history is greppable from either side.

Format:

```
<type>(#<issue>-<short-title>): <imperative summary>
```

- `<type>` — `feat`, `fix`, `refactor`, `docs`, `chore`, `perf`, `test`, `style`, `build`, `ci`, `revert`.
- `<issue>` — the GitHub issue number this commit advances (e.g. `12`). For commits not tied to an issue (one-off chores, repo hygiene), drop the scope: `chore: <summary>`.
- `<short-title>` — 2-4 word kebab-case slug derived from the issue title.
- `<imperative summary>` — present tense, lowercase, no trailing period, ≤ 72 chars.

Examples:

```
feat(#12-hamburger-menu): add header drawer with focus trap
fix(#19-pdp-color-swatches): correct contrast on selected state
refactor(#11-header-footer-shell): adopt Tailwind utilities for header
docs: require html + css-motion-systems skills for all liquid edits
```

For atomic-commit batches that touch multiple issues, split into separate commits — one issue per commit.

## Flagged ambiguities

- **"Component"** — used colloquially for both **Block** (merchant-facing) and **Custom element** (runtime JS). Resolved: prefer the specific term. If you must use "component", qualify it ("JS component" / "block component").
- **"Layout"** — could mean a Shopify `layout/*.liquid` file or a CSS arrangement. Resolved: capital-L **Layout** = the file in `layout/`; otherwise use "arrangement" or a Tailwind-specific term.
- **"Settings"** — Shopify uses this for both global theme settings (`config/settings_schema.json`) and per-section/block settings. Resolved: say **global settings** vs **section settings** / **block settings** when it matters.
- **"Bundle"** — there is no bundling in this project. Use **Compiled asset** or **Module**.

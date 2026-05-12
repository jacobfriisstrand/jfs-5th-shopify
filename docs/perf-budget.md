# Performance budget

This document is the operational reference for the **Perf budget** decision in [ADR-0003](adr/0003-architectural-pillars.md). It tells you what the budgets are, where they're enforced, and how to legitimately change them.

## Numbers

The source of truth lives in `perf-budget.json` at the repo root. The numbers below are mirrored here for human readability; if the two ever disagree, **`perf-budget.json` wins** and this file is wrong.

### Per-route, gzipped initial-paint JS

| Route             | Budget    |
| ----------------- | --------- |
| `/`               | **50 KB** |
| `/collections/*`  | **40 KB** |
| `/products/*`     | **60 KB** |
| `/cart`           | **50 KB** |

"Initial-paint JS" means every `assets/*.js` referenced by a `<script>` tag in the route's loaded `.liquid` graph that runs before first interaction. **Defer-loaded** modules (dynamic `import()` triggered by user interaction) count as **0 KB**.

### Per-file, gzipped

| Asset type        | Cap       |
| ----------------- | --------- |
| `assets/*.js`     | **15 KB** |
| `assets/*.css`    | **30 KB** |

Per-file caps prevent a single file from blowing the route budget alone. They apply to **every** file in `assets/`, regardless of which routes load it.

### Lighthouse mobile/4G

| Category          | Threshold |
| ----------------- | --------- |
| Performance       | **≥ 90**  |
| Accessibility     | **≥ 95**  |
| Best practices    | **≥ 95**  |
| SEO               | **≥ 95**  |

## Enforcement

### Iteration 1 — `scripts/check-budgets.ts`

Runs in GitHub Actions after `npm run build`. Locally:

```bash
npm run build
npx tsx scripts/check-budgets.ts
```

Algorithm:

1. Read `perf-budget.json`.
2. Walk `assets/*.{js,css}`, gzip each (Node `zlib.gzipSync`), record byte size.
3. Fail any file that exceeds the per-file cap.
4. For each route in the budget config, walk the `.liquid` template + sections + blocks + snippets graph. Collect the set of `assets/*.js` referenced via `<script src="{{ '<name>.js' | asset_url }}">`. Sum gzipped sizes.
5. Fail any route that exceeds its budget.
6. On any failure, print a per-route table showing actual vs. budget vs. delta, then exit 1.

The script is **deterministic**: the same `assets/` directory and the same `perf-budget.json` always yield the same pass/fail. There is no "warn-only" mode.

#### Defer-load detection

The walker skips `<script>` tags whose `src` is **not** statically present, recognising the **Defer-load** pattern: those modules are imported dynamically via `import('@theme/<name>')` from another script, never via a `<script>` tag at parse time. They appear in `snippets/scripts.liquid`'s importmap but not in any route's static script list, and so contribute 0 KB to that route.

A module that is dynamically imported but is **also** present as a `<script>` tag on the same route is counted (it's not actually deferred — it's loaded eagerly and additionally accessible by name).

### Iteration 2 — Lighthouse CI (deferred)

Lighthouse CI runs against an unpublished preview theme on each PR. Requires:

- `SHOPIFY_CLI_THEME_TOKEN` in GitHub Actions secrets.
- A `lighthouserc.json` listing the URLs to audit (`/`, `/collections/all`, `/products/<sample>`, `/cart`).
- `lhci autorun` step in CI, with thresholds set to the table above.

Deferred until iteration 2 lands a real PDP and collection — Lighthouse over a hero-only homepage is a low-signal gate.

## Changing a budget — `[budget-bump]`

The CI gate fails any PR that exceeds the budget. The **only** legitimate way to merge such a PR:

1. Decide the new budget. Justify it in the PR description (e.g. "PDP gains a recommendations carousel that adds 8 KB; new budget 68 KB").
2. Edit `perf-budget.json` in the same PR.
3. Prefix the PR title with `[budget-bump]` (literal, lowercase, square brackets).

CI passes only when both conditions hold: title prefix present **and** `perf-budget.json` changed in the diff.

The `[budget-bump]` prefix is what makes budget changes auditable. Run `git log --all -- perf-budget.json` to see the history of every change with its justification.

### What is **not** a `[budget-bump]`

- A typo fix in `perf-budget.json` that doesn't change a number — no prefix needed; CI passes anyway because no budget is exceeded.
- A refactor that drops bytes — no prefix; CI passes; consider tightening the budget in a follow-up PR.
- A "we'll fix it later" exemption — there is no exemption mechanism. Either the change fits the budget, or the budget moves with explicit justification.

## How to investigate a budget failure

When `scripts/check-budgets.ts` fails, the printed table tells you which file or route blew the budget. Common culprits:

- **A new `src/scripts/<name>.ts` was added** and it's both large and statically loaded. Options: defer-load it (ADR-0003 pillar 7), split it, or accept a `[budget-bump]`.
- **A vendored library was imported into an existing module.** Check `import` lines in the modified module; the importmap doesn't bundle, but a transitively-imported large module still counts toward the route.
- **A new section was added to a route's template** and it pulls in a script. Either the script is defensible (and the budget moves) or the section can be defer-rendered via `data-hydration-key` (ADR-0002).

Run `gzip -c assets/<file>.js | wc -c` to inspect a specific file's gzipped size locally.

## Why these numbers

- **50 KB homepage** — a fully-fledged Shopify homepage typically composes hero, featured product/collection, image-with-text, testimonials, and newsletter sections. 50 KB allows those sections plus the global runtime (header, dialog, view-transitions, polyfills) without pre-emptively shipping PDP-specific code. If the homepage adds quick-add cards (which pull in `product-form.js` + `variant-picker.js`), that's an explicit `[budget-bump]` conversation — not a free lunch.
- **40 KB collection** — adds filter form interactivity (a thin enhancement layer; full filtering is server-rendered per ADR-0003 pillar 6). _Note: this is currently lower than the homepage; revisit when collection gains quick-add or comparable JS-heavy surfaces._
- **60 KB PDP** — adds variant picker, image gallery, swatch interactions. Highest budget because it's the highest-conversion surface and its JS pays for itself.
- **50 KB cart** — adds cart-line-item editing, accelerated checkout button initialisation. Lower than PDP because most cart traffic is post-conversion-intent.
- **15 KB per JS file** — a single file at the cap can fit in one of the smaller route budgets. Higher would let one file dominate.
- **30 KB per CSS file** — Tailwind v4's tree-shaken output for a complex page sits comfortably under this. Higher would mean either too many components in one stylesheet or an unconfigured `content` glob.

These numbers are **calibrated for iteration 1 + iteration 2**. They should be tightened — not relaxed — as the catalogue stabilises. The existence of `[budget-bump]` is to make the rare necessary loosenings visible, not to make them routine.

## Related

- [ADR-0003 — Architectural pillars](adr/0003-architectural-pillars.md), pillar 3 (rationale) and pillar 7 (defer-load).
- `CONTEXT.md` → **Perf budget**, **`[budget-bump]`**, **Defer-load**.
- `scripts/check-budgets.ts` — the enforcer (to be added).
- `perf-budget.json` — the data (to be added).

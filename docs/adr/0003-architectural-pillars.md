# ADR-0003 — Architectural pillars: Liquid-first, schema-only types, perf-budget CI, generators, vertical slicing, full-page filters, defer-load, accessibility canon

## Status

Accepted.

## Context

This starter inherits Horizon's runtime (cart drawer, variant picker, section rendering, view transitions) but ships none of the marketing sections, design system, or templates that Horizon used to demonstrate them. We are building a real store on top of that runtime, and a long set of cross-cutting decisions had to land before any feature work could proceed without re-litigation.

ADR-0001 covered variant updates. ADR-0002 covered section rendering and morph preservers. This ADR captures the eight remaining pillars that govern how every section, block, script, and CI gate in this codebase is built and shipped.

The pillars come from a grilling pass that used [`.agents/skills/grill-with-docs/SKILL.md`](../../.agents/skills/grill-with-docs/SKILL.md) — each was framed as a recommendation with explicit alternatives and push-back angles, then locked.

## Decision

### 1. Liquid-first; JS only when Liquid cannot deliver the behaviour

Every feature starts as Liquid + form posts + full-page navigation. JavaScript (a **Custom element** in `src/scripts/`) is added only when:

- the behaviour cannot be expressed by a server round-trip (drag, drop, focus management, view transitions, intersection observers), or
- the round-trip cost is measurably worse than a localised DOM update (already covered by ADR-0001 and ADR-0002 for variant updates and section rendering).

Rationale: Liquid runs on Shopify's edge, requires zero client bytes, and is the format the merchant (via theme editor) and Shopify (via section rendering API) both already understand. Every JS-only feature is a private dialect.

### 2. Schema-only typesafety

Type checking is concentrated on `src/schemas/**/*.schema.ts`. The `defineSection()` / `defineBlock()` helpers in `src/schemas/types.ts` give full inference; runtime scripts (`src/scripts/*.ts`) are TypeScript-syntax-stripped only (esbuild's `transform`, no type checking against types from elsewhere).

Rationale: schemas are the contract between merchant input and Liquid. Getting them wrong silently corrupts the theme editor. Runtime JS errors surface in the browser within seconds. The cost-to-benefit ratio of full strict TS across `src/scripts/` is poor when the same files are also bulk-converted from Horizon JSDoc and carry `@ts-nocheck` headers pending refinement.

### 3. Perf budget enforced in CI with concrete numbers

Source of truth: `perf-budget.json` at the repo root.

Per-route gzipped JS budgets (initial paint, deferred modules excluded):

- `/` — **50 KB**
- `/collections/*` — **40 KB**
- `/products/*` — **60 KB**
- `/cart` — **50 KB**

Per-file caps:

- Any single `assets/*.js` — **15 KB** gzipped
- Any single `assets/*.css` — **30 KB** gzipped

Lighthouse mobile/4G:

- Performance ≥ **90**
- Accessibility ≥ **95**
- Best-practices ≥ **95**
- SEO ≥ **95**

Enforcement (iteration 1): `scripts/check-budgets.ts` runs in GitHub Actions after `npm run build`. It walks `assets/*.{js,css}`, gzips each, and walks the `.liquid` graph from each route's template to compute per-route module sets. Failure is a non-zero exit code → red CI. The legitimate way to merge a budget-exceeding change is to raise the relevant number in `perf-budget.json` within the same PR and justify it in the description; the change stays auditable in `git log perf-budget.json`.

Enforcement (iteration 2): Lighthouse CI against an unpublished preview theme. Deferred because it requires `SHOPIFY_CLI_THEME_TOKEN` in GH secrets and a deployed preview per PR.

See [docs/perf-budget.md](../perf-budget.md) for the operational reference.

### 4. Generators + importmap consistency check

Two scripts under `scripts/`:

- **`scripts/new.ts`** (run via `npm run new`) — scaffolds new sections, blocks, snippets. Hybrid CLI: positional args (`section <name>` / `block <name>` / `snippet <name>`) + flags (`--script`, `--private`, `--templates page,product,collection`, `--no-preset`). Interactive prompts only fire when a TTY is present **and** a required value is missing — agent invocations stay headless via flags. The generator imports `defineSection` / `defineBlock` from `src/schemas/types.ts` so generated `.schema.ts` files stay in sync with the schema type definitions automatically.

- **`scripts/check-importmap.ts`** — verifies bidirectional 1:1 mapping between `assets/*.js` and the `<script type="importmap">` block in `snippets/scripts.liquid`. Fails CI on any orphan asset or orphan map entry.

Block underscore convention enforced by the generator: `blocks/_<name>.liquid` (private, composed by parent) versus `blocks/<name>.liquid` (merchant-pickable in theme editor). Selected via `--private`.

Rationale: the boilerplate for a new schema-paired section spans 4 files (`liquid`, `.schema.ts`, optional `src/scripts/<name>.ts`, importmap entry, locale key). Hand-rolling this drifts. The check-importmap script catches the most common drift mode (forgetting the importmap entry → 404 in the browser, only at runtime).

### 5. Defer Vitest until first non-trivial pure function; vertical-slice iteration

No test runner is configured. The first PR that introduces a pure function with branching logic (current candidate: `_resolve-primary.liquid`'s sibling-fallback rule, if it grows past one Liquid line) is the one that adds Vitest. Premature test infrastructure pollutes the repo with type definitions, watchers, and config that don't match how this codebase will actually be tested.

Iteration discipline: every iteration ships one route end-to-end before broadening. Iteration 1 = hero-only homepage. Iteration 2 = real PDP + collection. The opposite (broaden-first, finish-later) leaves every template half-built.

See `CONTEXT.md` → **Vertical slice** for the term definition.

### 6. Filters use full-page navigation; no client-side SPA layer

Collection and search filters submit the form (or update `?…=…` and `location.assign`) and let Shopify re-render the collection. No `fetch + replaceState + morph` SPA layer.

Rationale: Shopify's collection rendering already serves cache-friendly HTML with the right filter results. Adding an SPA layer pays JS bytes against the **Perf budget**, fights the back/forward cache, and re-implements a server feature in the browser. The page-load cost is not the bottleneck on this stack.

If a single filter (e.g. an autocomplete combobox over filter values) needs incremental UX, it's a localised enhancement on the form element, not a route-level architecture change.

### 7. Defer-load for non-critical interactive surfaces

Pattern: bind a one-shot interaction listener (typically `focusin`); on first trigger, `await import('@theme/<name>')` and hand off. The dynamic import resolves through the **Importmap runtime** to an existing `assets/<name>.js` — there is no bundler producing a separate chunk. The deferred module costs **0 KB** against the route's initial-paint budget.

Iteration-1 application: predictive search. The header search input binds a `focusin` listener; first focus dynamically imports `@theme/predictive-search`. While the import resolves, an `aria-live="polite"` element renders "Loading search…" so screen-reader users aren't surprised. Pages where intent is already proven (`/search`, `/search?q=…`) eager-load the module instead.

See `CONTEXT.md` → **Defer-load**.

### 8. Accessibility canon: `docs/agent-reference/*-accessibility.mdc` plus the html/motion skills

The 27 `*-accessibility.mdc` files in `docs/agent-reference/` (inherited from Horizon's Cursor rules) are the **canonical reference** for any component matching their topic. Deviations require a justification in the PR description that links the specific rule line being deviated from.

In addition, two skills are **canonical** for any work that touches markup, scripts, or styles — not only for new scaffolds, but for **every** edit to a `.liquid`, `.ts`, `.js`, or `.css` file:

- [`.agents/skills/html/SKILL.md`](../../.agents/skills/html/SKILL.md) — semantic, accessible, low-noise markup.
- [`.agents/skills/css-motion-systems/SKILL.md`](../../.agents/skills/css-motion-systems/SKILL.md) — motion design, transform strategy, easing, and View Transitions usage.

The skills set the baseline for element choice, landmark structure, native-control preference, and motion accessibility (`prefers-reduced-motion`, GPU-friendly properties, timing heuristics). The `*-accessibility.mdc` files layer component-specific interaction patterns on top (focus trapping in dialogs, keyboard semantics for menus, screen-reader announcement choreography). Both apply; the skills do not replace the `.mdc` canon and the `.mdc` canon does not replace the skills.

No axe-core CI in iteration 1. The Lighthouse a11y ≥ 95 gate (pillar 3) is sufficient for the iteration-1 surface area. Axe-core is the finer mesh added when interactive components beyond cart and predictive search land.

Pruning: `.mdc` files for components we have explicitly excluded (e.g. `flip-card-accessibility.mdc`, `chat-window-accessibility.mdc`, `comparison-slider`-adjacent rules) are removed in iteration 1 as a separate atomic commit so the directory stays signal-rich for agent grep.

The declaration of canon also lives in `AGENTS.md` — see the "Accessibility canon" section.

## Consequences

### Positive

- **Every CI gate has a number.** Raising a budget requires editing `perf-budget.json` in the PR — a visible diff, no silent drift.
- **One mental model for "should this be JS?"** — pillar 1 + pillar 7 between them describe both the default (Liquid) and the escape hatch (defer-load).
- **Generators stay schema-synced.** Pillar 4's import-from-types trick means the generator never falls behind the schema definitions.
- **Vertical slicing sets a per-iteration definition of done.** A homepage with no PDP is acceptable for iteration 1; a half-built PDP and a half-built collection is not.
- **Accessibility has a canonical reference without CI weight.** Pillar 8's "deviations require justification" is a code-review check, not a tooling check, and adds zero CI minutes.

### Negative

- **No test runner means refactors of pure logic carry risk.** Mitigated by pillar 5's commitment to add Vitest at the first non-trivial pure function. The cost of catching this late is a single PR's worth of test infrastructure.
- **Per-route budget calculation requires walking the `.liquid` graph.** This is non-trivial code (~150 lines in `scripts/check-budgets.ts`). Mitigated by writing it once and treating it as part of the build infrastructure.
- **Budget bumps are an honour-system gate** — a sloppy review can wave through an unjustified increase. Mitigated by the auditable `git log perf-budget.json` trail.
- **Accessibility canon depends on the `.mdc` files staying truthful.** They were Shopify Horizon's rules; some may age. Mitigated by treating them as living documents — deviations link the rule line and may also amend the `.mdc` if the rule itself is wrong.
- **Defer-load adds a one-time first-keystroke latency** for the deferred surface. Negligible (~100–200 ms on warm 4G for a 10 KB module) and only on the first interaction per session. Visible to screen readers via the `aria-live` mitigation.

## Future reviews

- A pillar should be revisited when a real consumer fails to fit. E.g. if pillar 6 (full-page filter nav) starts producing measurably worse UX than an SPA on a specific route, that route's experience trumps the pillar — write the SPA layer, then update this ADR with the carve-out.
- The per-route budgets are calibrated to a hero-only homepage and a future PDP/collection. If the catalog grows to require persistent client-side personalization (recommendations, recently viewed) that's loaded eagerly, revisit the numbers — and prefer adjusting the budget over hiding the cost.
- If more than ~3 surfaces use defer-load (pillar 7), extract the binding pattern into a shared helper (`@theme/defer-on`) instead of duplicating the focus-listener boilerplate per surface.
- If axe-core ever lands (pillar 8), update this ADR with the new gate and the URL set it covers, and consider removing the "deviations require PR justification" rule for component-categories that axe now mechanises.

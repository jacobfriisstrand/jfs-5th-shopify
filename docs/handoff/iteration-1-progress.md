# Iteration-1 progress + handoff

This file is a session-handoff snapshot. It exists so a fresh agent session can
pick up where the previous one left off without re-deriving context.

**Created:** during the session that landed commits `c95e0de`..`3e7e58c` on
`main` (the Horizon strip + build pipeline + iteration-1 perf tooling).

---

## Where we are in the Pocock-ordered iteration-1 plan

Iteration 1 = the smallest end-to-end vertical slice that proves every pillar
of the architecture is wired up, on a real route, under budget. The slice is:
**hero section on `/` (homepage), measured against the perf budget, with the
registration linter and CI gate in place.**

Pocock order: do the *measurement and process* infrastructure FIRST, then the
slice. That way the slice is born inside the regime that will police every
later change.

| # | Step | State | Commit |
|---|---|---|---|
| 1 | `perf-budget.json` (per-route caps, per-file caps, Lighthouse floors) | done | `3e7e58c` |
| 2 | `scripts/check-budgets.ts` (per-file + per-route + custom-element registration linter) | done | `3e7e58c` |
| 3 | `.github/workflows/perf-budget.yml` (CI on PR + push to main/develop) | done | `3e7e58c` |
| 4 | `scripts/new.ts` (scaffolder for sections/blocks: liquid + schema + optional script + importmap entry, atomic) | done | `3e7e58c` |
| 5 | `sections/hero.liquid` + matching `src/schemas/sections/hero.schema.ts` | **next** | — |
| 6 | Wire `templates/index.json` to render the hero | not started | — |
| 7 | Manual Lighthouse pass on the dev preview, confirm the budget caps are realistic | not started | — |

Iteration 1 ends when step 7 passes.

---

## State of the repo at handoff

- Branch: `main`
- 9 commits ahead of `origin/main` — **not yet pushed.**
- `git status`: clean.
- `vp check`: 157 files formatted, 91 files lint/typecheck clean.
- `npx tsx scripts/check-budgets.ts`: all 4 routes within budget, all 11
  custom elements registered.

### Commits landed this iteration

```
3e7e58c feat(perf): iteration-1 budget tooling, registration linter, CI workflow, scaffolder
656ac74 docs: project conventions, agent context, ADRs (0001/0002/0004/0005), agent-reference
48abef1 chore: untrack compiled JS outputs in assets/
cf1d957 refactor(theme): trim Horizon to minimal commerce starter (Tailwind + minimal layout)
71cce51 feat(schemas): add TypeScript schema definitions for retained sections and blocks
f6cc8eb feat(scripts): port retained Horizon JS modules to TypeScript
436aa26 chore(build): add vite-plus + esbuild + schema build pipeline
07feac6 chore(horizon-strip): remove unused Horizon assets, blocks, sections, locales, cursor rules
c95e0de chore(repo): add gitignore, shopifyignore, gitattributes, theme-check config
8e34c58 init   ← (this is the original Horizon theme, untouched)
```

---

## Key facts the next session needs

### Architecture pillars (ADR-0003, full text in `docs/adr/0003-architectural-pillars.md`)

The eight pillars iteration-1 must respect:

1. **No-bundle ESM + importmap.** `src/scripts/*.ts` compiles via esbuild
   type-strip (no bundling) to `assets/<name>.js`. Bare `@theme/*` specifiers
   in source files are preserved verbatim and resolved by the browser at
   runtime via the `<script type="importmap">` block in
   `snippets/scripts.liquid`.
2. Server-rendered HTML for state changes (variant updates etc.) — see
   ADR-0001.
3. Section/block schema runtime (Shopify-native).
4. **Perf-budget contract.** Per-route gzipped initial-paint static graph.
   Decimal-KB (50 KB = 50 000 bytes). Defined in `perf-budget.json`.
   Enforced by `scripts/check-budgets.ts`. Every PR runs it. Raising a
   budget requires editing `perf-budget.json` in the same PR.
5. Accessibility canon: the `*-accessibility.mdc` files in
   `docs/agent-reference/` are authoritative. Deviations require
   justification in the PR.
6. **Section-owned defer-load.** Custom-element registration scripts live
   with the section that emits them. The registration linter (3rd pass of
   `check-budgets.ts`) enforces this — every `<foo-component>` emitted in a
   route's liquid graph must have a matching `<script src>` ancestor in the
   same graph.
7. AI-navigable architecture (CONTEXT.md + ADRs as ground truth).

### Perf budget current state (`perf-budget.json`)

| Route | Cap (gzip) | Current usage |
|---|---|---|
| `/` (homepage) | 50 KB | 23.1 KB |
| `/collections/*` | 40 KB | 23.1 KB |
| `/products/*` | 60 KB | 35.0 KB |
| `/cart` | 50 KB | 25.2 KB |

`/` was originally specced at 25 KB but bumped to 50 KB to be a realistic
cap for a fully-fledged Shopify homepage (which is what the hero slice will
grow into). Note `/collections/*` (40 KB) is now lower than `/` — flagged
in `docs/perf-budget.md` for revisit if collections grows hero-style media.

### The scaffolder (`scripts/new.ts`)

```bash
npx tsx scripts/new.ts <section|block> <name> [--with-script] [--private]
```

- `<name>` must be kebab-case (`[a-z][a-z0-9-]*[a-z0-9]`).
- `--with-script` creates `src/scripts/<name>.ts` with a `Component` subclass
  registering `<<name>-component>` and inserts the `@theme/<name>` mapping
  into the importmap alphabetically (idempotent).
- `--private` is blocks only; prefixes filename with `_` (Shopify convention
  for blocks not directly addable in the editor).
- Atomic: refuses to write anything if any target file exists.

### Custom-element registration linter

The 3rd pass of `scripts/check-budgets.ts` walks each route's liquid graph,
finds `<foo-component>` tags, looks up the registering script in
`src/scripts/`, and fails if that script isn't included via a `<script src>`
in the same graph. This means: forgetting to add the `<script>` tag for a new
custom element is a CI failure, not a runtime blank-screen mystery.

---

## How to do step 5 (the next step)

The recommended path **dogfoods the generator**:

```bash
# 1. scaffold the files
npx tsx scripts/new.ts section hero

# 2. add the translation key (per AGENTS.md translation rules)
#    edit locales/en.default.schema.json and add:
#      "names": { "hero": "Hero" }

# 3. fill in the schema with real settings:
#    edit src/schemas/sections/hero.schema.ts
#    add settings: heading (text), subheading (textarea), image (image_picker),
#    cta_label (text), cta_url (url), alignment (select: left/center/right)

# 4. fill in the liquid markup:
#    edit sections/hero.liquid
#    use Tailwind utilities; consult docs/agent-reference/ for any
#    accessibility-relevant patterns (heading semantics, image alt text)

# 5. compile schemas + check lint/types
npm run schemas
npx vp check --fix

# 6. confirm budget still passes
npm run scripts          # rebuild JS so check-budgets sees current state
npx tsx scripts/check-budgets.ts
```

Then **step 6** wires it into `/`:

```json
// templates/index.json
{
  "sections": { "hero": { "type": "hero", "settings": {} } },
  "order": ["hero"]
}
```

Then **step 7**: `bin/dev.sh` to start the dev server, run Lighthouse mobile
4G against the preview URL, and confirm the route stays inside its 50 KB
cap with the hero rendered (and meets the ADR-0003 floors: perf 90,
a11y/bp/seo 95).

### Likely gotchas in step 5

- **Don't edit the `{% schema %}` tag in `hero.liquid` directly.** The schema
  build script overwrites it from `hero.schema.ts`. Always edit the `.ts`,
  then run `npm run schemas`.
- **Don't import the hero CSS as a separate `<link>`.** Tailwind utilities
  go in the markup; theme tokens (`bg-bg`, `text-fg`, `font-primary`, etc.)
  are already wired up via `src/styles/app.css`.
- **If the hero needs JS** (e.g. an autoplaying carousel), use
  `--with-script` to create the registration script + importmap entry. The
  registration linter will fail CI if you forget.
- **Image rendering**: use `{{ image | image_url: width: ... | image_tag }}`
  with proper `loading=`, `fetchpriority=` attributes. The hero is
  above-the-fold so the LCP image needs `fetchpriority="high"` and
  `loading="eager"`.

---

## Pre-flight for the new session

Before starting step 5, verify:

```bash
git status          # should be clean (or only handoff doc untracked)
git log --oneline | head -10
npx vp check
npx tsx scripts/check-budgets.ts
```

All four should be green / clean. If anything is dirty, the handoff is stale
— ask the user before proceeding.

### Files the new session should read first

1. `AGENTS.md` — top-level project conventions
2. `docs/adr/0003-architectural-pillars.md` — the eight pillars
3. `docs/perf-budget.md` — budget rationale + bump procedure
4. `docs/handoff/iteration-1-progress.md` — this file
5. `scripts/new.ts` — to understand what the scaffolder produces

Optional, only when needed:
- `scripts/check-budgets.ts` if budgets fail or you need to understand the
  graph walker
- `docs/agent-reference/*.mdc` for any accessibility pattern relevant to the
  hero (heading-accessibility, image-alt-text-accessibility,
  landmark-accessibility)

---

## Copy-paste prompt for the new session

```
I'm continuing work on the iteration-1 vertical slice for this Shopify theme.
The previous session landed steps 1-4 of the Pocock-ordered plan
(perf-budget.json, scripts/check-budgets.ts, .github/workflows/perf-budget.yml,
scripts/new.ts) across commits c95e0de..3e7e58c on main, not yet pushed.

The handoff file at docs/handoff/iteration-1-progress.md has the full
context, the next-step instructions, and the gotchas. Read it first.

Then start step 5: scaffold sections/hero.liquid using `npx tsx scripts/new.ts
section hero`, fill in the schema with sensible hero settings (heading,
subheading, image, CTA label + URL, alignment), build the markup with
Tailwind utilities respecting the accessibility rules in
docs/agent-reference/, run npm run schemas + vp check + check-budgets to
confirm clean, then propose the commit (don't auto-commit — present it for
my approval first).

Do not push.
```

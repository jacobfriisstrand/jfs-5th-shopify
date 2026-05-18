# ADR-0008 — Render all `<h1>`–`<h6>` elements via the `heading` snippet

## Status

Accepted.

## Context

Heading levels carry the document outline that assistive technology relies
on. Lighthouse and axe enforce a single rule about that outline —
`heading-order`: a page must not skip levels (e.g. an `<h1>` followed
directly by an `<h3>`). The rule fires whenever the visual hierarchy and
the semantic hierarchy disagree.

In a Shopify theme the offending pattern shows up easily:

- A section renders `<h2>` for its own header.
- A reusable component (product card, blog card, accordion row) hard-codes
  `<h3>` for the item title.
- A different section drops the same component directly under the page
  `<h1>` with no intermediate `<h2>` — and the page now jumps `h1 → h3`.

The PLP regression that motivated this ADR was exactly this: the
collection page rendered `<h1>{{ collection.title }}</h1>` and the product
card hard-coded `<h3>{{ product.title }}</h3>`, skipping `<h2>`.

Hard-coding the level inside the component is the root cause. The correct
level is **a property of where the component is being rendered**, not of
the component itself. A product card title is `<h2>` on the PLP (under
the page `<h1>`) and `<h3>` inside a "Featured collection" carousel
(under the section `<h2>`). The component cannot know which it is — only
the caller can.

Two ways to give callers that control:

1. **Hard-code per component, then duplicate the component** whenever the
   level needs to differ. Fast in the small, unbounded combinatorial
   explosion in the large.
2. **Parameterise the level**, and render every heading through a single
   snippet that does the dispatch. The contract is uniform, theme-check
   sees well-formed HTML at every callsite, and a future migration (e.g.
   adding a `<hgroup>` wrapper or a CSS-only visual-style mapping) is a
   one-file change.

## Decision

**All `<h1>`–`<h6>` elements in the codebase MUST be rendered via the
`heading` snippet.** Direct `<h1>`–`<h6>` literals in `.liquid` files are
forbidden, with one narrow exception (see "Out of scope" below).

Usage:

```liquid
{% render 'heading',
  text: collection.title,
  level: 1,
  id: heading_id,
  class: 'text-2xl font-medium sm:text-3xl'
%}
```

Rules:

1. **The `level` prop is mandatory in every callsite where the level is
   not the snippet default.** The snippet defaults to `level: 2` because
   `<h2>` is the most common "section header" level under a page `<h1>`;
   callers that want `<h2>` may omit the prop, every other level must be
   explicit. **Never pass `level: 2` redundantly** — if the snippet
   default already gives you what you want, omit it (see `AGENTS.md`,
   "Minimal scaffolding & least privilege for editor controls", same
   spirit).
2. **The level is decided by the caller's surrounding hierarchy, not by
   the component.** Reusable components (product card, blog card,
   accordion row, etc.) that render a heading MUST accept a
   `heading_level` parameter and forward it to the snippet. They MUST NOT
   hard-code a heading level.
3. **Container components derive child levels as `parent + 1`.** A
   carousel that takes `heading_level: 2` for its own header passes
   `heading_level: 3` to the cards it renders. This keeps the hierarchy
   monotonic by construction; no caller has to reason about deeply
   nested cases.
4. **The snippet uses `{% case %}`/`{% when %}` with literal tag names
   per branch** — `<h1>`, `<h2>`, …, `<h6>` are spelled out, never built
   via string concatenation. This is the only form theme-check can
   validate; `<h{{ level }}>` is rejected as an invalid HTML element
   name.
5. **All attributes are emitted inline with `{% if %}` guards inside the
   tag.** Building an `attrs` string and then injecting it as
   `<h1{{ attrs }}>` produces `<h1{{attrs}}>` in theme-check's HTML
   parser and fails the well-formed-HTML check; emit `id` and `class`
   directly inside each branch instead.
6. **The snippet escapes `text`.** Callers pass plain strings, not HTML
   fragments. If a heading genuinely needs inline markup (rare — usually
   a sign the heading text is doing too much), refactor the design
   rather than weakening the contract.

### Migration

New code must follow this ADR immediately. Existing direct
`<h1>`–`<h6>` literals are migrated opportunistically — when a file is
touched for unrelated work, convert its headings in the same commit
(small, mechanical, low-risk). A wholesale sweep is unnecessary; the
"touch it, migrate it" rule converges fast enough.

### Out of scope

The following are NOT covered by this ADR and may keep direct heading
literals:

- **`snippets/heading.liquid` itself.** The dispatch table is the whole
  point.
- **Section/block schema labels and `inspector` headings**, which are
  Shopify editor UI, not page output.
- **Email templates** (none in this repo today; revisit if added).

## Consequences

### Positive

- The page outline is correct by construction. Any visual hierarchy
  change (e.g. moving a component from the PLP to a homepage carousel)
  automatically gets the right semantic level via the caller's prop,
  without per-component edits.
- Lighthouse and axe `heading-order` regressions become impossible from
  callers that follow the ADR. The remaining risk surface is just the
  prop the caller passes — small, local, easy to review.
- A future change to how headings render (e.g. wrapping every heading in
  `<hgroup>` for kicker/subtitle support, or attaching a
  `data-heading-level` attribute for CSS visual styling decoupled from
  semantics) is a one-file change in `snippets/heading.liquid`. No
  callsite changes.
- Theme-check can validate every heading the codebase emits, because
  every branch is a literal tag name.

### Negative

- One extra `{% render %}` per heading vs. an inline `<h2>…</h2>`. The
  cost is negligible (Liquid render is fast; the snippet is tiny), and
  the markup at the callsite is arguably _more_ readable because the
  level is named explicitly.
- Reusable components that previously hard-coded a heading level grow a
  `heading_level` prop and must document it in `{% doc %}`. This is a
  one-time cost per component.
- Callers must think about the level rather than copy-pasting. This is
  the whole point.

## Related

- `snippets/heading.liquid` — the dispatch snippet.
- `snippets/product-card.liquid`, `snippets/carousel.liquid`,
  `sections/main-collection.liquid` — first migrated callsites; use as
  reference for the parent → child level-derivation pattern.
- Lighthouse `heading-order` rule:
  <https://dequeuniversity.com/rules/axe/4.10/heading-order>
- `AGENTS.md`, "Accessibility canon" — this ADR is the heading-specific
  rule that complements the broader `*-accessibility.mdc` discipline.

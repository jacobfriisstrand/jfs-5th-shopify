# ADR-0004 — 12-column grid layout system: per-section opt-in, named-grid-lines, custom span/start utilities

## Status

Accepted.

## Context

The starter previously had no shared layout primitive. Sections used ad-hoc
`max-w-*` Tailwind classes with inconsistent gutters and column logic, and
there was no agreed mechanism for an element to break out of the content
column to span the full viewport width.

We need a single layout primitive that:

- Standardises content max-width and column gaps across every section.
- Gives block authors a predictable column system so a "third" or a "half"
  always means the same thing inside a `grid-12` container.
- Provides a clean escape hatch for elements that must span edge-to-edge.
- Stays out of the way of sections that don't need it (per-section opt-in,
  no automatic wrapper in `layout/theme.liquid`).
- Avoids introducing a new abstraction layer or snippet wrapper. A class is
  enough.
- Avoids the `100vw + negative-margin` full-bleed hack (causes
  horizontal-scroll regressions when a vertical scrollbar is present and
  collides with `width-*` utilities at the cascade-ordering layer).

## Decision

Use the named-grid-lines pattern from
[Josh Comeau's article](https://www.joshwcomeau.com/css/full-bleed/),
single-level, with custom `span-N` / `cs-N` utilities so authors can place
elements anywhere on the inner 12-col band with flat markup.

### Locked decisions

| Decision                                            | Value                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**                                    | Per-section opt-in. Sections add `class="grid-12"` to their root container. No automatic wrapper in `layout/theme.liquid`.                                                                                                                                                                                                                                                                                                      |
| **Implementation**                                  | Tailwind v4 `@utility grid-12 { … }` defined in [`src/styles/layout.css`](../../src/styles/layout.css). No snippet wrapper — just a class.                                                                                                                                                                                                                                                                                      |
| **Track structure (responsive)**                    | The track count collapses with viewport: 4 inner cols on mobile, 8 on `md`, 12 on `lg`. All breakpoints carry outer gutter rails so content never touches the viewport edge. On mobile/tablet the rails are a fixed `--layout-gutter`. On `lg` they become `minmax(--layout-gutter, 1fr)` — they absorb space above `--layout-content-width` to centre content, but never collapse below the gutter.                            |
| **Outer page gutter**                               | `clamp(16px, 4vw, 32px)` (`--layout-gutter`). Applies on every breakpoint; `full-bleed` escapes it via `[full-start] / [full-end]`.                                                                                                                                                                                                                                                                                             |
| **Full-bleed mechanism**                            | `@utility full-bleed { grid-column: full }`. Spans gutter-to-gutter (= grid-container width = viewport width).                                                                                                                                                                                                                                                                                                                  |
| **Content-band span**                               | `@utility col-content { grid-column: content }`. Equivalent to `span-12`; provided as a more readable alias for "fill the inner band".                                                                                                                                                                                                                                                                                          |
| **Sub-column spans**                                | Custom `@utility span-1 … span-12` (set both start and span, defaulting start to `content-start`) and `@utility cs-1 … cs-12` (set start to the Nth named `[col-start]` line). Source order: `cs-*` is emitted after `span-*`, so `class="cs-7 span-6"` reliably starts at col 7 and spans 6 cols.                                                                                                                              |
| **Why custom span/start utilities, not Tailwind's** | Tailwind's `col-span-N` and `col-start-N` reference numeric grid lines, which here include the outer rails on `lg` (line 1 = `full-start`). They would be off-by-one. The custom names are scoped to the inner band.                                                                                                                                                                                                            |
| **Span beyond active track count**                  | A `span-N` larger than the active track count creates auto-sized implicit tracks at the end of the row. **These are NOT zero-width**: they take their content's intrinsic size and steal space from the explicit `1fr` tracks, producing visibly broken layouts. Authors **must** match the span to the active track count: `span-4 md:span-8 lg:span-12`. There is no "write `span-12` everywhere and trust the cap" shortcut. |
| **Bracket grouping for stacked line names**         | Multiple line names at the same line position **must** sit inside a single bracket pair: `[full-start content-start]`, not `[full-start] [content-start]`. The two-bracket form is silently dropped by browsers (the entire `grid-template-columns` declaration becomes invalid), leaving the section with no explicit grid → all placement falls back to auto-placement and full-bleed/span utilities silently no-op.          |
| **`cs-N` validity**                                 | `cs-N` only makes sense up to the active track count. Pair with responsive prefixes (`lg:cs-3`) to avoid landing in implicit territory at smaller breakpoints.                                                                                                                                                                                                                                                                  |
| **Content max-width**                               | `1440px` (`--layout-content-width`)                                                                                                                                                                                                                                                                                                                                                                                             |
| **Column gap**                                      | `clamp(12px, 2vw, 20px)` (`--layout-gap`)                                                                                                                                                                                                                                                                                                                                                                                       |
| **Horizontal-scroll fix**                           | `scrollbar-gutter: stable both-edges` on `<html>` (in [`src/styles/base.css`](../../src/styles/base.css)) — kept as a defensive measure although the named-lines pattern no longer triggers `100vw`-style scrollbar issues.                                                                                                                                                                                                     |

### Tokens

Defined in `@theme` in [`src/styles/layout.css`](../../src/styles/layout.css):

```css
@theme {
  --layout-content-width: 1440px;
  --layout-gap: clamp(12px, 2vw, 20px);
  --layout-gutter: clamp(16px, 4vw, 32px);
}
```

These are intentionally not merchant-editable. Layout system constants
belong to code (per [AGENTS.md "least privilege for editor controls"](../../AGENTS.md)).

### Vocabulary

Apply to direct children of `.grid-12`:

| Class           | Effect                                                                           |
| --------------- | -------------------------------------------------------------------------------- |
| `full-bleed`    | Spans `[full-start]` → `[full-end]` (viewport width).                            |
| `col-content`   | Spans `[content-start]` → `[content-end]` (all 12 inner cols).                   |
| `span-N` (1–12) | Starts at `[content-start]`, spans `N` inner cols.                               |
| `cs-N` (1–12)   | Sets start at the Nth named `[col-start]` line. Combine with `span-N` to offset. |

Combining `full-bleed` or `col-content` with `span-*` / `cs-*` is undefined
— pick one placement strategy per element.

Responsive variants chain naturally: `class="span-4 md:span-8 lg:cs-1 lg:span-8"`.
Always match the span to the active track count per breakpoint — see the
"Span beyond active track count" decision above.

### Usage

**Hero with edge-to-edge image and offset heading:**

```liquid
<section class="grid-12 py-12">
  {{ image | image_url: width: 2400 | image_tag:
       class: 'full-bleed w-full', sizes: '100vw' }}
  <h2 class="span-4 md:span-8 lg:cs-1 lg:span-8 text-4xl">Heading</h2>
</section>
```

**Two-column layout — full-stack on mobile, 8/4 split on desktop:**

```liquid
<section class="grid-12">
  <article class="span-4 md:span-8 lg:cs-1 lg:span-8">…</article>
  <aside   class="span-4 md:span-8 lg:cs-9 lg:span-4">…</aside>
</section>
```

**Centered narrow column on desktop, full on mobile:**

```liquid
<section class="grid-12">
  <article class="span-4 md:span-8 lg:cs-3 lg:span-8 prose">…</article>
</section>
```

**Mobile = halves, desktop = thirds:**

```liquid
<section class="grid-12">
  <div class="span-2 md:span-4 lg:span-4">…</div>
  <div class="span-2 md:span-4 lg:span-4">…</div>
  <div class="span-4 md:span-8 lg:span-4">…</div>
</section>
```

### When to use `full-bleed`

Use it when:

- The element is decorative and meant to span the entire viewport (hero
  image, color band, video background).
- The element's design intent is "ignore the page margins entirely."

Do **not** use it when:

- The element is text or a primary CTA. Edge-to-edge text is unreadable
  past ~80ch.
- The element needs to be aligned to other content on the page — that's
  what the grid is for.

## Migration

This ADR ships the primitives only. **No existing section is migrated.**
Each migration is its own ticket and reviewed independently.

The proof-of-concept is the `page-hero` section ([`sections/page-hero.liquid`](../../sections/page-hero.liquid)),
which uses `full-bleed` for the image and `span-4 md:span-8 lg:cs-1 lg:span-8`
for the heading. It is intentionally minimal — restyle and extend per client.

## Consequences

### Positive

- One layout primitive across the theme.
- Authors reason about column placement with one mental model — span N,
  optionally start at col N, anywhere on a 12-col band.
- `full-bleed` is just `grid-column: full`. No `100vw` → no horizontal-scroll
  regressions when the page has a vertical scrollbar.
- `full-bleed` and Tailwind width utilities like `w-full` no longer share
  a property, so they compose cleanly without source-order surprises.
- Per-section opt-in means sections that genuinely need a different layout
  (sticky headers, full-screen takeovers) are not forced into the grid.

### Negative

- New vocabulary (`span-N`, `cs-N`, `full-bleed`, `col-content`) instead of
  Tailwind's built-in `col-span-N` / `col-start-N`. Documented above.
- Below `lg`, content goes edge-to-edge of the viewport — there is no
  automatic side-margin on mobile or tablet. Sections that want outer
  breathing room on small screens must add it themselves (e.g. Tailwind
  `px-*` on the children that need it).
- `cs-N` valid range depends on the active breakpoint (1–4 mobile, 1–8
  `md`, 1–12 `lg`). Use responsive prefixes (`lg:cs-3`) to keep
  placements meaningful at every breakpoint.

### Out of scope

- Migrating any existing section to `grid-12`. Each is its own ticket.
- A schema `select` exposing span as a merchant setting on any specific
  block. Add when justified.
- Editor preview tooling for the grid (e.g. an overlay showing column
  boundaries). Nice-to-have, not now.

## References

- [Josh Comeau — Full-bleed layout using CSS Grid](https://www.joshwcomeau.com/css/full-bleed/)
- [AGENTS.md — Minimal scaffolding & least privilege](../../AGENTS.md)
- [src/styles/app.css](../../src/styles/app.css) — Tailwind v4 entry; pulls in `layout.css`.
- [src/styles/layout.css](../../src/styles/layout.css) — `@theme` tokens and `@utility` definitions.
- [src/styles/base.css](../../src/styles/base.css) — `html { scrollbar-gutter }`.
- [sections/page-hero.liquid](../../sections/page-hero.liquid) — proof-of-concept.
- [Tailwind v4 `@utility` docs](https://tailwindcss.com/docs/adding-custom-styles#adding-custom-utilities)

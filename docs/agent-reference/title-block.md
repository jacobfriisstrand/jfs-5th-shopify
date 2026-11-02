# Title block (eyebrow + title pair)

`snippets/title-block.liquid` renders the shared two-line lead-in — an
eyebrow line above a title line — used by sections such as the home hero
and the event teaser. Every section with this pair renders it through the
snippet and declares its settings through the shared helper; the pair is
never hand-rolled in section markup, and its settings are never copied
into a section schema.

The snippet guarantees **at most one heading per pair**: exactly one of
the two lines renders as a heading element, the other as a `<p>`. This is
the outline-safety companion to [ADR-0008](../adr/0008-heading-snippet-for-all-headings.md)
and `heading-accessibility.mdc`.

## Wiring a section

1. **Settings** — spread the shared helper in the section's schema
   (`src/schemas/sections/*.schema.ts`):

   ```ts
   settings: [
     ...defineTitleBlockSettings({
       levels: ["h2"],                    // which levels this section's outline position allows
       defaultHeadingLine: "eyebrow_h2",  // must be selectable within levels
     }),
     // section-specific settings
   ],
   ```

   This yields `eyebrow_text` (text), `heading` (text), and `heading_line`
   (select) — in that order — for every adopting section.

2. **Markup** — assign the settings in the prologue and render the pair;
   the snippet owns the `heading_line` → tags mapping and the standard
   typography, so a standard-looking section passes no classes at all:

   ```liquid
   assign eyebrow_text = section.settings.eyebrow_text
   {% render 'title-block',
     eyebrow: eyebrow_text,
     title: event_title,
     heading_line: section.settings.heading_line,
     id: heading_id
   %}
   ```

3. **`id`** — pass the section's `aria-labelledby` target id; the snippet
   places it on whichever line renders first (eyebrow when present, else
   title). Guard the reference on the same condition the snippet renders:
   either line being non-blank.

4. **Build & validate** — `npm run schemas`, then `npm run check` and
   `npm run theme:check`.

## Reference

`heading_line` values (the editor may only pick from the section's
filtered set):

| Value        | Eyebrow    | Title      |
| ------------ | ---------- | ---------- |
| `title_h1`   | `<p>`      | `<h1>`     |
| `title_h2`   | `<p>`      | `<h2>`     |
| `eyebrow_h1` | `<h1>`     | `<p>`      |
| `eyebrow_h2` | `<h2>`     | `<p>`      |
| `none`       | `<p>`      | `<p>`      |

- **Levels are per-section.** The helper owns the mechanism; each section
  decides which levels its document-outline position allows (page hero:
  `["h1"]`; mid-page teaser: `["h2"]`). A future nested component would
  declare its own set.
- **Typography is standard, and it is the home hero's.** The snippet
  defaults to the hero's pair — `text-base md:text-lg font-body` eyebrow,
  `text-3xl lg:text-6xl` title (the heading family comes from the
  `[data-heading]` tokens) — so the hero passes no classes at all. Pass
  `eyebrow_class`/`title_class` only where a section genuinely deviates.
  Tune the standard itself in `snippets/title-block.liquid`, not in
  sections.
- **One element.** The pair renders as a single wrapper with the eyebrow
  above the heading, so it is one unit in flex and grid layouts. The
  wrapper owns the standard spacing (`flex flex-col gap-2`); pass
  `class` to size or place the unit (the hero passes `lg:basis-1/3`).
- **The title line may come from context** (e.g. a product title) — use
  the same manual-first precedence as the section's other content: the
  editor's `heading` value wins, the derived value is the fallback.
- Current adoption: `sections/home-hero.liquid`,
  `sections/event-teaser.liquid`.
- Parameter-level details live in the `{% doc %}` header of
  `snippets/title-block.liquid`.

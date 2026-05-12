# Style Tokens

Editors of this theme have **no** control over global design tokens (colors,
fonts, spacing, radii, etc.). All tokens are defined by the developer in code,
following the principle of least privilege.

This document describes where to add each kind of token when you need it.

---

## Spacing

Use **standard Tailwind v4 spacing** (`p-4`, `gap-6`, `mt-2`, …) in markup. No
extra setup is required — the theme already loads `@tailwindcss/vite` and emits
`assets/app.css`.

If you want a non-default spacing scale, override it in `assets/app.css`:

```css
@theme {
  --spacing: 0.25rem; /* base unit, default 0.25rem */
}
```

Do not expose spacing controls to the theme editor.

---

## Colors

Define colors as Tailwind theme variables in `assets/app.css`:

```css
@theme {
  --color-bg: #ffffff;
  --color-fg: #111111;
  --color-accent: oklch(0.7 0.2 200);
}
```

Then use them in markup with Tailwind utilities (`bg-bg`, `text-fg`,
`border-accent`) or directly in custom CSS via `var(--color-accent)`.

If you need to expose a color in Liquid (e.g. for an inline `style="…"`),
hardcode the variable name — never read from `settings.*`:

```liquid
<div style="background: var(--color-accent);">…</div>
```

The `snippets/color-schemes.liquid` snippet is intentionally an empty stub.
If you ever want multiple themable color schemes per section/block, define
them as CSS classes in `app.css` (e.g. `.scheme-light`, `.scheme-dark`) and
let block schemas pick from a fixed `select` of class names — never expose a
free color picker.

---

## Fonts

Self-host fonts (or load from a CDN) via `@font-face` in `assets/app.css`:

```css
@font-face {
  font-family: "Body";
  src: url("/path/to/body.woff2") format("woff2");
  font-display: swap;
}

@theme {
  --font-body: "Body", system-ui, sans-serif;
  --font-heading: "Body", system-ui, sans-serif;
}
```

For Shopify-hosted assets, place the font file under `assets/` and reference
it from a small Liquid snippet (so `asset_url` resolves):

```liquid
{% comment %} snippets/fonts.liquid {% endcomment %}
<style>
  @font-face {
    font-family: "Body";
    src: url("{{ 'body.woff2' | asset_url }}") format("woff2");
    font-display: swap;
  }
</style>
```

The `snippets/fonts.liquid` snippet is currently an empty stub — replace it
with the block above when you add a font.

Do not use `settings.type_*` font_picker controls.

---

## Other tokens (radii, shadows, motion, layers)

Add them under the same `@theme { … }` block in `assets/app.css`:

```css
@theme {
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.06);
  --animation-speed: 200ms;
  --animation-values: cubic-bezier(0.4, 0, 0.2, 1);
  --layer-raised: 10;
}
```

`snippets/theme-styles-variables.liquid` is an empty stub. Only repopulate it
if you have a token that genuinely cannot live in CSS (e.g. needs to read a
shop-level Liquid value). Even then, prefer hardcoding over editor settings.

---

## Per-section / per-block design controls

If a specific section needs a small, bounded design choice (e.g. "left or
right alignment", "compact or comfortable padding"), expose it as a
`select` setting in that section's `*.schema.ts` with a fixed enum. Never
expose freeform `color_picker`, `font_picker`, `range`-with-units, or
`text` inputs that end up in raw CSS.

Pattern:

```ts
// src/schemas/sections/foo.schema.ts
defineSection({
  name: "Foo",
  settings: [
    {
      type: "select",
      id: "density",
      label: "Density",
      options: [
        { value: "compact", label: "Compact" },
        { value: "comfortable", label: "Comfortable" },
      ],
      default: "comfortable",
    },
  ],
});
```

```liquid
{# sections/foo.liquid #}
<div class="foo foo--density-{{ section.settings.density }}">
  …
</div>
```

```css
/* assets/app.css */
.foo--density-compact {
  padding: var(--spacing-2);
}
.foo--density-comfortable {
  padding: var(--spacing-6);
}
```

---

## Summary

| Token kind               | Where to define                                                                 | Editor exposure                                |
| ------------------------ | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| Spacing                  | Tailwind v4 utilities + `@theme` overrides in `app.css`                         | none                                           |
| Colors                   | `@theme` in `app.css`                                                           | none (or fixed `select` of scheme class names) |
| Fonts                    | `@font-face` + `@theme` in `app.css` (+ `snippets/fonts.liquid` for asset URLs) | none                                           |
| Radii / shadows / motion | `@theme` in `app.css`                                                           | none                                           |
| Per-component variant    | `select` with fixed enum in section/block schema                                | bounded select only                            |

The empty stub snippets (`color-schemes.liquid`, `fonts.liquid`,
`theme-styles-variables.liquid`) exist only because `layout/theme.liquid`
renders them. Repopulate when needed; do not wire them to `settings.*`.

# ADR-0010 — Drawers share one animation system via `data-drawer`

## Status

Accepted.

## Context

The theme has multiple slide-in surfaces — cart drawer, header menu drawer,
header search dialog, product size guide — and more will follow (filters,
account menu, quick view, etc.). They are all the same primitive: a native
`<dialog>` wrapped in `<dialog-component>` (`src/scripts/dialog.ts`) that
opens with `showModal()`, locks body scroll, and on close adds a
`.dialog-closing` class, awaits `animationend`, then calls `dialog.close()`.

The original CSS keyed every drawer's animation off its DOM id:

```css
#cart-drawer dialog[open]:not(.dialog-closing) { animation: cart-drawer-in … }
#cart-drawer dialog.dialog-closing            { animation: cart-drawer-out … }
@keyframes cart-drawer-in  { from { translate: 100% 0 } to { translate: 0 0 } }
@keyframes cart-drawer-out { from { translate: 0 0 }   to { translate: 100% 0 } }

#header-menu-drawer dialog[open]:not(.dialog-closing) { animation: header-menu-drawer-in … }
/* …identical keyframes under a different name… */

#header-search-dialog dialog[open]:not(.dialog-closing) { animation: header-search-in … }
/* …a top-anchored variant… */
```

Three problems:

1. **Combinatorial duplication.** Every new drawer needs four selectors
   (open + closing + backdrop in + backdrop out) and up to four keyframe
   blocks, even though the only thing that differs is which side it slides
   from.
2. **Silent failure for new drawers.** A snippet author who adds a
   `<dialog-component>` for a size guide gets correct open/close *behavior*
   for free (the JS is generic) but no animation, because nobody knew to
   add a matching `#size-guide-dialog dialog[open]…` block to `base.css`.
   The drawer just pops in and out.
3. **CSS lives far from the markup that needs it.** Authors editing a
   `.liquid` file have no signal that an id is load-bearing for animation.

## Decision

Animations are keyed off a `data-drawer="<side>"` attribute on the
`<dialog>` element, not the id. One shared CSS block in
`src/styles/base.css` covers every drawer; new drawers opt in by adding
the attribute.

```liquid
<dialog-component id="cart-drawer" class="contents">
  <dialog
    ref="dialog"
    data-drawer="right"
    class="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md bg-bg text-fg p-0"
    aria-labelledby="cart-drawer-title"
  >
    …
  </dialog>
</dialog-component>
```

Valid sides: `right`, `left`, `top`, `bottom`. Each side defines two
keyframes (`drawer-in-<side>` / `drawer-out-<side>`) and the entry/exit
animations are wired up generically:

```css
dialog[data-drawer="right"][open]:not(.dialog-closing) {
  animation: drawer-in-right 240ms cubic-bezier(0.2, 0, 0, 1);
}
dialog[data-drawer="right"].dialog-closing {
  animation: drawer-out-right 200ms cubic-bezier(0.4, 0, 1, 1) forwards;
}
```

The backdrop fade is shared across all four sides:

```css
dialog[data-drawer][open]:not(.dialog-closing)::backdrop {
  animation: drawer-backdrop-in 200ms ease-out;
}
dialog[data-drawer].dialog-closing::backdrop {
  animation: drawer-backdrop-out 200ms ease-in forwards;
}
```

### Division of responsibilities

- **`base.css`** owns motion only — keyframes, timing, easing, the
  `.dialog-closing` guard.
- **Markup (Tailwind utilities)** owns *positioning and sizing*: anchor
  side (`inset-y-0 right-0 left-auto` for a right drawer; `inset-x-0
  top-0` for a top sheet), full-height/full-width sizing, padding,
  surface colors. This keeps the CSS layer free of layout decisions and
  keeps the position visible at the call site.
- **`<dialog-component>` (`src/scripts/dialog.ts`)** owns *behavior* —
  `showModal`, body scroll lock, `.dialog-closing` class toggling,
  awaiting `animationend`, calling `dialog.close()`. Generic and
  drawer-agnostic.

### Adding a new drawer

Use the [`drawer`](../../snippets/drawer.liquid) snippet — it owns the
`<dialog-component>` + `<dialog data-drawer>` shell, picks sensible
defaults for the anchor edge and axis size based on `side`, and pulls
surface colors + backdrop from the global `dialog[data-drawer]` rules
in `base.css`. Callers usually only supply `id` and the body markup.

```liquid
{%- capture body -%}
  <header class="…">
    {%- render 'drawer-close-button', label: 'actions.close' | t -%}
  </header>
  <div class="…">…</div>
{%- endcapture -%}

{%- render 'drawer',
  id: 'my-drawer',
  aria_labelledby: 'my-drawer-title',
  content: body
-%}
```

Tunable props:

- `side` — `right` (default), `left`, `top`, `bottom`. Picks the anchor
  edge and which axis `size` controls (width for side drawers, height
  for top/bottom sheets).
- `size` — a CSS length for that axis. Defaults to
  `min(100vw, 28rem)` for side drawers and `66dvh` (~2/3 of the
  viewport) for top/bottom sheets. Pass `'100vw'` for a full-width side
  drawer, `'100dvh'` to make a sheet take the whole screen, etc.
- `class` — extra utilities on the `<dialog>` (default `p-0`). Use this
  for inside-the-dialog padding when the body does not own it.

Animation, backdrop fade, scroll lock, and close-on-escape all work.
No CSS changes are required to ship a new drawer that slides from a
supported side. New *sides* (e.g. a corner toast that scales in) get
one shared `[data-drawer="<new-side>"]` block plus two keyframes in
`base.css`.

Hand-rolling `<dialog-component>` + `<dialog>` markup is permitted only
when the snippet cannot express what you need (e.g. a drawer that needs
extra attributes on the `<dialog>`). Prefer extending the snippet over
duplicating its shell.

## Consequences

- **Discoverability.** `data-drawer="right"` at the call site tells the
  next reader "this is a drawer, it slides from the right". No need to
  cross-reference `base.css`.
- **No id coupling.** The `id` is back to being a hook for ARIA
  (`aria-controls`) and JS lookups, not a CSS load-bearing identifier.
- **Trivial extension.** A new drawer is one HTML attribute. A new
  anchor side is one shared CSS block.
- **`prefers-reduced-motion` is honored once** for all drawers by the
  existing block at the bottom of `base.css` (`animation: none`).
- **Positioning still lives in markup**, so the call site remains the
  single source of truth for "where does this drawer appear".

## When this pattern does *not* apply

- **Centered modal dialogs** (confirm, alert, true modal forms) — those
  use the browser default centering and a fade, not a slide. Don't add
  `data-drawer` to them.
- **Non-`<dialog>` surfaces** (toasts, popovers, tooltips) — those have
  different focus and dismissal semantics and should not reuse this
  motion contract.

## Related

- ADR-0007 — single `{% liquid %}` block per file (applies to drawer
  snippets too).
- `src/scripts/dialog.ts` — the `<dialog-component>` runtime that this
  CSS contracts with via the `.dialog-closing` class.

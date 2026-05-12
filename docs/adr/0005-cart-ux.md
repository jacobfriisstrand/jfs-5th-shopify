# ADR-0005 — Cart UX: `/cart` is canonical; the drawer is an after-action affordance; line-item rendering is one snippet

## Status

Accepted.

## Context

Shopify themes typically choose between three cart UX patterns:

1. **Page only.** Add-to-cart navigates (or `Location.assign`s) to `/cart`. Simple, server-rendered, but loses the "I just added this, what now?" moment and breaks PDP-flow when a customer wants to keep browsing.
2. **Drawer only.** Add-to-cart opens a slide-over panel; `/cart` redirects or is hidden. Smooth flow, but unfriendly to users who deep-link cart (e.g. mobile share, email follow-up), and a drawer's smaller surface area starts hurting once the cart has more than ~5 line items, complex shipping calculators, or gift-message inputs.
3. **Both, sharing nothing.** Two implementations of cart line-item rendering — one in `sections/main-cart.liquid` for the page, one in `snippets/cart-drawer-line-item.liquid` for the drawer. Drift accumulates: a price-change formatting tweak lands in one, not the other.

This starter inherits Horizon's cart drawer Custom element (`src/scripts/cart-drawer.ts`) and the section/block scaffolding in `sections/main-cart.liquid`. Both surfaces exist; what was missing was a declared relationship between them.

The grilling pass (Q10) considered dropping the drawer entirely to simplify. Reasons against: the drawer carries the most-used add-to-cart confirmation moment on PDP, and the migration cost (rewiring every PDP add-to-cart to navigate) plus the UX regression were not worth the simplification.

## Decision

### `/cart` is the canonical cart surface

`/cart` (rendered by `sections/main-cart.liquid` via `templates/cart.json`) is treated as the source of truth for cart UX:

- All cart functionality (line-item edit, remove, quantity change, shipping calculator, notes, gift message, discount code, accelerated checkout buttons) is implemented on `/cart` first.
- `/cart` works with **JS disabled**. Form posts to `/cart/update.js` and `/cart/change.js` redirect back to `/cart` on success.
- `/cart` is the destination of every cart-related deep link, email link, and share link.
- The header cart icon links to `/cart` (`<a href="/cart">`), not to a JS-only drawer trigger. The drawer is opened in addition by JS that hijacks the click, but the bare anchor remains the contract.

### The drawer is an after-action affordance for add-to-cart

The cart drawer (`src/scripts/cart-drawer.ts` + `snippets/cart-drawer.liquid`) is opened in **two cases only**:

1. **After a successful add-to-cart from a PDP** — the variant picker's submit handler opens the drawer with the new line item highlighted.
2. **When the user clicks the header cart icon** — the JS click handler opens the drawer instead of navigating; the link still navigates to `/cart` if JS is disabled or fails to bind.

The drawer is intentionally a **subset** of `/cart`:

- Shows line items, subtotal, "View cart" link to `/cart`, and "Checkout" button.
- Does **not** show shipping calculator, gift message, notes, or discount input. Users wanting those flow to `/cart` via the explicit "View cart" link.
- Does **not** support accelerated checkout buttons (Shop Pay / Apple Pay etc.). Those live on `/cart` only.

This subset is deliberate: the drawer is a confirmation + continuation moment, not a full cart UI. Cramming the full cart into a slide-over breaks at ~5 line items on mobile.

### Line-item rendering is a single shared snippet

Both surfaces render line items via one snippet: `snippets/_cart-line-items.liquid`.

```liquid
{% doc %}
  Renders the cart line-item list (image, title, variant title, quantity selector, line price, remove button).
  Used by both /cart (sections/main-cart.liquid) and the cart drawer (snippets/cart-drawer.liquid).

  @param {cart} cart - The current cart.
  @param {string} [variant] - Either 'page' or 'drawer'. Controls which optional UI affordances render.

  @example
  {% render '_cart-line-items', cart: cart, variant: 'drawer' %}
{% enddoc %}
```

The `variant` parameter gates the differences (drawer hides line-item-level notes; page shows them). Everything else — line-item HTML structure, CSS classes, quantity-selector wiring, price formatting — is identical.

When the cart updates via Section Rendering (after a quantity change or remove), both surfaces refresh by re-fetching their parent section. The morph diff (ADR-0002) takes care of the patch. No bespoke "sync drawer with page" code exists; both read from `cart` after the section re-render.

### No "drawer-only" or "page-only" features

A new cart feature lands on `/cart` first. Once it's stable, the team decides whether the drawer subset should grow to include it. The default answer is **no** — the drawer's scope is a deliberate constraint, not a backlog item.

## Consequences

### Positive

- **One file owns line-item HTML.** Drift between the two surfaces is structurally impossible for line-item rendering. A price-formatting fix lands in `_cart-line-items.liquid` and ships to both.
- **JS-disabled users still have a working cart.** The `<a href="/cart">` header link, the form posts, and the redirect-back-to-`/cart` pattern mean the cart works without ever loading the drawer module.
- **The drawer can be defer-loaded.** The drawer module is not on the homepage's initial-paint critical path; it's bound when the user first hovers or focuses the header cart icon (ADR-0003 pillar 7). Counts as 0 KB against the homepage budget.
- **Deep-linking and sharing work** because `/cart` is canonical and JS-independent.
- **Accelerated checkout is centralized** on the surface where it matters most (the explicit cart-review moment), not duplicated into the drawer where it would crowd the subset UX.

### Negative

- **The drawer's "less is more" subset rule will be re-litigated** every time someone wants to add (e.g.) discount input to the drawer for conversion reasons. Mitigated by this ADR explicitly framing the subset as deliberate. Re-opening it requires updating this ADR.
- **The `variant: 'page' | 'drawer'` parameter on `_cart-line-items.liquid` is a small leak** of UI context into the snippet. Acceptable: the alternative is two snippets and inevitable drift.
- **Two morph paths after cart change** — `/cart` re-renders the cart section; pages with the drawer open re-render the drawer's section. Both work today; if a third surface ever displays cart line items (e.g. a mini-cart in the header), reconsider centralising the post-mutation refresh in `cart-drawer.ts`.
- **Accelerated checkout buttons not in the drawer** is a measurable conversion choice, not a free decision. If A/B tests later show enabling them in the drawer improves checkout rate, the rule moves; this ADR will be updated alongside the implementation PR.

## Future reviews

- Revisit if the drawer's subset diverges from "after-action confirmation" — e.g. if mobile traffic starts using the drawer as their primary cart-review surface, the subset should grow and the line between drawer and `/cart` becomes a separate surface trade-off rather than a hard rule.
- Revisit if a third cart surface emerges (header mini-cart, modal cart, embedded cart in a sticky footer). At that point the post-mutation refresh logic should likely move out of `cart-drawer.ts` into a small `@theme/cart-mutation` module that all surfaces subscribe to.
- Revisit if `_cart-line-items.liquid` accumulates more than 2 `variant` branches; that's the signal that the snippet is over-shared and a second snippet is justified.
- Revisit if Shopify ships native section rendering for partial cart updates (line-item-only re-render) that supersedes the current "re-render the parent section + morph" pattern. The shared snippet survives that change unchanged; only the call sites move.

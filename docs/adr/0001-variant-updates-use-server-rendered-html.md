# ADR 0001 — Variant updates use server-rendered HTML

## Status

Accepted

## Context

When a customer picks a variant in a `<variant-picker>` on a product page, several
displays must update: price, SKU, add-to-cart button state, quantity selector
limits, etc. The current implementation:

1. `variant-picker.ts` fetches `?section_id=…` from the storefront — Shopify's
   own server re-renders the section's Liquid against the new variant.
2. The response is parsed inertly via `DOMParser`.
3. A single `VariantUpdateEvent` is dispatched, carrying both the parsed variant
   JSON (`detail.resource`) **and** the new HTML document (`detail.data.html`).
4. Each interested Custom element (`<product-price>`, `<product-form>`, …)
   listens on its closest section, queries the new HTML for its own block, and
   morphs/replaces its DOM.

When reviewing this layout, two unifying alternatives were considered and
rejected:

- **Transactional variant-update Module** that owns "all displays update
  atomically; rollback on partial failure."
- **Registration Interface** (`registerVariantConsumer({ blockType, onUpdate })`)
  so new consumers don't reinvent `closest()` + `addEventListener` boilerplate.

## Decision

Variant updates fan out via per-Custom-element event listeners that read from
the server-rendered HTML snapshot. We deliberately do **not**:

- introduce a transactional/coordinating Module on top of the event,
- introduce a registration helper for variant consumers,
- add a JSON-only fast path for individual displays (e.g. the deleted
  `product-sku-component` that read `detail.resource.sku` directly).

The server is the single source of truth for what a variant looks like in the
DOM. Each display is an Adapter that knows how to extract its own block from
that snapshot.

## Consequences

**Positive**

- Adding a new variant-bound display means writing a Custom element that
  listens to `ThemeEvents.variantUpdate` and reads its block from
  `event.detail.data.html`. No central registration point to update.
- Server-side Liquid edits to a block's markup propagate to live updates
  automatically — no JS change needed.
- No transactional state machine to maintain; failures are localised to the
  consumer that errored.

**Negative**

- A buggy listener cannot be rolled back; the rest of the page may show the
  new variant while one block lags.
- Each consumer duplicates a small amount of `closest(section).addEventListener`
  + `disconnectedCallback` cleanup boilerplate.
- The `event.detail.data.html` shape is an implicit contract between the
  variant picker and every consumer.

## Future reviews

If a future architecture review re-surfaces "unify variant updates into one
module," check whether the **trigger for the suggestion** is one of:

- A real consumer that needs **atomic rollback** (currently none) — then this
  ADR should be revisited.
- More than ~5 listeners with **substantially different lookup logic** — then a
  helper for the boilerplate may be warranted (still not a transactional
  module).
- Otherwise: the suggestion is the same one this ADR rejected. Keep the layout.

# ADR-0004 — Product model: color is a product, size is a variant; color products group via a `color_group` metaobject

# ADR-0004 — Product model: color is a product, size is a variant; color products group via a `color_group` metaobject

## Status

Superseded by [ADR-0009](0009-product-model-standard-variants.md).

Original status: Accepted. Superseded because the colour-as-product model traded too much native Shopify tooling (per-variant inventory in one product, the variant picker, the Admin variant image field, native cross-colour reporting) for the colour-as-route ergonomic, and that ergonomic turned out to be replaceable by the ADR-0001 morph contract. Kept in the repo as historical context — do not implement.

## Context

Shopify's data model offers two grouping primitives:

- **Variants** — options on a single product (size, color, material). Cheap to query, share inventory tracking and SEO under one product URL, but a single product cannot exceed 100 variants and selecting a variant cannot trigger a route change.
- **Metaobjects / metafields** — arbitrary structured data attached to (or linked between) products. Free-form, but the merchant has to maintain the linkage explicitly.

This catalogue's structure: each merchandiseable item (e.g. "Hoodie Classic") is sold in several colours (Blue, Red, Black). Within each colour, several sizes are available (S, M, L, XL).

Three forces shaped the decision:

**Force 1 — Colour selection should feel like a route change.** A different colour has different photography, possibly a different price, and ideally a different URL. Implementing colour as a Shopify variant means the variant picker swaps DOM in place; implementing it as a separate product means the colour swatch is a `<a href>` and the page navigates.

**Force 2 — A merchant team without engineers must edit this.** Any model that requires a metafield to be manually kept in sync on every related product (e.g. a bidirectional `color_siblings` metafield listing the other colours) is a footgun. The first time a merchant adds a fourth colour and forgets to update the other three, the grouping fractures invisibly.

**Force 3 — The collection grid must show one tile per group, not one per colour.** Otherwise "Hoodie Classic" appears five times on the collection page.

A bidirectional `color_siblings` metafield (each product holds a list of its sibling product references) was the initial direction. It was rejected at the grilling stage on Force 2: it has N points of edit per group of size N, and consistency is the merchant's problem.

## Decision

### Colour is a product. Size is a variant on that product.

Each colour of a merchandiseable item is its own Shopify product (e.g. "Hoodie Classic — Blue", "Hoodie Classic — Red"). Sizes within that colour remain Shopify variants on the colour product. The colour swatch on a PDP and a collection card is `<a href="/products/hoodie-classic-red">…</a>` — colour selection is a real navigation.

### Grouping is a single `color_group` metaobject

A Shopify metaobject definition `color_group` with three fields:

| Field             | Type                       | Purpose                                               |
| ----------------- | -------------------------- | ----------------------------------------------------- |
| `name`            | Single line text           | Human label ("Hoodie Classic")                        |
| `entries`         | List of product references | All colour products in the group                      |
| `primary_product` | Single product reference   | Which colour represents the group on collection grids |

Each colour product carries a single product metafield `color_group` of type "metaobject reference (color_group)". The metafield is the only edit each colour product needs.

The metaobject is the **single point of edit per group**. Adding a fourth colour:

1. Create the new colour product.
2. Open the `color_group` metaobject for that group.
3. Add the new product to `entries`.
4. On the new colour product, set its `color_group` metafield to the metaobject.

That is the entire merchant-facing surface. See [docs/setup/color-groups.md](../setup/color-groups.md) for the screenshot walkthrough.

### Collection grid renders the primary product per group via `_resolve-primary.liquid`

The collection grid iterates products. For each product, it renders only if the product is its group's `primary_product` — otherwise it is skipped (the group's tile has already been rendered or will be). Implementation lives in `snippets/_resolve-primary.liquid`:

```liquid
{% doc %}
  Resolves whether the given product should be rendered as a group tile.

  @param {product} product - The product being iterated.

  @example
  {% render '_resolve-primary', product: product %}
{% enddoc %}

{%- liquid
  assign group = product.metafields.color_group.value
  if group == blank
    # Ungrouped product — always render as its own tile
    assign render = true
  else
    assign primary = group.primary_product.value
    if primary == blank
      # Misconfigured: fall back to first entry alphabetically
      assign first = group.entries.value | sort: 'handle' | first
      assign render = product == first
    else
      assign render = product == primary
    endif
  endif
-%}{{ render }}
```

The collection grid uses it as `{% capture should_render %}{% render '_resolve-primary', product: product %}{% endcapture %}{% if should_render contains 'true' %}…{% endif %}`. (A small papercut from Liquid not having `return`; acceptable.)

### Sibling colours on the PDP

The PDP renders the colour-swatch row by reading `product.metafields.color_group.value.entries` directly. No separate query, no JS state, no `color_siblings` metafield round-trip. Each entry becomes a swatch link to that product's URL.

### Read-only validator: `scripts/validate-color-groups.ts`

A validator script (run locally, not in CI by default) reads all `color_group` metaobjects via the Shopify Admin API and checks:

1. Every product in `entries` has its `color_group` metafield set to this metaobject (no orphaned references in either direction).
2. Every group has a `primary_product` set, and that product is in `entries`.
3. No product references a `color_group` metaobject where it is not in `entries`.

Output is a human-readable report; exit 1 on any mismatch. **Read-only** — does not mutate Shopify data. Merchants run it before bulk-onboarding new colours; engineers run it as part of incident triage if the grid renders strangely.

The validator is not run automatically because it requires Admin API credentials and the canonical fix is for the merchant to open the metaobject in Admin.

## Consequences

### Positive

- **One edit per group when colours change.** The metaobject is the only place. No N-way fan-out of metafield writes.
- **Colour swatches are real links.** Browser back/forward, deep links to a specific colour, per-colour SEO and OG tags — all work with zero JS.
- **No 100-variant ceiling on colour count.** A group can have 30 colours; it would never fit as variants on one product.
- **Per-colour inventory and merchandising is native.** A colour can go out of stock, be on sale, or have unique tags without affecting siblings.
- **The PDP sibling query is one metafield read.** No GraphQL, no metafield-of-metafield walks.

### Negative

- **Merchants have one extra concept to learn.** "Color group" is a new term in their Shopify Admin vocabulary. Mitigated by [docs/setup/color-groups.md](../setup/color-groups.md) and by the validator script flagging misconfigurations.
- **Misconfiguration shows up as silent visual oddities.** A product whose `color_group` metafield is unset renders as its own tile; a group with no `primary_product` falls back to alphabetical. The validator script makes both detectable on demand.
- **Cross-colour reporting is not a single product report.** A merchant asking "how many Hoodie Classic units sold this month, across all colours?" needs to sum the colour products. Acceptable trade-off; the same query in a variant model would be cheap, but the variant model loses everything in pillar 1.
- **Renaming a group requires editing only the metaobject `name`** — but the colour products' titles ("Hoodie Classic — Blue") still need a separate bulk-edit. This is a Shopify limitation, not a model limitation.
- **`_resolve-primary.liquid` adds one Liquid render call per product on collection pages.** Negligible; collection pages already iterate `paginate.size` ≤ 24 products.

## Future reviews

- If colour count per group regularly exceeds **~10** and the swatch row no longer fits in the PDP, redesign the swatch row UI rather than the data model.
- If the merchant team grows past ~3 people maintaining colour groups simultaneously and edit conflicts emerge in Shopify Admin, consider building a small Shopify App for bulk colour-group management. Not before.
- If `_resolve-primary.liquid` accumulates more than the current sort-and-pick logic (e.g. tag-based primary, time-based primary, metafield-overridable primary per collection), promote it from a Liquid snippet to a TypeScript-tested helper that emits the same Liquid contract — and add the Vitest infrastructure described in ADR-0003 pillar 5 alongside.
- If `scripts/validate-color-groups.ts` ever needs to mutate Shopify data (auto-fix mode), open a separate ADR; the read-only constraint is part of the safety story.
- The decision to model colour as a product (not a variant) is structural. Reversing it would require migrating every colour product back into variants, which Shopify does not support natively. Treat this ADR's first decision as effectively permanent for any product line that has shipped.

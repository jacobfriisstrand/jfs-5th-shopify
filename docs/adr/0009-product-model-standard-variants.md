# ADR-0009 — Product model: one product per item, color and size are standard Shopify variants

## Status

Accepted. Supersedes [ADR-0004](0004-product-model.md).

## Context

[ADR-0004](0004-product-model.md) modelled each colour as its own Shopify product, grouped via a `color_group` metaobject. The decisive force was "colour selection should feel like a route change". Since then:

1. **[ADR-0001](0001-variant-updates-use-server-rendered-html.md) is in place.** Variant changes already swap server-rendered HTML via the morph contract, so a colour swatch can update PDP price, gallery, and inventory in-place without a route change feeling like one — and without paying the cost of a real navigation.
2. **The colour-as-product model loses native Shopify tooling.** No native variant picker, no single product-level inventory report, no Admin "variant image" association, no cross-colour analytics, and a `color_group` metaobject that the merchant must keep in sync across N entries plus a primary product.
3. **Merchant cognitive load is the dominant cost.** This catalogue is maintained by a small team without engineers (Force 2 of ADR-0004). One product with two option axes is the model every other Shopify theme uses; "color group" is a bespoke concept that needs documentation, a validator script, and ongoing care.

Reversing the structural decision in ADR-0004 is rare but warranted here: nothing has yet shipped to production on the colour-as-product model, so the reversal cost is zero.

## Decision

### One Shopify product per merchandise item

Each merchandiseable item (e.g. "Hoodie Classic") is a single Shopify product. Color and size are standard Shopify **variant options** on that product. There is no `color_group` metaobject, no `color_group` product metafield, and no `_resolve-primary` collection-grid filter.

### Variant option order is fixed: `Color` is option 1, `Size` is option 2

Merchants MUST create products with `Color` as the first option and `Size` as the second. This is a convention, not a Shopify constraint, and keeps the templating simple: `variant.option1` is always the active color value. PDP code reads `variant.option1` directly without searching `product.options_with_values` by name.

If a future product type needs a different option order, that product's PDP block will need to look up the color option by name. We accept that complexity only when it actually arrives.

### Color selection is a variant swap, not a route change

The PDP color swatch row (deferred to issue #18 — variant picker) updates `?variant=<id>` and re-renders the relevant blocks via the ADR-0001 morph contract. The URL changes, browser back/forward still work, OG/SEO meta updates because Shopify re-renders the page server-side on direct hits to `?variant=<id>` — but a same-page swap stays a same-page swap.

The collection grid renders one tile per product (no per-color deduplication). The product card uses `product.featured_image`, which Shopify sets from the first variant's media unless the merchant overrides it.

### Per-variant primary image: native Shopify "Variant image"

Each variant's primary image is set in Shopify Admin via the variant's **Image** field. The PDP gallery uses `variant.featured_image` as the first image. This is native Shopify; no metafield needed for the single-image-per-color case.

### Multi-image-per-variant: `Variant gallery` metaobject (no product metafield)

When a variant has more than one image, merchants author the gallery as a **metaobject** — never as raw JSON or media IDs. The merchant only interacts with Shopify's native file picker and the native variant picker.

**One-time setup (developer, in Admin → Settings → Custom data):**

1. Define a metaobject **Variant gallery** (`variant_gallery`) with fields:
   - `color` — **product variant reference** (not text). Points at any one variant of the color the gallery belongs to (typically the smallest size). The matcher keys off the variant's `option1` value, so one entry per color covers every size variant of that color.
   - `images` — file reference, **list of references**, restricted to images.
2. On the metaobject definition, enable **Storefronts → Read** access for both the type and each field. Without storefront access, Liquid sees nothing.
3. **No product metafield is involved.** Entries link to variants directly via the `color` field; the storefront enumerates them globally.

**Per-variant merchant workflow (no JSON, no IDs):**

1. Admin → Content → Metaobjects → **Variant gallery** → **Add entry**
   - In the `color` picker, pick the product → then any one variant of the target color (e.g. the smallest size).
   - Click the `images` picker → multi-select images from the file library.
   - Save.
2. Repeat once per color that needs multiple images. **One metaobject entry per (product, color)** — not per variant. Adding new size variants under that color requires no metaobject change.

**Storefront contract:**

The PDP gallery ([`blocks/_product-media-gallery.liquid`](../../blocks/_product-media-gallery.liquid)) renders, for the active variant:

1. The variant's primary image — `variant.featured_image`, set via the native Admin variant Image field.
2. Any extras from the matched **Variant gallery** entry — found by enumerating `shop.metaobjects.variant_gallery.values` and matching the entry whose referenced variant belongs to the same product and shares the active variant's `option1` (Color) value. The `images` list is read via `entry.images.value` (the `.value` accessor unwraps `MediaListDrop`; iterating `entry.images` directly yields nothing).

Fallback rules:

- If the variant has no `featured_image`, fall back to `product.featured_image` for the primary slide.
- If no metaobject entry matches (no entry for the variant, or the matched entry has an empty `images` list), the gallery shows only the primary image — **no `product.media` spillover**. Falling back to the unfiltered product media would defeat the per-variant filtering contract and surface images that belong to the wrong variant.
- If neither variant nor product has an image, render a placeholder SVG.

Rationale for picking metaobject + global enumeration over a product metafield or per-media "Associate with variants" UI:

- **Merchant UX**: every value is picked from a visual UI (variant picker, file picker). No JSON typing, no copy-pasting media IDs, no GraphQL.
- **Directness**: linking the metaobject to the variant (not via a product metafield) removes one indirection — there is no per-product list to keep in sync; adding a gallery is "create a metaobject, pick a variant, pick images".
- **Native Admin surface**: the per-media "Associate with variants" UI has been removed from the current Shopify Admin; metaobjects are the canonical 2024 pattern for structured data with a visual editor.

Known trade-off: `shop.metaobjects.variant_gallery.values` iterates every `Variant gallery` entry in the shop on every PDP render. At the current catalogue scale this is negligible. If the entry count grows large enough to matter (rough rule of thumb: hundreds), revisit by either (a) adding a product metafield that narrows the search to that product's entries, or (b) splitting the type so each product references its own metaobject type. Until then, simplicity wins.

### What gets deleted from ADR-0004

- `snippets/_resolve-primary.liquid` — gone.
- `docs/setup/color-groups.md` — gone.
- `scripts/validate-color-groups.ts` — never written; issue #9 is closed.
- The `color_group` metaobject definition and per-product `color_group` metafield — deleted from the dev store. No data has shipped to production.
- The `Color group` / `Color product` / `Primary product` glossary entries in `CONTEXT.md` — replaced with `Product` / `Variant` / `Variant option` / `Variant gallery`.

## Consequences

### Positive

- **Native Shopify variant tooling works as designed.** Variant picker, variant inventory, variant image field, Shopify reports for "Hoodie Classic" as one product — all free.
- **One product = one merchant artefact for inventory and pricing.** Adding a new variant is "open the product, add a `Color` value, populate a `Size` set, optionally create a `Variant gallery` metaobject pointing at the new variant". Per-variant galleries live as metaobjects, edited via Shopify's native file picker.
- **No bespoke validator script.** The dataset is the standard Shopify shape, validated by Shopify itself.
- **Less templating code.** `_resolve-primary.liquid`, the `capture should_render` pattern in collection sections, and the metaobject-walk in the PDP swatch row all disappear.
- **The morph contract already does the colour-swap work.** ADR-0001 was always the lever; we just hadn't applied it to colour.

### Negative

- **The colour URL is `/products/<handle>?variant=<id>`, not `/products/<handle>-blue`.** Per-colour deep links still work (Shopify resolves `?variant=<id>` server-side and renders the right variant), but the URL is uglier and per-colour SEO is weaker than ADR-0004's per-product URLs. Accepted: organic SEO for individual colours is not a priority for this catalogue.
- **100-variant ceiling.** A product with 10 colours × 10 sizes = 100 variants, which is Shopify's hard limit on the standard plan (2,048 on Shopify Plus). Acceptable for the current catalogue; if a future product needs 11 × 10, split it into two products by some other axis or escalate.
- **`Color` must be option 1 by convention.** Merchants need to know this when creating new products. Mitigation: document it in the product-creation runbook and rely on the validator being a future-PR concern only if drift becomes a real problem.
- **Cross-colour merchandising is now per-variant.** Putting "the blue hoodie" on sale is now a per-variant price edit (Shopify supports this), not a per-product edit. Slightly more clicks; standard Shopify workflow.

## Future reviews

- If we ever ship a product line where per-colour SEO measurably matters, revisit the URL-shape decision. The model itself does not need to change — a colour-handle redirect snippet could be added.
- If `Variant gallery` needs to grow beyond `(color, images)` (e.g. per-variant video, per-variant 3D model, alt-text overrides), add fields to the metaobject definition. The storefront contract — "find the entry whose `color` references the active variant" — stays unchanged.
- If a product genuinely needs `>100` variants, split by some non-color/size axis (material, collaboration drop, season) into separate products rather than re-modelling colour. This is the same trade-off every Shopify catalogue makes.

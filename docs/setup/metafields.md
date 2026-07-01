# Metafields & metaobjects setup

Canonical reference for every metafield and metaobject this theme reads. When porting the theme to a different store, create everything listed here in **Settings → Custom data** before expecting full PDP rendering. Update this file every time a new metafield or metaobject is introduced in the code.

To find what is actually read by the code at any given moment, grep:

```bash
rg "\.metafields\." -t liquid
```

## Scoping

This theme uses Shopify products for two distinct purposes: **regular products** (physical goods) and **event tickets** (powered by the [GM Event Ticketing](https://apps.shopify.com/event-ticketing) app). The separation is enforced at two levels:

1. **Template level** — regular products use `product.json`; event products use `product.event.json` (assign via the product admin's "Theme template" dropdown). The event template omits product-specific blocks (`bundle-offer-pill`, `_accordion-row`).
2. **Liquid guards** — inline metafield content (metafield accordion, size guide, bundle pill) checks `product.type` via `_is-event-product` snippet. Belt-and-suspenders: guards fire even if the wrong template is assigned.

| Scope | Template | Product type filter | Purpose |
| --- | --- | --- | --- |
| **Product** | `product` | All types EXCEPT event types | Physical/digital goods — details, care, shipping, sizing |
| **Event** | `product.event` | `Event` or `Ticket` | Event date, venue, schedule, ticket tiers |

Each section below declares its scope in the heading. When a metafield is scoped to products, it must NOT render on event-ticket pages (and vice versa).

## Conventions

- All metafields live under the `custom` namespace unless noted.
- "Optional" means the theme renders nothing (no empty heading, no empty container) when the metafield is blank.
- Rich-text metafields are rendered via `| metafield_tag` so Shopify produces the correct semantic HTML.
- **Scope is declared in the heading** of each section (e.g. "Product metafields", "Event metafields").

---

## Product metafields (scope: regular products)

> These metafields apply to **regular products only**. They are guarded at two levels:
> 1. **Template** — `product.event.json` omits product-specific blocks (`bundle-offer-pill`, `_accordion-row`).
> 2. **Liquid** — `_is-event-product` snippet check (via `product.type`) suppresses inline metafield content (accordion, size guide, bundle pill) on event products.

### `custom.details` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (accordion row "Details")
- **Notes:** Renders inside a `<details>` accordion below add-to-cart. Hidden entirely if blank.

### `custom.product_specifications` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (accordion row "Product specifications")
- **Notes:** Same accordion as above. Hidden if blank.

### `custom.care` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (accordion row "Care")
- **Notes:** Same accordion as above. Hidden if blank.

### `custom.shipping` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (accordion row "Shipping and returns")
- **Notes:** Same accordion as above. Hidden if blank.

### `custom.bundle_offer_pill` — _optional_

- **Type:** Single line text
- **Used by:** `snippets/_bundle-offer-pill.liquid`, rendered on PDP (`blocks/bundle-offer-pill.liquid`, between product title and price), on product cards (`snippets/product-card.liquid`, overlaid top-left of the image), and on cart line items (`snippets/_cart-line-items.liquid`).
- **Notes:** Pure merchandising copy for a "Buy X get Y" offer, e.g. `Buy 3, save 50 kr`. The theme renders the pill verbatim and does not compute prices. Pair it with a matching native **Buy X Get Y** automatic discount under **Discounts** in the admin — the pill copy and the discount configuration are kept in sync manually. Pill is hidden entirely when blank.

### `custom.size_chart` — _optional_

- **Type:** Metaobject reference → `size_chart` (see below)
- **Used by:** `snippets/product-size-guide.liquid`, rendered by `sections/main-product.liquid` above the add-to-cart button
- **Notes:** When set, a text button "Size guide" appears above add-to-cart and opens a dialog containing the intro + table from the referenced `size_chart` metaobject. When blank, the button is not rendered. Originally named `custom.size_guide`; renamed to `size_chart` because Shopify reserves a deleted metafield's key for a grace period and won't allow immediate reuse.

---

## Metaobjects

### `size_chart`

A single size guide (intro paragraph + table). One product references one `size_chart`. The chart can be reused across many products.

| Field             | Type                                             | Required | Purpose                                                                                |
| ----------------- | ------------------------------------------------ | -------- | -------------------------------------------------------------------------------------- |
| `name`            | Single line text                                 | Yes      | Display name shown in the admin metaobject picker (set this as the "display name" too) |
| `intro`           | Rich text                                        | No       | Paragraph(s) shown above the table in the dialog                                       |
| `headers`         | Single line text                                 | Yes      | Column headers as a **comma-separated string**, e.g. `Size, Chest (cm), Waist (cm)`    |
| `size_chart_rows` | List of metaobject references → `size_chart_row` | Yes      | Body rows, in order. First cell of each row becomes a `<th scope="row">`               |

**Admin setup:**

1. Create both metaobjects (`size_chart` and `size_chart_row` — see below) before adding entries.
2. On the `size_chart` definition, open **Display** and set **Display name** to the `name` field. This is what shows in the merchant picker when assigning to a product.

### `size_chart_row`

One row of cells in a `size_chart`.

| Field   | Type             | Required | Purpose                                                                                                                     |
| ------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `cells` | Single line text | Yes      | Cell values as a **comma-separated string** in column order, matching the parent chart's `headers`, e.g. `XS, 84-88, 70-74` |

> **Important:** Both `headers` (on `size_chart`) and `cells` (on `size_chart_row`) must be **single line text** fields containing **comma-separated** values. The snippet splits on commas and trims whitespace, so `XS,84-88,70-74` and `XS, 84-88, 70-74` both work. Do not use list-type fields and do not put commas inside cell values (they would be split).

---

## Event metafields (scope: event tickets)

> These metafields apply to **event products only** (product type `Event` or `Ticket`). They are rendered inline by `sections/main-product.liquid` when the `_is-event-product` snippet returns `true`. All fields are rendered below the add-to-cart button.

### `custom.event_about` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (accordion row "What is this event about?")
- **Notes:** First accordion row, opens by default. Hidden if blank.

### `custom.event_who_for` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (accordion row "Who is this event for?")
- **Notes:** Same accordion group. Hidden if blank.

### `custom.event_participate` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (accordion row "What does it take to participate?")
- **Notes:** Same accordion group. Hidden if blank.

### `custom.event_included` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (accordion row "What is included in the price?")
- **Notes:** Same accordion group. Hidden if blank.

### `custom.event_practical_info` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (standalone section "Practical information")
- **Notes:** Rendered below the accordion group as an `<h2>` heading + prose. Hidden if blank.

### `custom.event_partners` — _optional_

- **Type:** **File** (list) — upload partner logo images
- **Used by:** `sections/main-product.liquid` (standalone section "Our partners for this challenge")
- **Notes:** Rendered as a flex grid of logo images (`200px` wide, `object-contain`). Each file's `preview_image` is used via `image_url` filter. Hidden if empty.

### `custom.event_disclaimer` — _optional_

- **Type:** Rich text
- **Used by:** `sections/main-product.liquid` (standalone section "Disclaimer")
- **Notes:** Rendered below partners as an `<h2>` heading + prose. Hidden if blank.

---

## Maintenance

When you add or remove a metafield or metaobject in code:

1. Update this document in the same commit.
2. If you remove a metafield, mention it in a "Removed" section here for one release so merchants know to clean up Custom data.
3. Keep the field table columns identical (`Field | Type | Required | Purpose`) for consistency.

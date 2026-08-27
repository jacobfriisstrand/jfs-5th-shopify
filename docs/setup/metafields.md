# Metafields & metaobjects setup

Canonical reference for every metafield and metaobject this theme reads. When porting the theme to a different store, create everything listed here in **Settings → Custom data** before expecting full PDP rendering. Update this file every time a new metafield or metaobject is introduced in the code.

To find what is actually read by the code at any given moment, grep:

```bash
rg "\.metafields\." -t liquid
```

## Scoping

This theme uses Shopify products for two distinct purposes: **regular products** (physical goods) and **events**. Both use the same `product.json` template and `main-product.liquid` section. No product-type detection — the PDP renders every section whose metafield is populated. A product with only event metafields looks like an event page; a product with only product metafields looks like a product page. The merchant's only responsibility is to populate the desired metafields.

| Scope       | Template  | Purpose                                                  |
| ----------- | --------- | -------------------------------------------------------- |
| **Product** | `product` | Physical/digital goods — details, care, shipping, sizing |
| **Event**   | `product` | Event date, venue, schedule, ticket tiers                |

Each section below declares its scope in the heading. When a metafield is scoped to products, it must NOT render on event-ticket pages (and vice versa).

## Conventions

- All metafields live under the `custom` namespace unless noted.
- "Optional" means the theme renders nothing (no empty heading, no empty container) when the metafield is blank.
- Rich-text metafields are rendered via `| metafield_tag` so Shopify produces the correct semantic HTML.
- **Scope is declared in the heading** of each section (e.g. "Product metafields", "Event metafields").

---

## Product metafields (scope: regular products)

> These metafields apply to **regular products**. They render only when populated — no type gates, no template guards. If left blank, nothing renders.

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

### `participant_fields`

Event registration config — which optional fields to collect per participant. One product references one `participant_fields` (reusable across events, like `size_chart`). The team vs individual distinction is **not** stored here — it is derived from the per-event `custom.team_size` product metafield (`1` = individual, `> 1` = team).

| Field    | Type                               | Required | Purpose                                                      |
| -------- | ---------------------------------- | -------- | ------------------------------------------------------------ |
| `name`   | Single line text                   | Yes      | Display name in the admin picker (set as the "display name") |
| `fields` | List of refs → `participant_field` | No       | Optional text fields collected per participant               |

### `participant_field`

One participant field. There are no hard-coded fields — every field the buyer fills is configured here. Mark a field `required` to make it mandatory.

| Field      | Type                                | Required | Purpose                                                                                                                     |
| ---------- | ----------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `name`     | Single line text                    | Yes      | Display name in the admin picker                                                                                            |
| `label`    | Single line text                    | Yes      | Field label shown to the buyer, and the line-item property key                                                              |
| `role`     | Select (`name` \| `email` \| blank) | No       | Marks the field as the participant's name or email, used to identify and display each cart line item. Blank = generic text. |
| `required` | True/false                          | No       | Whether the field is required before submit                                                                                 |

### `training_session`

A single training session rendered by `sections/training.liquid` on the training page. The section compares each entry's `date_time` against today to split sessions into one "next" session (earliest future date) and a list of previous sessions.

| Field       | Type             | Required | Purpose                                                            |
| ----------- | ---------------- | -------- | ------------------------------------------------------------------ |
| `name`      | Single line text | Yes      | Session name shown as the heading. Set as the display name too.    |
| `date_time` | Date and time    | Yes      | Session start. Compared against today for the next/previous split. |
| `location`  | Single line text | No       | Venue line rendered under the session heading.                     |
| `body`      | Rich text        | No       | Rich-text description, rendered via `metafield_tag`.               |

**Admin setup:**

1. Create the `training_session` metaobject definition.
2. Enable **Storefront access** on the definition — otherwise `shop.metaobjects.training_session.values` is empty and nothing renders.
3. Add one entry per session. Entries with a blank `date_time` are skipped by the next/previous split.

### `model_size_guide`

A single model photo with the worn size and a caption line, rendered by `sections/model-size-guide.liquid`. The section is added to any page via the theme editor (it is enabled on page templates). Every published entry shows up automatically — no per-entry wiring — and the storefront size filter is built from the distinct `size` values across entries. One entry per (model, product, size) combo; entries appear in admin sort order.

| Field         | Type                    | Required | Purpose                                                                                          |
| ------------- | ----------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `name`        | Single line text        | Yes      | Editor-only identifier (set as the display name). Not rendered on the storefront.                |
| `size`        | Single line text        | Yes      | Worn size, drives the filter. Single line text **limited to preset choices** (see admin setup) so editors cannot enter values the filter won't match. A list of single line text also works — the first value is used. |
| `description` | Single line text        | No       | Caption line, e.g. `Jacob is 186 cm, 86 kg and wears a size L`.                                  |
| `images`      | File reference list (images) | Yes      | One or more model photos; more than one renders a Swiper carousel on the card.                    |
| `product`     | Product reference          | No       | Product this entry belongs to; its title renders as a link to the product page.                   |

**Admin setup:**

1. Create the `model_size_guide` metaobject definition (field type for `images`: **File**, list enabled, media type **Image**).
2. On the `size` field, enable **Validation → Limit to preset choices** and enter the size options (e.g. `XS`, `S`, `M`, `L`, `XL`, `XXL`). Editors then pick from a dropdown instead of typing. Don't rename options after entries exist — entries keep the stored value and would drop out of the filter.
3. Enable **Storefront access** on the definition (type + fields) — otherwise `shop.metaobjects.model_size_guide.values` is empty and nothing renders.
4. Open **Display** and set **Display name** to the `name` field.
5. Create a page (Online Store → Pages) and add the **Model size guide** section in the theme editor (Online Store → Themes → Customize → page → Add section). Then add entries; no per-product metafield is involved — the page shows every published entry.

---

## Event metafields (scope: event tickets)

> These metafields apply to **event products**. They render only when populated — no type gates.

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

### `custom.event_start_date` — _required for event cards_

- **Type:** Date
- **Used by:** `snippets/event-status.liquid` (canonical status resolution), `snippets/event-card.liquid` and `snippets/event-card-plp.liquid` (status badge), `sections/events-collection.liquid` and `sections/generic-header.liquid` (sort buckets + counts), `sections/main-product.liquid` (buy-control visibility), `sections/next-event-teaser.liquid` (formatted date in header)
- **Notes:** All status logic lives in `snippets/event-status.liquid`, which compares start + end dates against `'now'` once. An event is `upcoming` if it hasn't started yet, or has started but not yet ended (a live event stays purchasable and reads as "Upcoming"). An event is `previous` once it has ended. An event with NO start date is unclassified: no badge, excluded from the Upcoming/Previous sort buckets, still shown under "All events". next-event-teaser formats the date as e.g. "23rd of March 2026" and hides the section when the selected event is `previous`. Hidden if blank.

### `custom.event_end_date` — _optional (past-event detection)_

- **Type:** Date
- **Used by:** `snippets/event-status.liquid` (canonical status resolution), `sections/main-product.liquid` (hides the registration form / ATC once the event has ended)
- **Notes:** Compared against `'now'` inside `snippets/event-status.liquid` to mark an event as ended: an event whose end date is in the past is `previous` everywhere (card badge, sort buckets, PDP form visibility). When set and still in the future, a started event stays `upcoming` — a live event keeps its buy controls. When blank, the start date alone decides (`start < now` → `previous`). Hidden if blank.

### `custom.participant_fields` — _optional (enables participant registration)_

- **Type:** Metaobject reference → `participant_fields` (see above)
- **Used by:** `snippets/participant-registration.liquid`, `sections/main-product.liquid`
- **Notes:** When set, the PDP replaces the standard quantity + add-to-cart with a participant registration form. Every participant collects the fields configured on the referenced metaobject. There are no hard-coded fields; use the `required` flag on each `participant_field` entry to mark it mandatory. On submit, one cart line item is added per participant (quantity 1), each carrying its own line-item properties. Past events hide the form (same as ATC). Whether the event registers one buyer or a team of N is derived from `custom.team_size` (below) — not from this metaobject.

### `custom.team_size` — _optional (team vs individual discriminator)_

- **Type:** Integer
- **Used by:** `snippets/participant-registration.liquid`, `blocks/price.liquid`, `src/scripts/participant-registration-form.ts`
- **Notes:** The single source of truth for team vs individual registration. `1` (default) = the buyer registers one participant (individual wording, no team count). `> 1` = the buyer registers a team of exactly that many participants ("A team of N" count, "Register team" button, per-participant accordions, shared `_team_id` on cart lines, and a "Per person" price note). Unique per event product — set on each event's product metafield, not on the `participant_fields` metaobject. Capped by variant inventory.

---

## Removed

- **`participant_fields.mode`** (metaobject field, removed) — redundant: the per-event `custom.team_size` product metafield is the single discriminator (`1` = individual, `> 1` = team). Merchants: remove the `mode` field from the `participant_fields` metaobject definition. Existing instances with a blank or stale `mode` need no migration — the theme no longer reads it.
- **`participant_fields.min_team_size` / `max_team_size`** (metaobject fields, removed) — team size moved to per-event product metafield `custom.team_size`. Merchants: remove these two fields from the `participant_fields` metaobject definition and populate `custom.team_size` on each event product.

---

## Maintenance

When you add or remove a metafield or metaobject in code:

1. Update this document in the same commit.
2. If you remove a metafield, mention it in a "Removed" section here for one release so merchants know to clean up Custom data.
3. Keep the field table columns identical (`Field | Type | Required | Purpose`) for consistency.

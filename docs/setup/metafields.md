# Metafields & metaobjects setup

Canonical reference for every metafield and metaobject this theme reads. When porting the theme to a different store, create everything listed here in **Settings → Custom data** before expecting full PDP rendering. Update this file every time a new metafield or metaobject is introduced in the code.

To find what is actually read by the code at any given moment, grep:

```bash
rg "\.metafields\." -t liquid
```

## Conventions

- All product metafields live under the `custom` namespace unless noted.
- "Optional" means the theme renders nothing (no empty heading, no empty container) when the metafield is blank.
- Rich-text metafields are rendered via `| metafield_tag` so Shopify produces the correct semantic HTML.

---

## Product metafields

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

### `custom.size_chart` — _optional_

- **Type:** Metaobject reference → `size_chart` (see below)
- **Used by:** `snippets/product-size-guide.liquid`, rendered by `sections/main-product.liquid` above the add-to-cart button
- **Notes:** When set, a text button "Size guide" appears above add-to-cart and opens a dialog containing the intro + table from the referenced `size_chart` metaobject. When blank, the button is not rendered. Originally named `custom.size_guide`; renamed to `size_chart` because Shopify reserves a deleted metafield's key for a grace period and won't allow immediate reuse.

---

## Metaobjects

### `size_chart`

A single size guide (intro paragraph + table). One product references one `size_chart`. The chart can be reused across many products.

| Field              | Type                                             | Required | Purpose                                                                                |
| ------------------ | ------------------------------------------------ | -------- | -------------------------------------------------------------------------------------- |
| `name`             | Single line text                                 | Yes      | Display name shown in the admin metaobject picker (set this as the "display name" too) |
| `intro`            | Rich text                                        | No       | Paragraph(s) shown above the table in the dialog                                       |
| `headers`          | Single line text                                 | Yes      | Column headers as a **comma-separated string**, e.g. `Size, Chest (cm), Waist (cm)`    |
| `size_chart_rows`  | List of metaobject references → `size_chart_row` | Yes      | Body rows, in order. First cell of each row becomes a `<th scope="row">`               |

**Admin setup:**

1. Create both metaobjects (`size_chart` and `size_chart_row` — see below) before adding entries.
2. On the `size_chart` definition, open **Display** and set **Display name** to the `name` field. This is what shows in the merchant picker when assigning to a product.

### `size_chart_row`

One row of cells in a `size_chart`.

| Field   | Type             | Required | Purpose                                                                                                  |
| ------- | ---------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `cells` | Single line text | Yes      | Cell values as a **comma-separated string** in column order, matching the parent chart's `headers`, e.g. `XS, 84-88, 70-74` |

> **Important:** Both `headers` (on `size_chart`) and `cells` (on `size_chart_row`) must be **single line text** fields containing **comma-separated** values. The snippet splits on commas and trims whitespace, so `XS,84-88,70-74` and `XS, 84-88, 70-74` both work. Do not use list-type fields and do not put commas inside cell values (they would be split).

---

## Maintenance

When you add or remove a metafield or metaobject in code:

1. Update this document in the same commit.
2. If you remove a metafield, mention it in a "Removed" section here for one release so merchants know to clean up Custom data.
3. Keep the field table columns identical (`Field | Type | Required | Purpose`) for consistency.

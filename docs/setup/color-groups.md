# Setting up color groups in Shopify Admin

This guide walks you through grouping multiple color products (for example, "Hoodie Classic — Blue", "Hoodie Classic — Red", "Hoodie Classic — Black") so that the storefront treats them as one item. The collection page shows just one tile per group, and the product page shows a swatch row that lets shoppers click between the colors.

You don't need any technical knowledge to follow this. The whole setup happens in Shopify Admin.

> **Why we do it this way.** Each color is its own product so that the page and photos can be different per color, and clicking a color gives the shopper a real new page (and a shareable link). The grouping happens through a shared "color group" record. For the engineering rationale, see [ADR-0004](../adr/0004-product-model.md).

## Before you start

You'll need:

- Shopify Admin access with permission to edit metafield definitions and create metaobjects.
- All your color products already created (one Shopify product per color, with sizes as that product's variants). Naming convention: `<Item> — <Color>`, e.g. `Hoodie Classic — Blue`.

## One-time setup (engineer or admin, done once per store)

These two definitions only need to be created the first time. After that, merchants only do the per-group steps further down.

### Step 1 — Create the `color_group` metaobject definition

1. In Shopify Admin, go to **Settings → Custom data**.
2. Under **Metaobjects**, click **Add definition**.
3. Set the **Name** to `Color group` and the **Type** to `color_group` (Shopify will fill this in automatically as you type).
4. Add three fields:

   | Field name        | Field key         | Type                         | Settings                                |
   | ----------------- | ----------------- | ---------------------------- | --------------------------------------- |
   | `Name`            | `name`            | Single line text             | Required                                |
   | `Entries`         | `entries`         | Product (list of references) | Required                                |
   | `Primary product` | `primary_product` | Product (single reference)   | Required (after Entries has values)     |

5. Save the definition.

> _Screenshot placeholder: Shopify Admin "Add metaobject definition" page with the three fields filled in._

### Step 2 — Add the `color_group` metafield to products

1. In Shopify Admin, go to **Settings → Custom data**.
2. Under **Products → Metafields**, click **Add definition**.
3. Set the **Name** to `Color group` and the **Namespace and key** to `custom.color_group` (or `<your_namespace>.color_group` if your store uses a different namespace).
4. Set the **Type** to **Metaobject reference** → **Color group** (the metaobject definition you just created).
5. Make it required if you want the storefront grid to enforce that every color product belongs to a group. We recommend leaving it optional initially so you can onboard products gradually.
6. Save the definition.

> _Screenshot placeholder: Shopify Admin "Add product metafield" page with the metaobject reference type selected._

That's the one-time setup done.

## Creating a color group (the everyday workflow)

Use this whenever you launch a new item in multiple colors, or when you add a new color to an existing item.

### Step 1 — Make sure the color products exist

Each color is its own product. If you haven't created them yet, do that first under **Products → Add product**. Each color product should have:

- A title like `Hoodie Classic — Blue`.
- That color's photography as the product's media.
- The available sizes as the product's variants (Shopify variants — not separate products).

### Step 2 — Create the color group metaobject

1. Go to **Content → Metaobjects → Color group** in Shopify Admin.
2. Click **Add Color group**.
3. Fill in the fields:
   - **Name** — the human label for the whole group, e.g. `Hoodie Classic`. This is what merchants see in admin; the storefront uses each color product's own title.
   - **Entries** — click **Select products** and pick every color product in the group. Order doesn't matter; the storefront orders swatches by metafield order.
   - **Primary product** — pick the one color that should represent the group on collection pages. (For example, if "Blue" is your hero color, select `Hoodie Classic — Blue`.) This product **must** also be in **Entries**.
4. Click **Save**.

> _Screenshot placeholder: Shopify Admin "Color group" metaobject edit page with Name, Entries, and Primary product filled in._

### Step 3 — Link each color product back to the group

For each color product in the group:

1. Open the product in Shopify Admin (**Products → All products → click the product**).
2. Scroll to the **Metafields** section.
3. Find the **Color group** metafield. Click it and select the metaobject you just created.
4. Click **Save**.

> _Screenshot placeholder: Shopify Admin product page with the Color group metafield expanded and a metaobject selected._

Repeat for every color in the group. Yes, this is the one repetitive step — Shopify doesn't have a "bulk-link products to a metaobject" UI yet. For typical 3–6-color groups it's a one-minute job per color.

### Step 4 — Verify it on the storefront

1. Go to the collection page that contains your color products. You should see **one tile** for the group, showing the **primary product**'s image and title.
2. Click into the primary product. You should see a row of color swatches above the size selector. Clicking another color navigates to that color's product page.
3. Confirm the swatches show every color in the group, and clicking each one lands on the right product.

If the collection page shows multiple tiles (one per color) instead of one, see [Troubleshooting](#troubleshooting) below.

## Adding a new color to an existing group

When you launch an additional color of an existing item (e.g. adding "Hoodie Classic — Green" to a group that already has Blue, Red, Black):

1. Create the new color product (same as Step 1 above).
2. Open the **Color group** metaobject for that group (**Content → Metaobjects → Color group → click the group**).
3. In **Entries**, add the new color product.
4. Click **Save**.
5. Open the new color product, set its **Color group** metafield to the same metaobject, and save.

That's it. The storefront picks up the new color the next time the page is loaded — no theme changes needed.

## Changing the primary product

If you want a different color to represent the group on collection pages:

1. Open the **Color group** metaobject.
2. Change **Primary product** to the new color.
3. Click **Save**.

The collection grid will start showing the new color's tile on the next page load. Inventory and pricing per color don't change — only which one is the "face" of the group on collection pages.

## Renaming a group

The metaobject's **Name** field is for admin/merchant convenience and isn't shown on the storefront. The storefront uses each color product's own title (e.g. `Hoodie Classic — Blue`).

To rename the whole item from "Hoodie Classic" to "Classic Hoodie":

1. Open each color product and update its **Title** in Shopify Admin.
2. (Optional) Update the **Name** field on the metaobject so admin lists are tidy.

There is no theme or metaobject change needed beyond renaming the products themselves.

## Removing a color from a group

When a color is being discontinued:

1. **If the color is sold out and you want it hidden completely:** unpublish the color product (set its status to **Draft** or **Archived**). The storefront stops listing it; the swatch row no longer renders it.
2. **If you also want it removed from the group's record:** open the **Color group** metaobject, remove the product from **Entries**, and save. Then open the product itself and clear its **Color group** metafield.
3. If the discontinued color was the **Primary product**, set a new primary product **before** removing it from Entries — otherwise the collection grid will fall back to alphabetical order over the remaining entries (and log a configuration warning that engineers will see).

## Troubleshooting

**The collection page shows my product as multiple tiles, one per color.**
Check that every color product has its **Color group** metafield set to the same metaobject. A product without that metafield is treated as a standalone product and renders its own tile.

**The collection page shows a different color than I picked as primary.**
Confirm the **Primary product** field on the metaobject points to the color you want, **and** that color is also in **Entries**. If Primary product is unset, the storefront falls back to whichever color is alphabetically first in Entries.

**The product page doesn't show a swatch row.**
The PDP only renders swatches when the product's **Color group** metafield resolves to a metaobject with at least 2 entries. Check that this product's metafield is set, and that the metaobject's **Entries** list includes more than one product.

**Clicking a swatch goes to a 404 page.**
One of the products in **Entries** has been deleted or unpublished but is still listed on the metaobject. Open the metaobject and remove the dead reference.

**A new color I added isn't showing up.**
You probably did Step 3 of "Adding a new color" (linking from the new product) but skipped Step 2 (adding it to the metaobject's Entries) — or vice versa. Both edges of the link are required.

**I want to check that everything is configured correctly across all groups at once.**
There's a read-only validator script (`scripts/validate-color-groups.ts`) that engineers can run against the store's Admin API. It reports any orphaned references, missing primary products, or mismatched metafield links. Ask an engineer to run it if something feels off — it doesn't change anything in the store, just reports.

## Related

- [ADR-0004 — Product model](../adr/0004-product-model.md) — the engineering decision and rationale.
- `CONTEXT.md` → **Color group**, **Color group entries**, **Primary product**, **Color product** — the vocabulary used throughout the codebase and in PR discussions.

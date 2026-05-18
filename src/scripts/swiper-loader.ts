/**
 * swiper-loader — single cached dynamic import of the vendored Swiper Element
 * bundle (~50 KB gz). Both `<carousel>` and the future `<product-gallery>`
 * (issue #34) import this module so the bundle is fetched and parsed at most
 * once per page, even if both elements render on the same page.
 *
 * The Swiper bundle URL is passed in by the caller (typically via a
 * `data-bundle-url` attribute on the custom element, populated by Liquid:
 * `data-bundle-url="{{ 'swiper-element-bundle.js' | asset_url }}"`). We don't
 * hardcode it here so the module stays Shopify-CDN-agnostic and testable.
 *
 * NOTE: the Swiper bundle is intentionally excluded from the per-file budget
 * (`perf-budget.json` → `perFile.exclude`) and is never referenced by a static
 * `<script src=…>` tag — it only enters the asset graph via the `import()`
 * below. See `scripts/check-budgets.ts` for the rationale.
 */

let promise: Promise<unknown> | null = null;

export function loadSwiper(src: string): Promise<unknown> {
  if (promise) return promise;
  promise = import(/* @vite-ignore */ src);
  return promise;
}

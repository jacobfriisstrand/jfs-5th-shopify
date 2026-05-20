/**
 * @theme/utilities
 *
 * Residual miscellany that does not fit one of the dedicated Modules:
 * - `@theme/scheduling` — idle / yield / debounce / throttle / Scheduler
 * - `@theme/dom-events` — document/animation lifecycle, click hit-testing
 * - `@theme/viewport`   — breakpoints, motion preference, ResizeNotifier
 * - `@theme/geometry`   — clamp / center / start / closest
 *
 * Anything in here is genuinely cross-cutting (network/string/parsing helpers,
 * a tiny shimmer custom element, the RecentlyViewed stub).
 */

/**
 * @typedef {{ [key: string]: string | undefined }} Headers
 */

/**
 * @typedef {Object} FetchConfig
 * @property {string} method
 * @property {Headers} headers
 * @property {string | FormData | undefined} [body]
 */

/**
 * Creates a fetch configuration object
 * @param {string} [type] The type of response to expect
 * @param {Object} [config] The config of the request
 * @param {FetchConfig['body']} [config.body] The body of the request
 * @param {FetchConfig['headers']} [config.headers] The headers of the request
 * @returns {RequestInit} The fetch configuration object
 */
export function fetchConfig(
  type: string = "json",
  config: { body?: BodyInit; headers?: Record<string, string> } = {},
) {
  /** @type {Headers} */
  const headers = {
    "Content-Type": "application/json",
    Accept: `application/${type}`,
    ...config.headers,
  };

  if (type === "javascript") {
    headers["X-Requested-With"] = "XMLHttpRequest";
    delete headers["Content-Type"];
  }

  return {
    method: "POST",
    headers: /** @type {HeadersInit} */ (headers),
    body: config.body,
  };
}

/**
 * Normalize a string
 * @param {string} str The string to normalize
 * @returns {string} The normalized string
 */
export function normalizeString(str) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Helper to parse integer with a default fallback
 * Handles the case where 0 is a valid value (not falsy)
 * @template {number|null} T
 * @param {string|number|null|undefined} value - The value to parse
 * @param {T} defaultValue - The default value (number or null)
 * @returns {number|T} The parsed integer or default value
 */
export function parseIntOrDefault(value, defaultValue) {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  const parsed = parseInt(value.toString());
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Preloads an image
 * @param {string} src - The source of the image to preload
 */
export function preloadImage(src) {
  const image = new Image();
  image.src = src;
}

/**
 * Gets the `view` URL search parameter value, if it exists.
 * Useful for Section Rendering API calls to get HTML markup for the correct template view.
 * Primarily used in testing alternative template views.
 * @returns {string | null} The view parameter value, or null if it doesn't exist
 */
export function getViewParameterValue() {
  return new URLSearchParams(window.location.search).get("view");
}

/**
 * Change the meta theme color of the browser.
 * @param {string} color - The color value (e.g., 'rgb(255, 255, 255)')
 */
export function changeMetaThemeColor(color) {
  const metaThemeColor = document.head.querySelector(
    'meta[name="theme-color"]',
  );
  if (metaThemeColor && color) {
    metaThemeColor.setAttribute("content", color);
  }
}

export class TextComponent extends HTMLElement {
  shimmer() {
    this.setAttribute("shimmer", "");
  }
}

if (!customElements.get("text-component")) {
  customElements.define("text-component", TextComponent);
}

/**
 * Resets the shimmer attribute on all elements in the container.
 * @param {Element} [container] - The container to reset the shimmer attribute on.
 */
export function resetShimmer(container = document.body) {
  const shimmer = container.querySelectorAll("[shimmer]");
  shimmer.forEach((item) => item.removeAttribute("shimmer"));
}

// Stub for RecentlyViewed — original implementation lived in src/scripts/recently-viewed-products.ts
// (removed by the starter prune). Re-exported here so `predictive-search.ts` continues to work
// without that module. Restore the original script if you want recently-viewed product tracking.
export const RecentlyViewed = {
  getProducts: (): Array<{ id: string }> => [],
  addProduct: (_id: string | number): void => {},
  clearProducts: (): void => {},
};

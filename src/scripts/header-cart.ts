// Header cart progressive enhancement.
//
// Two responsibilities:
//
//   1. Listen for `cart:update` events (dispatched by CartAddEvent /
//      CartUpdateEvent) and refresh every `[data-cart-count]` /
//      `[data-cart-count-a11y]` element so any number of header-cart
//      blocks (mobile + desktop variants) stay in sync.
//
//   2. Defer-load the cart drawer on first click:
//      a) Dynamic-import `@theme/cart-drawer` on first hover/focus
//         (0 KB against static asset budget per ADR-0003 pillar 7).
//      b) On click, open the `<cart-drawer-component>` rendered by
//         `layout/theme.liquid`. If the section was conditionally
//         omitted from the template, lazy-fetch it via the Section
//         Rendering API first.
//      The bare `<a href="/cart">` remains the JS-disabled fallback.
import { ThemeEvents } from "@theme/events";

const cartCountSelector = "[data-cart-count]";
const cartCountA11ySelector = "[data-cart-count-a11y]";
const headerCartSelector = "[data-header-cart]";
const drawerSelector = "cart-drawer-component";

let pending = false;

async function refresh() {
  if (pending) return;
  pending = true;
  try {
    const response = await fetch(`${Theme.routes.cart_url}.js`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const cart = (await response.json()) as { item_count: number };
    const count = String(cart.item_count);
    for (const el of document.querySelectorAll<HTMLElement>(
      cartCountSelector,
    )) {
      el.textContent = count;
    }
    for (const el of document.querySelectorAll<HTMLElement>(
      cartCountA11ySelector,
    )) {
      const text = el.textContent ?? "";
      const lastColon = text.lastIndexOf(":");
      el.textContent =
        lastColon >= 0 ? `${text.slice(0, lastColon + 1)} ${count}` : count;
    }
  } catch {
    // Ignore — next event will retry.
  } finally {
    pending = false;
  }
}

let drawerPromise: Promise<unknown> | null = null;
let sectionInjected = false;
let injectPromise: Promise<HTMLElement | null> | null = null;

function loadDrawer(): Promise<unknown> {
  drawerPromise ??= import("@theme/cart-drawer");
  return drawerPromise;
}

async function injectCartDrawer(): Promise<HTMLElement | null> {
  if (sectionInjected) return getDrawerElement() as HTMLElement | null;
  injectPromise ??= _injectCartDrawer();
  return injectPromise;
}

async function _injectCartDrawer(): Promise<HTMLElement | null> {
  const url = new URL(window.location.href);
  url.searchParams.set("section_id", "cart-drawer");
  const response = await fetch(url.toString());
  if (!response.ok) return null;
  const html = await response.text();

  const doc = new DOMParser().parseFromString(html, "text/html");
  const section = doc.querySelector<HTMLElement>('[id^="shopify-section-"]');
  if (!section) return null;

  // Re-create <script> elements so they execute when appended to live DOM.
  // Scripts parsed via DOMParser are inert; the cart-drawer section ships
  // <script type="module"> tags for component-quantity-selector and cart-form
  // that must register their custom elements.
  for (const oldScript of section.querySelectorAll("script")) {
    const newScript = document.createElement("script");
    for (let i = 0; i < oldScript.attributes.length; i++) {
      const attr = oldScript.attributes[i];
      newScript.setAttribute(attr.name, attr.value);
    }
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  }

  const mainContent = document.getElementById("MainContent");
  mainContent?.parentNode?.insertBefore(section, mainContent);

  // Wait for the commerce-specific custom elements (<cart-form-component>,
  // <quantity-selector-component>) shipped as <script type="module"> in the
  // section HTML to load and register before the first open triggers a morph.
  await Promise.all([
    customElements.whenDefined("cart-form-component"),
    customElements.whenDefined("quantity-selector-component"),
  ]);

  sectionInjected = true;
  return section;
}

function getDrawerElement(): (HTMLElement & { show?: () => void }) | null {
  return document.querySelector<HTMLElement & { show?: () => void }>(
    drawerSelector,
  );
}

async function openDrawer() {
  await loadDrawer();
  // Wait a microtask so the custom element upgrades before we call show().
  await Promise.resolve();

  // If the cart-drawer section wasn't rendered server-side (e.g. on
  // non-ecommerce templates that conditionally omit it), lazy-fetch and
  // inject it via the Section Rendering API. Otherwise the section is
  // already in the DOM from the layout and we just open it.
  if (!getDrawerElement() && !sectionInjected) {
    await injectCartDrawer();
  }

  const drawer = getDrawerElement();
  drawer?.show?.();
}

function attachAnchor(anchor: HTMLAnchorElement) {
  if (anchor.dataset.cartDrawerBound === "true") return;
  anchor.dataset.cartDrawerBound = "true";

  const prefetch = () => void loadDrawer();
  anchor.addEventListener("mouseenter", prefetch, { once: true });
  anchor.addEventListener("focus", prefetch, { once: true });

  anchor.addEventListener("click", (event) => {
    // Honor modifier-key navigation (open in new tab/window) and middle-
    // click. These users expect the bare anchor behavior.
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    void openDrawer();
  });
}

function attachAnchors() {
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
    headerCartSelector,
  )) {
    attachAnchor(anchor);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attachAnchors, { once: true });
} else {
  attachAnchors();
}

document.addEventListener(ThemeEvents.cartUpdate, (event) => {
  void refresh();
});

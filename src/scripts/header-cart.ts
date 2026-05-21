// Header cart progressive enhancement.
//
// Two responsibilities:
//
//   1. Listen for `cart:update` events (dispatched by CartAddEvent /
//      CartUpdateEvent) and refresh every `[data-cart-count]` /
//      `[data-cart-count-a11y]` element so any number of header-cart
//      blocks (mobile + desktop variants) stay in sync.
//
//   2. Defer-load the cart drawer (`@theme/cart-drawer`) and open it on
//      header cart icon click. The drawer module is dynamically imported
//      on first hover/focus of the anchor — counts as 0 KB against the
//      route's static asset budget per ADR-0003 pillar 7. The bare
//      `<a href="/cart">` remains the JS-disabled fallback.
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

function loadDrawer(): Promise<unknown> {
  drawerPromise ??= import("@theme/cart-drawer");
  return drawerPromise;
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

  const detail = (event as CustomEvent).detail as
    | { data?: { source?: string } }
    | undefined;
  if (detail?.data?.source === "product-form-component") {
    void openDrawer();
  }
});

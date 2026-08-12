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
//      b) On click, clone the cart-drawer section from the inert
//         `<template>` in `layout/theme.liquid` (parsed but not in
//         the main DOM — no rendering, no scripts, no a11y cost).
//         Re-create `<script>` elements so commerce modules load,
//         insert before `<main>`, then call `show()` on the
//         upgraded `<cart-drawer-component>`. Subsequent opens reuse
//         the injected markup (re-rendered via Section Rendering API).
//      The bare `<a href="/cart">` remains the JS-disabled fallback.
import { ThemeEvents } from "@theme/events";

const cartCountSelector = "[data-cart-count]";
const cartCountA11ySelector = "[data-cart-count-a11y]";
const cartBadgeSelector = "[data-cart-badge]";
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
    for (const el of document.querySelectorAll<HTMLElement>(
      cartBadgeSelector,
    )) {
      el.classList.toggle("hidden", cart.item_count === 0);
    }
  } catch {
    // Ignore — next event will retry.
  } finally {
    pending = false;
  }
}

let drawerPromise: Promise<unknown> | null = null;
let sectionInjected = false;
let injectPromise: Promise<void> | null = null;

function loadDrawer(): Promise<unknown> {
  drawerPromise ??= import("@theme/cart-drawer");
  return drawerPromise;
}

async function injectCartDrawer(): Promise<void> {
  if (sectionInjected) return;
  injectPromise ??= _injectCartDrawer();
  return injectPromise;
}

async function _injectCartDrawer(): Promise<void> {
  const template = document.getElementById(
    "cart-drawer-template",
  ) as HTMLTemplateElement | null;
  if (!template) return;

  // Clone the inert template content. The section markup is parsed but
  // not part of the main DOM (no rendering, no scripts, no a11y cost).
  const fragment = template.content.cloneNode(true) as DocumentFragment;

  // Re-create <script> elements so they execute when inserted into the
  // live DOM. Scripts in cloned template fragments are inert.
  for (const oldScript of fragment.querySelectorAll("script")) {
    const newScript = document.createElement("script");
    for (let i = 0; i < oldScript.attributes.length; i++) {
      const attr = oldScript.attributes[i];
      newScript.setAttribute(attr.name, attr.value);
    }
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  }

  // Extract the section element and insert before <main>.
  const section = fragment.querySelector<HTMLElement>(
    '[id^="shopify-section-"]',
  );
  if (!section) return;

  // Append to <body> so the grid (grid-rows-[auto_1fr_auto]) keeps
  // header, main, and footer in their explicit rows. The section
  // occupies an implicit trailing row with zero height — the dialog
  // inside is position:fixed and doesn't participate in flow.
  document.body.appendChild(section);

  // Wait for the commerce-specific custom elements (<cart-form-component>,
  // <quantity-selector-component>) whose module scripts were just injected
  // to load and register before the first open triggers a morph.
  await Promise.all([
    customElements.whenDefined("cart-form-component"),
    customElements.whenDefined("quantity-selector-component"),
  ]);

  sectionInjected = true;
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

  // Clone the cart-drawer section from the inert <template> on first
  // open. The template is parsed server-side but lives outside the main
  // DOM — no rendering, no scripts, no a11y cost until cloned.
  if (!sectionInjected) {
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

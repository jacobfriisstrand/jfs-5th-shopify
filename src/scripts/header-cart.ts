// Listens for cart:update events (dispatched by CartAddEvent / CartUpdateEvent)
// and refreshes the header cart count without a page reload.
//
// Updates every `[data-cart-count]` and `[data-cart-count-a11y]` element in the
// document so any number of header-cart blocks (mobile + desktop variants)
// stay in sync. The a11y label is rebuilt from the `accessibility.cart_count`
// translation template baked in at render time.
import { ThemeEvents } from "@theme/events";

const cartCountSelector = "[data-cart-count]";
const cartCountA11ySelector = "[data-cart-count-a11y]";

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
      // Preserve the localized label prefix; only the trailing number changes.
      // Format: "<label>: <count>" — split on the last colon to keep any
      // translated text intact even if it contains other colons.
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

document.addEventListener(ThemeEvents.cartUpdate, () => {
  void refresh();
});

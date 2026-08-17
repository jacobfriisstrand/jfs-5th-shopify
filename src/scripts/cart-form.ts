import { Component } from "@theme/component";
import {
  ThemeEvents,
  QuantitySelectorUpdateEvent,
  CartUpdateEvent,
  ToastEvent,
} from "@theme/events";
import { normalizeSectionId, sectionRenderer } from "@theme/section-renderer";

/**
 * `<cart-form-component>` — progressive enhancement for the cart `<form>`
 * rendered by `sections/main-cart.liquid` (and, in the future, the cart
 * drawer).
 *
 * Without this script, the form is a plain `<form action="/cart" method="post">`
 * and the merchant clicks the "Update cart" button (shown only inside
 * `<noscript>`) to commit quantity changes. With this script:
 *
 *   - Any quantity change in a `<quantity-selector-component>` child fires
 *     `QuantitySelectorUpdateEvent`. We debounce per-cart-line (250 ms) and
 *     POST to `/cart/change.js`, then re-render the host section so the
 *     line total, subtotal, and any merchant-facing copy stay in sync.
 *   - Clicking a per-line remove button (`<button name="updates[<key>]"
 *     value="0">`) intercepts the click, POSTs `quantity=0`, and re-renders.
 *   - The "Update cart" button is hidden when JS is enabled (it lives inside
 *     `<noscript>` in the summary block) so users never see a stale call to
 *     action.
 *
 * The element wraps the `<form>` rather than extending it so we keep the
 * project-wide autonomous-custom-element pattern (no `is=` attribute).
 */
const DEBOUNCE_MS = 250;

export class CartFormComponent extends Component {
  #pending = new Map<number, number>();
  #inFlight = 0;
  #section: HTMLElement | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.#section = this.closest<HTMLElement>("[id^='shopify-section-']");
    this.addEventListener(
      ThemeEvents.quantitySelectorUpdate,
      this.#onQuantityUpdate as EventListener,
    );
    this.addEventListener("click", this.#onClick);
    this.addEventListener("submit", this.#onSubmit);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      ThemeEvents.quantitySelectorUpdate,
      this.#onQuantityUpdate as EventListener,
    );
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("submit", this.#onSubmit);
    for (const id of this.#pending.values()) clearTimeout(id);
    this.#pending.clear();
  }

  #onQuantityUpdate = (event: QuantitySelectorUpdateEvent) => {
    const { quantity, cartLine } = (
      event as unknown as { detail: { quantity: number; cartLine?: number } }
    ).detail;
    if (!cartLine) return;

    const existing = this.#pending.get(cartLine);
    if (existing) clearTimeout(existing);

    const timeoutId = window.setTimeout(() => {
      this.#pending.delete(cartLine);
      void this.#change(cartLine, quantity);
    }, DEBOUNCE_MS);

    this.#pending.set(cartLine, timeoutId);
  };

  #onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    const removeButton = target.closest<HTMLButtonElement>(
      'button[type="submit"][name^="updates["][value="0"]',
    );
    if (!removeButton) return;

    event.preventDefault();

    const form = removeButton.closest("form");
    if (!form) return;

    const buttons = Array.from(
      form.querySelectorAll<HTMLButtonElement>(
        'button[type="submit"][name^="updates["][value="0"]',
      ),
    );
    const line = buttons.indexOf(removeButton) + 1;
    if (line <= 0) return;

    void this.#change(line, 0);
  };

  #onSubmit = (event: SubmitEvent) => {
    // Allow the checkout button's native submit — Shopify redirects a POST to
    // /cart with a name="checkout" submitter to the checkout. We only intercept
    // quantity updates.
    if (
      event.submitter instanceof HTMLButtonElement &&
      event.submitter.name === "checkout"
    ) {
      return;
    }
    // When JS is enabled we own quantity updates; prevent the native submit
    // (e.g. Enter inside a quantity input would otherwise submit with the
    // first per-line remove button as submitter and drop that line).
    event.preventDefault();
    const active = this.ownerDocument.activeElement;
    if (active instanceof HTMLInputElement) active.blur();
  };

  async #change(line: number, quantity: number) {
    const body = JSON.stringify({ line, quantity });
    const url = this.#changeUrl();

    this.#inFlight += 1;
    this.#markLineUpdating(line, true);
    this.#markSubtotalUpdating(true);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
      });
      if (!response.ok) {
        document.dispatchEvent(
          new ToastEvent({
            message: Theme.translations.cart_update_failed,
            variant: "error",
          }),
        );
        this.#markLineUpdating(line, false);
        return;
      }
      await this.#rerenderSection();
    } catch {
      // Swallow network errors; the next interaction will retry.
      document.dispatchEvent(
        new ToastEvent({
          message: Theme.translations.cart_update_failed,
          variant: "error",
        }),
      );
      this.#markLineUpdating(line, false);
    } finally {
      this.#inFlight = Math.max(0, this.#inFlight - 1);
      if (this.#inFlight === 0) this.#markSubtotalUpdating(false);
    }
  }

  #markLineUpdating(line: number, updating: boolean) {
    const li = this.querySelector<HTMLElement>(`li[data-cart-line="${line}"]`);
    if (!li) return;
    if (updating) {
      li.dataset.updating = "true";
      li.setAttribute("aria-busy", "true");
    } else {
      delete li.dataset.updating;
      li.removeAttribute("aria-busy");
    }
  }

  #markSubtotalUpdating(updating: boolean) {
    const subtotal = this.querySelector<HTMLElement>("[data-cart-subtotal]");
    if (!subtotal) return;
    if (updating) {
      subtotal.dataset.updating = "true";
      subtotal.setAttribute("aria-busy", "true");
    } else {
      delete subtotal.dataset.updating;
      subtotal.removeAttribute("aria-busy");
    }
  }

  async #rerenderSection() {
    const section = this.#section;
    if (!section) return;
    await sectionRenderer.renderSection(normalizeSectionId(section.id), {
      cache: false,
    });
    // Notify other listeners (header cart count, future cart drawer, etc.)
    // that the cart has changed. The section render only refreshes the
    // cart section itself — the header lives in a separate section group.
    // Dispatch on document, not `this`: the morph above detaches the old
    // form node, so an event dispatched on `this` would never reach
    // document-level listeners (header cart badge, drawer refresh).
    document.dispatchEvent(
      new CartUpdateEvent({}, this.id || "cart-form-component", {
        source: "cart-form-component",
      }),
    );
  }

  #changeUrl() {
    const base = Theme?.routes?.cart_change_url ?? "/cart/change";
    return base.endsWith(".js") ? base : `${base}.js`;
  }
}

if (!customElements.get("cart-form-component")) {
  customElements.define("cart-form-component", CartFormComponent);
}

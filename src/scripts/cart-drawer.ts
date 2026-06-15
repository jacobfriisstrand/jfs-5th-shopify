import { Component } from "@theme/component";
import { ThemeEvents } from "@theme/events";
import { normalizeSectionId, sectionRenderer } from "@theme/section-renderer";

/**
 * `<cart-drawer-component>` — slide-over cart drawer per ADR-0005.
 *
 * Mounted on first cart interaction by `header-cart.ts`, which fetches
 * the section HTML via the Section Rendering API and injects it before
 * `<main>`. Absent from the DOM until the user explicitly opens the
 * cart — no dead markup on non-commerce pages. Closed by default. Opens only when explicitly asked:
 *
 *   1. Header cart icon click — `header-cart.ts` defer-imports this module
 *      on first hover/focus, then calls `show()` on click.
 *
 * On any cart change (including edits made on `/cart`), the drawer re-
 * renders its own section so that opening it later shows current contents.
 *
 * Focus trap, Escape key, and backdrop click are handled by the inner
 * `<dialog-component>` (registered globally) wrapping a native `<dialog>`.
 * Native `<dialog>.showModal()` provides the focus trap per the HTML spec.
 */
export class CartDrawerComponent extends Component {
  #section: HTMLElement | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.#section = this.closest<HTMLElement>("[id^='shopify-section-']");
    document.addEventListener(ThemeEvents.cartUpdate, this.#onCartUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(ThemeEvents.cartUpdate, this.#onCartUpdate);
  }

  #onCartUpdate = () => {
    void this.#rerenderSection();
  };

  /**
   * Public entry point used by `header-cart.ts` to open the drawer on
   * cart-icon click. Re-renders the section first so contents are fresh.
   */
  async show() {
    await this.#rerenderSection();
    this.#openDialog();
  }

  #openDialog() {
    const dialog = this.querySelector("dialog-component") as
      | (HTMLElement & { showDialog?: () => void })
      | null;
    dialog?.showDialog?.();
  }

  async #rerenderSection() {
    const section = this.#section;
    if (!section) return;
    try {
      await sectionRenderer.renderSection(normalizeSectionId(section.id), {
        cache: false,
      });
    } catch {
      // Network errors are non-fatal; the next event will retry.
    }
  }
}

if (!customElements.get("cart-drawer-component")) {
  customElements.define("cart-drawer-component", CartDrawerComponent);
}

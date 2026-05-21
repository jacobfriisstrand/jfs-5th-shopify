import { normalizeSectionId, sectionRenderer } from "@theme/section-renderer";

/**
 * `<variant-picker-form>` — progressive enhancement for the PDP variant
 * picker rendered by `blocks/variant-picker.liquid`.
 *
 * Without this script, every `?variant=…` anchor in the picker navigates
 * the browser. With it, all clicks are intercepted and the `main-product`
 * section is re-rendered through the Section Rendering API instead — so
 * the picker pills, price, inventory, gallery, add-to-cart variant id and
 * everything else inside `main-product` stay in sync without a full page
 * reload.
 *
 * History strategy: a **Color** change is meaningful enough to deserve its
 * own history entry (so the back button navigates between colors), so it
 * uses `pushState`. Other axes (Size, etc.) use `replaceState` so the URL
 * stays correct but back/forward isn't polluted with every micro-change.
 *
 * Plain-link semantics are preserved for modifier-clicks (cmd/ctrl/shift/
 * alt) and middle-click — those fall through to the browser's normal
 * "open in new tab/window" behaviour. No-JS users get full navigation.
 */
class VariantPickerForm extends HTMLElement {
  #section: HTMLElement | null = null;

  connectedCallback() {
    this.#section = this.closest<HTMLElement>("[id^='shopify-section-']");
    this.addEventListener("click", this.#onClick);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#onClick);
  }

  #onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest<HTMLAnchorElement>("a[data-axis]");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    const section = this.#section;
    if (!section) return;

    event.preventDefault();

    const url = new URL(href, window.location.href);
    const historyMethod =
      anchor.dataset.axis === "color" ? "pushState" : "replaceState";
    history[historyMethod]({}, "", url.toString());

    void sectionRenderer.renderSection(normalizeSectionId(section.id), { url });
  };
}

if (!customElements.get("variant-picker-form")) {
  customElements.define("variant-picker-form", VariantPickerForm);
}

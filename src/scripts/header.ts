import { Component } from "@theme/component";
import { DialogCloseEvent, DialogOpenEvent } from "@theme/dialog";
import { debounce } from "@theme/scheduling";

/**
 * `<header-component>` owns the responsive layout decision for the header.
 * It publishes `data-menu-style="menu" | "drawer"` on itself and CSS (via
 * Tailwind's `group-data-[menu-style=…]` variants on children) flips
 * visibility — there is no JS-driven `display:` toggling.
 *
 * Mode selection: drawer when the device is touch-primary OR the inline
 * menu would overflow the header row. Otherwise, inline menu.
 */
class HeaderComponent extends Component {
  #ro: ResizeObserver | null = null;

  connectedCallback() {
    super.connectedCallback();

    this.#evaluateLayout();
    this.#ro = new ResizeObserver(this.#onResize);
    this.#ro.observe(this);

    this.addEventListener("click", this.#onClick);
    this.addEventListener(DialogOpenEvent.eventName, this.#onDialogOpen);
    this.addEventListener(DialogCloseEvent.eventName, this.#onDialogClose);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#ro?.disconnect();
    this.#ro = null;
  }

  get #trigger(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>("[data-menu-trigger]");
  }

  get #drawer(): HTMLElement | null {
    return this.querySelector<HTMLElement>(
      "dialog-component#header-menu-drawer",
    );
  }

  get #searchTrigger(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>("[data-search-trigger]");
  }

  get #searchDialog(): HTMLElement | null {
    return this.querySelector<HTMLElement>(
      "dialog-component#header-search-dialog",
    );
  }

  get #inlineMenu(): HTMLElement | null {
    return this.querySelector<HTMLElement>("[data-inline-menu]");
  }

  #onResize = debounce(() => this.#evaluateLayout(), 100);

  /**
   * Probe the inline menu width in `menu` mode (so it is rendered and
   * measurable), then decide. Touch capability forces drawer regardless.
   */
  #evaluateLayout = () => {
    const inline = this.#inlineMenu;
    if (!inline) {
      // No menu items at all — nothing to switch.
      this.dataset.menuStyle = "menu";
      return;
    }

    const isTouch =
      "ontouchstart" in window ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);

    // Force `menu` while we measure so the inline nav has a real width.
    const previous = this.dataset.menuStyle;
    this.dataset.menuStyle = "menu";
    // Force layout flush so scrollWidth/clientWidth reflect "menu" mode.
    void this.offsetWidth;
    const overflows = inline.scrollWidth > inline.clientWidth + 1;

    const next = isTouch || overflows ? "drawer" : "menu";
    if (next !== previous) {
      this.dataset.menuStyle = next;
    } else {
      this.dataset.menuStyle = previous ?? next;
    }
  };

  #onClick = (event: Event) => {
    const target = event.target as Element | null;
    if (!target) return;

    if (target.closest("[data-menu-trigger]")) {
      this.#openDrawer();
      return;
    }

    if (target.closest("[data-search-trigger]")) {
      this.#openSearch();
      return;
    }

    // Close drawer when a link inside the drawer nav is activated.
    if (target.closest("[data-drawer-menu] a")) {
      this.#closeDrawer();
    }
  };

  #openDrawer() {
    const drawer = this.#drawer as
      | (HTMLElement & { showDialog?: () => void })
      | null;
    drawer?.showDialog?.();
  }

  #closeDrawer() {
    const drawer = this.#drawer as
      | (HTMLElement & { closeDialog?: () => void })
      | null;
    drawer?.closeDialog?.();
  }

  #openSearch() {
    const dialog = this.#searchDialog as
      | (HTMLElement & { showDialog?: () => void })
      | null;
    dialog?.showDialog?.();
  }

  #onDialogOpen = (event: Event) => {
    const id = (event.target as Element | null)?.id;
    if (id === "header-menu-drawer") {
      this.#trigger?.setAttribute("aria-expanded", "true");
    } else if (id === "header-search-dialog") {
      this.#searchTrigger?.setAttribute("aria-expanded", "true");
    }
  };

  #onDialogClose = (event: Event) => {
    const id = (event.target as Element | null)?.id;
    if (id === "header-menu-drawer") {
      const trigger = this.#trigger;
      if (!trigger) return;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    } else if (id === "header-search-dialog") {
      const trigger = this.#searchTrigger;
      if (!trigger) return;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
  };
}

if (!customElements.get("header-component")) {
  customElements.define("header-component", HeaderComponent);
}

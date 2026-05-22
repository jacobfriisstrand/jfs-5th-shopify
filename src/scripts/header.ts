import { Component } from "@theme/component";
import { DialogCloseEvent, DialogOpenEvent } from "@theme/dialog";

/**
 * `<header-component>` wires the hamburger button to the menu drawer and
 * the search trigger to the search dialog. The responsive layout decision
 * (inline menu vs drawer) is owned by CSS (`md:` breakpoint inside
 * `_header-menu.liquid`), not JS, so first paint matches the viewport.
 */
class HeaderComponent extends Component {
  connectedCallback() {
    super.connectedCallback();

    this.addEventListener("click", this.#onClick);
    this.addEventListener(DialogOpenEvent.eventName, this.#onDialogOpen);
    this.addEventListener(DialogCloseEvent.eventName, this.#onDialogClose);
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

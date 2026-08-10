import { Component } from "@theme/component";
import { DialogCloseEvent, DialogOpenEvent } from "@theme/dialog";

/**
 * `<header-component>` wires up:
 *   - the hamburger button → toggles the off-canvas mobile nav drawer
 *     (`<nav data-header-nav>` + `[data-header-nav-backdrop]`). CSS owns
 *     the slide/fade transitions and the desktop reset; this class only
 *     toggles `data-open`, locks body scroll, moves focus, and wires up
 *     dismiss affordances (Escape, backdrop click, link click, resize
 *     to desktop).
 *   - the search trigger → opens the search dialog.
 *   - megamenu triggers → toggle the matching `<dialog-component>` and
 *     keep `aria-expanded` in sync with each dialog's open state.
 */
class HeaderComponent extends Component {
  static #DESKTOP_BREAKPOINT_PX = 768;

  // IDs of megamenu dialog-components currently open. Drives shared
  // backdrop visibility together with the mobile-nav open state.
  #openMegamenus = new Set<string>();

  // Scroll-state tracking (drives the `data-scrolled` glassy header bg).
  #scrollTicking = false;

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener("keydown", this.#onKeyDown);
    window.addEventListener("resize", this.#onResize);
    window.addEventListener("scroll", this.#onScroll, { passive: true });
    // Sync initial scrolled state (e.g. page reload mid-scroll).
    this.#updateScrolledAttr();
    this.#observeHeaderHeight();

    // Portal megamenu dialog-components to <body>. Chrome computes the
    // dialog's containing block against the nearest ancestor scrolling/
    // grid context when the <dialog> is nested deep in the header tree,
    // even with `position: fixed` and no transformed ancestor — leaving
    // the open dialog laid out at the trigger's x-offset instead of the
    // viewport. Moving to <body> bypasses the quirk.
    this.#portalMegamenusToBody();
    this.#portalBackdropToBody();

    // Click + dialog events are listened on `document` (not `this`) so
    // they continue to fire for the portaled megamenu dialog-components,
    // which no longer bubble to this element.
    document.addEventListener("click", this.#onClick);
    document.addEventListener(DialogOpenEvent.eventName, this.#onDialogOpen);
    document.addEventListener(DialogCloseEvent.eventName, this.#onDialogClose);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    document.removeEventListener("keydown", this.#onKeyDown);
    window.removeEventListener("resize", this.#onResize);
    window.removeEventListener("scroll", this.#onScroll);
    document.removeEventListener("click", this.#onClick);
    document.removeEventListener(DialogOpenEvent.eventName, this.#onDialogOpen);
    document.removeEventListener(
      DialogCloseEvent.eventName,
      this.#onDialogClose,
    );

    // Belt-and-suspenders: make sure we never leave the page scroll locked.
    this.#setBodyScrollLock(false);
  }

  #portalMegamenusToBody() {
    const triggers = this.querySelectorAll<HTMLButtonElement>(
      "[data-megamenu-trigger][aria-controls]",
    );
    triggers.forEach((trigger) => {
      const id = trigger.getAttribute("aria-controls");
      if (!id) return;
      const dialog = this.querySelector<HTMLElement>(
        `dialog-component#${CSS.escape(id)}`,
      );
      if (!dialog || dialog.parentElement === document.body) return;
      document.body.appendChild(dialog);
    });
  }

  /**
   * Move the shared backdrop to <body> so it survives when this header
   * is marked `inert` by an open non-modal dialog (inert is inherited;
   * any descendant of an inert element is also inert, which would block
   * clicks on the backdrop).
   */
  #portalBackdropToBody() {
    const backdrop = this.#backdrop;
    if (!backdrop || backdrop.parentElement === document.body) return;
    document.body.appendChild(backdrop);
  }

  get #menuTrigger(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>("[data-menu-trigger]");
  }

  get #nav(): HTMLElement | null {
    return this.querySelector<HTMLElement>("[data-header-nav]");
  }

  get #backdrop(): HTMLElement | null {
    // Queried from `document` because `#portalBackdropToBody` moves the
    // element out of this component subtree on connect.
    return document.querySelector<HTMLElement>("[data-header-nav-backdrop]");
  }

  get #closeButton(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>("[data-menu-close]");
  }

  get #searchTrigger(): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>("[data-search-trigger]");
  }

  get #searchDialog(): HTMLElement | null {
    return this.querySelector<HTMLElement>(
      "dialog-component#header-search-dialog",
    );
  }

  get #isMobileNavOpen(): boolean {
    return this.#nav?.getAttribute("data-open") === "true";
  }

  #onClick = (event: Event) => {
    const target = event.target as Element | null;
    if (!target) return;

    if (target.closest("[data-menu-trigger]")) {
      this.#toggleMobileNav();
      return;
    }

    if (
      target.closest("[data-menu-close]") ||
      target.closest("[data-header-nav-backdrop]")
    ) {
      // Close everything the backdrop is shared with: any open megamenus
      // first (so focus restoration runs), then the mobile drawer.
      this.#closeAllMegamenus();
      this.#closeMobileNav();
      return;
    }

    if (target.closest("[data-search-trigger]")) {
      this.#openSearch();
      return;
    }

    const megamenuTrigger = target.closest<HTMLButtonElement>(
      "[data-megamenu-trigger]",
    );
    if (megamenuTrigger) {
      this.#toggleMegamenu(megamenuTrigger);
      return;
    }

    const megamenuBack = target.closest<HTMLElement>("[data-megamenu-back]");
    if (megamenuBack) {
      const dialogComponent = megamenuBack.closest<
        HTMLElement & { closeDialog?: () => void }
      >("dialog-component");
      dialogComponent?.closeDialog?.();
      return;
    }

    // Close mobile nav (and any open megamenu) when a link inside it is
    // activated. Includes links inside megamenu dialog-components, which
    // are portaled to <body> and so live outside `[data-header-nav]`.
    const linkInNav = target.closest("[data-header-nav] a");
    const linkInMegamenu = target.closest("dialog.header-menu-megamenu a");
    if (linkInNav || linkInMegamenu) {
      const openMegamenu = target.closest<
        HTMLElement & { closeDialog?: () => void }
      >("dialog-component");
      openMegamenu?.closeDialog?.();
      this.#closeMobileNav();
    }
  };

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && this.#isMobileNavOpen) {
      event.preventDefault();
      this.#closeMobileNav();
    }
  };

  #onResize = () => {
    if (
      this.#isMobileNavOpen &&
      window.innerWidth >= HeaderComponent.#DESKTOP_BREAKPOINT_PX
    ) {
      // Skip the transition + focus restore on resize — desktop layout owns
      // the visibility now, so just clean up state.
      this.#closeMobileNav({ restoreFocus: false });
    }
  };

  #onScroll = () => {
    if (this.#scrollTicking) return;
    this.#scrollTicking = true;
    requestAnimationFrame(() => {
      this.#scrollTicking = false;
      this.#updateScrolledAttr();
    });
  };

  #updateScrolledAttr() {
    const group = document.getElementById("header-group");
    if (!group) return;
    if (window.scrollY > 0) {
      group.setAttribute("data-scrolled", "");
    } else {
      group.removeAttribute("data-scrolled");
    }
  }

  /** Keep --header-height in sync with header, --announcement-bar-height with bar. */
  #observeHeaderHeight() {
    const group = document.getElementById("header-group");
    const bar = document.querySelector<HTMLElement>(".announcement-bar aside");
    if (!group) return;

    const update = () => {
      document.documentElement.style.setProperty(
        "--header-height",
        `${group.offsetHeight}px`,
      );
      if (bar) {
        document.documentElement.style.setProperty(
          "--announcement-bar-height",
          `${bar.offsetHeight}px`,
        );
      }
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(group);
    if (bar) ro.observe(bar);
  }

  #toggleMobileNav() {
    if (this.#isMobileNavOpen) {
      this.#closeMobileNav();
    } else {
      this.#openMobileNav();
    }
  }

  #openMobileNav() {
    const nav = this.#nav;
    const trigger = this.#menuTrigger;
    if (!nav || !trigger) return;

    nav.setAttribute("data-open", "true");
    trigger.setAttribute("aria-expanded", "true");
    trigger.setAttribute(
      "aria-label",
      trigger.dataset.closeLabel ?? "Close menu",
    );

    document
      .getElementById("header-group")
      ?.setAttribute("data-mobile-nav-open", "");

    this.#showBackdrop();
    this.#setBodyScrollLock(true);

    // Move focus into the drawer so keyboard users land somewhere sensible.
    requestAnimationFrame(() => {
      this.#closeButton?.focus({ preventScroll: true });
    });
  }

  #closeMobileNav(options: { restoreFocus?: boolean } = {}) {
    const { restoreFocus = true } = options;
    const nav = this.#nav;
    const trigger = this.#menuTrigger;
    if (!nav || !trigger) return;
    if (!this.#isMobileNavOpen) return;

    nav.setAttribute("data-open", "false");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute(
      "aria-label",
      trigger.dataset.openLabel ?? "Open menu",
    );

    document
      .getElementById("header-group")
      ?.removeAttribute("data-mobile-nav-open");

    this.#maybeHideBackdrop();
    this.#setBodyScrollLock(false);

    if (restoreFocus) {
      trigger.focus({ preventScroll: true });
    }
  }

  #showBackdrop() {
    const backdrop = this.#backdrop;
    if (!backdrop) return;
    backdrop.hidden = false;
    // Force a frame so the transition can run from opacity:0 → 1.
    requestAnimationFrame(() => backdrop.setAttribute("data-open", "true"));
  }

  #maybeHideBackdrop() {
    // Backdrop is shared between the mobile drawer and any open megamenus.
    // Only hide it once nothing wants it anymore.
    if (this.#isMobileNavOpen) return;
    if (this.#openMegamenus.size > 0) return;

    const backdrop = this.#backdrop;
    if (!backdrop) return;
    backdrop.setAttribute("data-open", "false");
    const cleanup = () => {
      if (backdrop.getAttribute("data-open") === "false") {
        backdrop.hidden = true;
      }
      backdrop.removeEventListener("transitionend", cleanup);
    };
    backdrop.addEventListener("transitionend", cleanup);
  }

  #closeAllMegamenus() {
    if (this.#openMegamenus.size === 0) return;
    // Snapshot — dialog close handlers mutate the set.
    for (const id of [...this.#openMegamenus]) {
      const dialog = document.querySelector<
        HTMLElement & { closeDialog?: () => void }
      >(`dialog-component#${CSS.escape(id)}`);
      dialog?.closeDialog?.();
    }
  }

  #setBodyScrollLock(locked: boolean) {
    // Matches the `html[scroll-lock]` rule in `base.css` so we share the
    // same lock mechanism with the existing `<dialog>` drawers.
    if (locked) {
      document.documentElement.setAttribute("scroll-lock", "");
    } else {
      document.documentElement.removeAttribute("scroll-lock");
    }
  }

  #openSearch() {
    const dialog = this.#searchDialog as
      | (HTMLElement & { showDialog?: () => void })
      | null;
    dialog?.showDialog?.();
  }

  #toggleMegamenu(trigger: HTMLButtonElement) {
    const id = trigger.getAttribute("aria-controls");
    if (!id) return;
    // Megamenu dialog-components are portaled to <body> in
    // `#portalMegamenusToBody`, so query the whole document.
    const dialog = document.querySelector<
      HTMLElement & { toggleDialog?: () => void }
    >(`dialog-component#${CSS.escape(id)}`);
    dialog?.toggleDialog?.();
  }

  #onDialogOpen = (event: Event) => {
    const id = (event.target as Element | null)?.id;
    if (!id) return;
    if (id === "header-search-dialog") {
      this.#searchTrigger?.setAttribute("aria-expanded", "true");
      return;
    }
    const trigger = this.#megamenuTriggerFor(id);
    if (!trigger) return; // Not one of our dialogs (e.g. cart drawer).
    trigger.setAttribute("aria-expanded", "true");
    this.#openMegamenus.add(id);
    this.#showBackdrop();
    this.#syncMegamenuOpenAttr();
  };

  #onDialogClose = (event: Event) => {
    const id = (event.target as Element | null)?.id;
    if (!id) return;
    if (id === "header-search-dialog") {
      const trigger = this.#searchTrigger;
      if (!trigger) return;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
      return;
    }
    const trigger = this.#megamenuTriggerFor(id);
    if (!trigger) return; // Not one of our dialogs.
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
    this.#openMegamenus.delete(id);
    this.#maybeHideBackdrop();
    this.#syncMegamenuOpenAttr();
  };

  #syncMegamenuOpenAttr() {
    const group = document.getElementById("header-group");
    if (!group) return;
    if (this.#openMegamenus.size > 0) {
      group.setAttribute("data-megamenu-open", "");
    } else {
      group.removeAttribute("data-megamenu-open");
    }
  }

  #megamenuTriggerFor(id: string): HTMLButtonElement | null {
    return this.querySelector<HTMLButtonElement>(
      `[data-megamenu-trigger][aria-controls="${CSS.escape(id)}"]`,
    );
  }
}

if (!customElements.get("header-component")) {
  customElements.define("header-component", HeaderComponent);
}

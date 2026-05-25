import { ThemeEvents } from "@theme/events";

const DEFAULT_DURATION = 4000;
const MAX_VISIBLE_TOASTS = 3;

type ToastVariant = "success" | "error" | "info";

type ToastDetail = {
  message: string;
  variant?: ToastVariant;
  duration?: number;
};

class ToastNotifications extends HTMLElement {
  #abortController = new AbortController();
  #reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  connectedCallback() {
    const { signal } = this.#abortController;

    document.addEventListener(
      ThemeEvents.toast,
      this.#onToast as EventListener,
      {
        signal,
      },
    );
    document.addEventListener("keydown", this.#onKeyDown, { signal });
  }

  disconnectedCallback() {
    this.#abortController.abort();
  }

  #onToast = (event: Event) => {
    const detail = (event as Event & { detail?: ToastDetail }).detail;
    if (!detail?.message) return;
    this.#show(detail);
  };

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;

    const list = this.#list;
    if (!list) return;

    const latest = list.lastElementChild;
    if (!(latest instanceof HTMLElement)) return;

    this.#dismiss(latest);
  };

  #show(detail: ToastDetail) {
    const list = this.#list;
    const template = this.#template;
    if (!list || !template) return;

    while (list.children.length >= MAX_VISIBLE_TOASTS) {
      const oldest = list.firstElementChild;
      if (!(oldest instanceof HTMLElement)) break;
      this.#dismiss(oldest, { immediate: true });
    }

    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const item = fragment.querySelector<HTMLElement>("[data-toast-item]");
    const message = fragment.querySelector<HTMLElement>("[data-toast-message]");
    const closeButton =
      fragment.querySelector<HTMLButtonElement>("[data-toast-close]");
    if (!item || !message || !closeButton) return;

    message.textContent = detail.message;

    const variant = detail.variant ?? "info";
    if (variant === "error") {
      item.setAttribute("role", "alert");
      item.setAttribute("aria-live", "assertive");
      item.dataset.variant = "error";
    } else {
      item.setAttribute("role", "status");
      item.setAttribute("aria-live", "polite");
      item.dataset.variant = variant;
    }

    closeButton.addEventListener("click", () => this.#dismiss(item));

    const duration = detail.duration ?? DEFAULT_DURATION;
    const timeoutId = window.setTimeout(() => this.#dismiss(item), duration);
    item.dataset.timeoutId = String(timeoutId);

    list.appendChild(fragment);

    if (this.#reducedMotionQuery.matches) {
      item.style.opacity = "1";
      item.style.transform = "none";
      return;
    }

    requestAnimationFrame(() => {
      item.style.opacity = "1";
      item.style.transform = "none";
    });
  }

  #dismiss(item: HTMLElement, options?: { immediate?: boolean }) {
    const timeoutId = Number(item.dataset.timeoutId);
    if (Number.isFinite(timeoutId) && timeoutId > 0) {
      clearTimeout(timeoutId);
    }

    if (options?.immediate || this.#reducedMotionQuery.matches) {
      item.remove();
      return;
    }

    item.style.opacity = "0";
    item.style.transform = "translateY(8px)";

    const remove = () => {
      item.removeEventListener("transitionend", remove);
      item.remove();
    };

    item.addEventListener("transitionend", remove);
    window.setTimeout(remove, 220);
  }

  get #list() {
    return this.querySelector<HTMLOListElement>("[data-toast-list]");
  }

  get #template() {
    return this.querySelector<HTMLTemplateElement>("[data-toast-template]");
  }
}

if (!customElements.get("toast-notifications")) {
  customElements.define("toast-notifications", ToastNotifications);
}

import { ThemeEvents } from "@theme/events";

const DEFAULT_DURATION = 4000;
const MAX_VISIBLE_TOASTS = 3;
const ENTER_MS = 180;
const EXIT_MS = 180;

type ToastVariant = "success" | "error" | "info";

type ToastDetail = {
  message: string;
  variant?: ToastVariant;
  duration?: number;
};

class ToastNotifications extends HTMLElement {
  #reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  #active = new Map<HTMLElement, number>();

  connectedCallback() {
    document.addEventListener(
      ThemeEvents.toast,
      this.#onToast as EventListener,
    );
    document.addEventListener("keydown", this.#onKeyDown);
  }

  disconnectedCallback() {
    document.removeEventListener(
      ThemeEvents.toast,
      this.#onToast as EventListener,
    );
    document.removeEventListener("keydown", this.#onKeyDown);
  }

  #onToast = (event: Event) => {
    const detail = (event as Event & { detail?: ToastDetail }).detail;
    if (!detail?.message) return;
    this.#show(detail);
  };

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const latest = this.#list?.lastElementChild;
    if (!(latest instanceof HTMLElement)) return;
    this.#dismiss(latest);
  };

  #show(detail: ToastDetail) {
    const list = this.#list;
    const template = this.#template;
    if (!list || !template) return;

    const toast = this.#createToast(detail, template);
    if (!toast) return;

    const motionOK = this.#motionOK;

    while (list.children.length >= MAX_VISIBLE_TOASTS) {
      const oldest = list.firstElementChild;
      if (!(oldest instanceof HTMLElement)) break;
      this.#dismiss(oldest, { immediate: true });
    }

    if (list.children.length && motionOK) {
      this.#flipIn(toast, list);
    } else {
      list.appendChild(toast);
    }

    const duration = detail.duration ?? DEFAULT_DURATION;
    this.#playLifecycle(toast, duration);

    if (!motionOK) {
      toast.style.opacity = "1";
      toast.style.transform = "none";
    }
  }

  #createToast(detail: ToastDetail, template: HTMLTemplateElement) {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const item = fragment.querySelector("[data-toast-item]");
    const message = fragment.querySelector("[data-toast-message]");
    const closeButton = fragment.querySelector("[data-toast-close]");
    if (!(item instanceof HTMLOutputElement)) return null;
    if (!(message instanceof HTMLElement)) return null;
    if (!(closeButton instanceof HTMLButtonElement)) return null;

    message.textContent = detail.message;

    const variant = detail.variant ?? "info";
    if (variant === "error") {
      item.setAttribute("role", "alert");
      item.setAttribute("aria-live", "assertive");
      item.style.borderColor =
        "color-mix(in oklab, currentColor 35%, transparent)";
    } else {
      item.setAttribute("role", "status");
      item.setAttribute("aria-live", "polite");
    }

    closeButton.addEventListener("click", () => this.#dismiss(item));

    return item;
  }

  #flipIn(toast: HTMLElement, list: HTMLElement) {
    const first = list.offsetHeight;
    list.appendChild(toast);
    const last = list.offsetHeight;
    const invert = last - first;
    if (!invert) return;

    list.animate(
      [
        { transform: `translateY(${invert}px)` },
        { transform: "translateY(0)" },
      ],
      {
        duration: 150,
        easing: "ease-out",
      },
    );
  }

  #playLifecycle(item: HTMLElement, duration: number) {
    if (this.#motionOK) {
      item.animate(
        [
          { opacity: 0, transform: "translateY(12px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: ENTER_MS,
          easing: "ease-out",
          fill: "forwards",
        },
      );
    }

    const timeoutId = window.setTimeout(() => this.#dismiss(item), duration);
    this.#active.set(item, timeoutId);
  }

  #dismiss(item: HTMLElement, options?: { immediate?: boolean }) {
    const timeoutId = this.#active.get(item);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.#active.delete(item);
    }

    if (options?.immediate || !this.#motionOK) {
      item.remove();
      return;
    }

    const animation = item.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(8px)" },
      ],
      {
        duration: EXIT_MS,
        easing: "ease-in",
        fill: "forwards",
      },
    );

    animation.finished.finally(() => {
      item.remove();
    });
  }

  get #list() {
    return this.querySelector<HTMLElement>("[data-toast-list]");
  }

  get #template() {
    return this.querySelector<HTMLTemplateElement>("[data-toast-template]");
  }

  get #motionOK() {
    return !this.#reducedMotionQuery.matches;
  }
}

if (!customElements.get("toast-notifications")) {
  customElements.define("toast-notifications", ToastNotifications);
}

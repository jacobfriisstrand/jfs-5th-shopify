import { Component } from "@theme/component";
import { DialogOpenEvent } from "@theme/dialog";
import { debounce } from "@theme/scheduling";

interface PredictiveSearchRefs {
  input: HTMLInputElement;
  results: HTMLElement;
}

/**
 * `<predictive-search>` powers the header search dialog.
 *
 * - Debounces input (~150ms) and fetches the `predictive-search` section
 *   markup via `/search/suggest?q=…&section_id=predictive-search`.
 * - Replaces the results region with the `[data-predictive-search-content]`
 *   block returned by the section, leaving the surrounding listbox shell
 *   intact so its `id`/`role`/`aria-label` remain stable.
 * - Manages keyboard navigation: ArrowUp/ArrowDown move
 *   `aria-activedescendant` across `[data-predictive-search-result]`
 *   options; Enter activates the current option; Escape is handled by
 *   `<dialog-component>` (closes the dialog).
 * - Aborts in-flight fetches when a new query starts.
 */
class PredictiveSearch extends Component {
  declare refs: PredictiveSearchRefs;
  requiredRefs = ["input", "results"];

  #abort: AbortController | null = null;
  #activeIndex = -1;

  connectedCallback() {
    super.connectedCallback();

    this.refs.input.addEventListener("input", this.#onInput);
    this.refs.input.addEventListener("keydown", this.#onKeyDown);

    // Reset / refocus when the parent dialog opens.
    const dialog = this.closest("dialog-component");
    dialog?.addEventListener(
      DialogOpenEvent.eventName,
      this.#onDialogOpen as EventListener,
    );
  }

  #onDialogOpen = () => {
    // Defer focus until the open animation has registered the modal layer.
    requestAnimationFrame(() => this.refs.input?.focus());
  };

  #onInput = debounce(() => {
    const q = this.refs.input.value.trim();
    this.#runSearch(q);
  }, 150);

  async #runSearch(q: string) {
    this.#abort?.abort();
    this.#abort = new AbortController();

    if (!q) {
      this.refs.results.innerHTML = "";
      this.#syncCombobox(0);
      return;
    }

    const url = new URL("/search/suggest", window.location.origin);
    url.searchParams.set("q", q);
    url.searchParams.set("resources[type]", "product");
    url.searchParams.set("resources[limit]", "6");
    url.searchParams.set("section_id", "predictive-search");

    try {
      const res = await fetch(url.toString(), { signal: this.#abort.signal });
      if (!res.ok) throw new Error(`Search request failed: ${res.status}`);

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const content = doc.querySelector("[data-predictive-search-content]");

      this.refs.results.innerHTML = content?.innerHTML ?? "";
      this.#activeIndex = -1;
      this.#syncCombobox(this.#options.length);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      // Fail silently in the UI; log for diagnosis.
      console.warn("[predictive-search]", error);
    }
  }

  get #options(): HTMLElement[] {
    return Array.from(
      this.refs.results.querySelectorAll<HTMLElement>(
        "[data-predictive-search-result]",
      ),
    );
  }

  #syncCombobox(optionCount: number) {
    const expanded = optionCount > 0;
    this.refs.input.setAttribute("aria-expanded", String(expanded));
    if (!expanded) {
      this.refs.input.removeAttribute("aria-activedescendant");
    }
  }

  #onKeyDown = (event: KeyboardEvent) => {
    const options = this.#options;
    if (options.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.#setActive((this.#activeIndex + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        this.#setActive(
          this.#activeIndex <= 0 ? options.length - 1 : this.#activeIndex - 1,
        );
        break;
      case "Enter": {
        if (this.#activeIndex < 0) return; // let form submit normally
        event.preventDefault();
        const link = options[this.#activeIndex]?.querySelector("a");
        link?.click();
        break;
      }
      case "Home":
        event.preventDefault();
        this.#setActive(0);
        break;
      case "End":
        event.preventDefault();
        this.#setActive(options.length - 1);
        break;
    }
  };

  #setActive(index: number) {
    const options = this.#options;
    if (options.length === 0) return;

    this.#activeIndex = index;
    options.forEach((opt, i) => {
      const active = i === index;
      opt.setAttribute("aria-selected", String(active));
      opt.querySelector("a")?.setAttribute("aria-selected", String(active));
    });

    const active = options[index];
    if (active?.id) {
      this.refs.input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    }
  }
}

if (!customElements.get("predictive-search")) {
  customElements.define("predictive-search", PredictiveSearch);
}

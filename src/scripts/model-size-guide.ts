/**
 * Model size guide — size filter for model photo cards.
 *
 * Wraps the `model-size-guide` section. The section renders one
 * `<article data-model-size="…">` per `model_size_guide` metaobject entry
 * plus a radio chip group (one per distinct size, plus "All sizes"). Picking
 * a size hides every card that does not carry that size.
 *
 * The live count element ([data-model-size-count]) is announced via
 * `role="status"` and re-labelled from `data-count-one` / `data-count-other`
 * (the latter holds a `__COUNT__` placeholder). The no-results paragraph
 * ([data-model-size-empty]) is shown when the selected size matches nothing.
 *
 * The radios use `sr-only` inputs (not `display: none`) so the chips stay
 * keyboard-focusable; the checked/focus states are styled on the sibling
 * label span via Tailwind `peer-*` variants in the section markup.
 */
class ModelSizeGuide extends HTMLElement {
  connectedCallback(): void {
    const cards = Array.from(
      this.querySelectorAll<HTMLElement>("[data-model-size]"),
    );
    const radios = Array.from(
      this.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    );
    const count = this.querySelector<HTMLElement>("[data-model-size-count]");
    const empty = this.querySelector<HTMLElement>("[data-model-size-empty]");
    if (cards.length === 0 || radios.length === 0) return;

    const apply = (size: string): void => {
      let visible = 0;
      for (const card of cards) {
        const match = size === "" || card.dataset.modelSize === size;
        card.hidden = !match;
        if (match) visible += 1;
      }

      if (count) {
        const label =
          visible === 1 ? count.dataset.countOne : count.dataset.countOther;
        if (label)
          count.textContent = label.replace("__COUNT__", String(visible));
      }
      if (empty) empty.hidden = visible !== 0;
    };

    for (const radio of radios) {
      radio.addEventListener("change", () => {
        if (radio.checked) apply(radio.value);
      });
    }
  }
}

if (!customElements.get("model-size-guide")) {
  customElements.define("model-size-guide", ModelSizeGuide);
}

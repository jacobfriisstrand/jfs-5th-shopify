import { Component } from "@theme/component";
import { CartAddEvent, ThemeEvents, ToastEvent } from "@theme/events";

/**
 * `<participant-registration-form>` — renders one participant fieldset per
 * ticket and batch-adds them as separate cart line items (quantity 1 each),
 * each carrying its participant's line-item properties.
 *
 * Server-rendered contract (see `snippets/participant-registration.liquid`):
 *
 *  - `data-mode`: `"individual"` or `"team"`. Both render a trigger button
 *    that opens a dialog; `team` also shows a team-size stepper driving N
 *    fieldsets.
 *  - `data-variant-id`: the currently selected variant id.
 *  - `data-product-id`: the product id, forwarded on the cart-update event.
 *  - A single `<template>` holding one participant `<details>` whose inputs
 *    carry `data-property` (the line-item property key). The element clones the
 *    template N times, rewriting `id`/`for` to stay unique.
 *
 * Validation: the form is `novalidate`; the element checks each input's native
 * validity (required) on submit, opening any collapsed participant that has an
 * invalid field before focusing it.
 */
export class ParticipantRegistrationForm extends Component {
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      ThemeEvents.quantitySelectorUpdate,
      this.#onQuantity as EventListener,
    );
    this.addEventListener("click", this.#onClick);
    // Participants render when the trigger opens the dialog (both modes).
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      ThemeEvents.quantitySelectorUpdate,
      this.#onQuantity as EventListener,
    );
    this.removeEventListener("click", this.#onClick);
  }

  get #dialog() {
    return this.querySelector<
      HTMLElement & {
        showDialog?: () => void;
        closeDialog?: () => Promise<void>;
      }
    >("dialog-component");
  }

  #onClick = (event: Event) => {
    const target = event.target as Element | null;
    if (!target?.closest("[data-register-trigger]")) return;
    this.#syncParticipants(this.#quantity());
    this.#dialog?.showDialog?.();
  };

  #quantity(): number {
    const input = this.querySelector<HTMLInputElement>(
      "quantity-selector-component input",
    );
    const value = input ? Number.parseInt(input.value, 10) : 1;
    return Number.isFinite(value) && value >= 1 ? value : 1;
  }

  #onQuantity = () => {
    this.#syncParticipants(this.#quantity());
  };

  #syncParticipants(count: number) {
    const container = this.querySelector<HTMLElement>("[data-participants]");
    const template = this.querySelector<HTMLTemplateElement>("template");
    if (!container || !template) return;

    const current = container.querySelectorAll("details").length;
    if (count === current) return;

    if (count > current) {
      for (let i = current; i < count; i++) {
        container.append(this.#cloneParticipant(template, i));
      }
    } else {
      const details = container.querySelectorAll("details");
      for (let i = current - 1; i >= count; i--) {
        details[i]?.remove();
      }
    }
  }

  #cloneParticipant(template: HTMLTemplateElement, index: number): HTMLElement {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const details = fragment.querySelector("details");
    if (!details) return fragment.firstElementChild as HTMLElement;

    const suffix = `-${index}`;

    // Renumber the participant and de-duplicate id/for/aria-describedby.
    const number = details.querySelector<HTMLElement>(
      "[data-participant-number]",
    );
    if (number) number.textContent = String(index + 1);

    for (const el of details.querySelectorAll<HTMLElement>("[id]")) {
      el.id = `${el.id}${suffix}`;
    }
    for (const el of details.querySelectorAll<HTMLElement>(
      "label[for], [aria-describedby]",
    )) {
      for (const attr of ["for", "aria-describedby"]) {
        const value = el.getAttribute(attr);
        if (value) el.setAttribute(attr, `${value}${suffix}`);
      }
    }

    // All participants start collapsed.
    return details;
  }

  handleSubmit(event: Event) {
    event.preventDefault();
    void this.#submit();
  }

  async #submit() {
    if (this.dataset.submitting === "true") return;
    if (!this.#validate()) return;

    const items = this.#buildItems();
    if (items.length === 0) return;

    this.dataset.submitting = "true";
    this.#setBusy(true);

    try {
      const response = await fetch(Theme.routes.cart_add_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ items }),
      });
      const data = (await response.json()) as {
        status?: number;
        message?: string;
        description?: string;
        sections?: Record<string, string>;
        product_title?: string;
        items?: Array<{ product_title?: string }>;
      };

      if (!response.ok || data.status) {
        this.dispatchEvent(
          new ToastEvent({
            message: data.message || Theme.translations.cart_add_failed,
            variant: "error",
          }),
        );
        return;
      }

      const messageTemplate = Theme.translations.cart_added;
      const productTitle =
        this.dataset.productTitle ||
        data.items?.[0]?.product_title ||
        data.product_title ||
        "";
      const successMessage = messageTemplate.includes("__PRODUCT_TITLE__")
        ? messageTemplate.replace("__PRODUCT_TITLE__", productTitle)
        : messageTemplate;
      this.dispatchEvent(
        new ToastEvent({ message: successMessage, variant: "success" }),
      );
      this.dispatchEvent(
        new CartAddEvent({}, this.id, {
          source: "participant-registration-form",
          itemCount: items.length,
          productId: this.dataset.productId,
          sections: data.sections,
        }),
      );
      void this.#dialog?.closeDialog?.();
    } catch {
      this.dispatchEvent(
        new ToastEvent({
          message: Theme.translations.cart_add_failed,
          variant: "error",
        }),
      );
    } finally {
      this.dataset.submitting = "";
      this.#setBusy(false);
    }
  }

  #buildItems() {
    const variantId = Number(this.dataset.variantId);
    const participants = this.querySelectorAll("details");
    const items: Array<{
      id: number;
      quantity: number;
      properties: Record<string, string>;
    }> = [];

    participants.forEach((details, index) => {
      const properties: Record<string, string> = {};
      details
        .querySelectorAll<HTMLInputElement>("[data-property]")
        .forEach((input) => {
          properties[input.dataset.property ?? ""] = input.value.trim();
        });

      // Stable identifiers for cart-line display and de-duplication.
      const name =
        details.querySelector<HTMLInputElement>('[data-role="name"]');
      const email = details.querySelector<HTMLInputElement>(
        '[data-role="email"]',
      );
      if (name?.value.trim()) properties["_name"] = name.value.trim();
      if (email?.value.trim()) properties["_email"] = email.value.trim();

      // Unique per participant so Shopify never merges two identical lines.
      properties["_participant"] = String(index + 1);
      if (this.dataset.mode === "team") {
        properties["_team_size"] = String(participants.length);
      }

      items.push({ id: variantId, quantity: 1, properties });
    });

    return items;
  }

  #validate(): boolean {
    let firstInvalid: HTMLInputElement | null = null;

    for (const details of this.querySelectorAll("details")) {
      // Native constraints (required). Open the participant so the user
      // sees exactly which field is missing before we focus it.
      for (const input of details.querySelectorAll<HTMLInputElement>("input")) {
        if (input.validity.valid) {
          input.removeAttribute("aria-invalid");
        } else {
          input.setAttribute("aria-invalid", "true");
          details.open = true;
          firstInvalid ??= input;
        }
      }
    }

    if (firstInvalid) {
      firstInvalid.focus();
      if (!firstInvalid.validity.valid) firstInvalid.reportValidity();
      return false;
    }
    return true;
  }

  #setBusy(busy: boolean) {
    const button = this.querySelector<HTMLButtonElement>(
      '[ref="submitButton"]',
    );
    if (!button) return;
    button.disabled = busy;
    if (busy) {
      button.dataset.loading = "";
      button.setAttribute("aria-busy", "true");
    } else {
      delete button.dataset.loading;
      button.removeAttribute("aria-busy");
    }
  }
}

if (!customElements.get("participant-registration-form")) {
  customElements.define(
    "participant-registration-form",
    ParticipantRegistrationForm,
  );
}

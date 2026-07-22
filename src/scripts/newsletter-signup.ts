/**
 * Newsletter signup — Klaviyo client-side subscription.
 *
 * Progressive enhancement: wraps a server-rendered form and intercepts
 * submission to use Klaviyo's CORS-enabled client API for inline feedback.
 * Falls back to native form POST if JavaScript is disabled.
 */
class NewsletterSignup extends HTMLElement {
  connectedCallback() {
    const form = this.querySelector<HTMLFormElement>("form");
    if (!form) return;

    const publicKey = this.dataset.publicKey;
    const listId = this.dataset.listId;
    const successMessage =
      this.dataset.successMessage || "Thanks for subscribing!";
    const customSource = this.dataset.customSource || undefined;

    const messageEl = this.querySelector<HTMLElement>(
      "[data-newsletter-signup-message]",
    );

    if (!publicKey || !listId) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const emailInput = form.querySelector<HTMLInputElement>(
        'input[type="email"]',
      );
      const consentCheckbox = form.querySelector<HTMLInputElement>(
        'input[name="consent"]',
      );
      const submitBtn = form.querySelector<HTMLButtonElement>(
        'button[type="submit"]',
      );

      const email = emailInput?.value.trim();
      if (!email || !consentCheckbox?.checked) return;

      if (submitBtn) submitBtn.disabled = true;
      if (messageEl) messageEl.classList.add("hidden");

      try {
        const attributes: Record<string, unknown> = {
          profile: {
            data: {
              type: "profile",
              attributes: {
                email,
                subscriptions: {
                  email: {
                    marketing: {
                      consent: "SUBSCRIBED",
                    },
                  },
                },
              },
            },
          },
        };

        if (customSource) {
          attributes.custom_source = customSource;
        }

        const body = {
          data: {
            type: "subscription",
            attributes,
            relationships: {
              list: {
                data: {
                  type: "list",
                  id: listId,
                },
              },
            },
          },
        };

        const resp = await fetch(
          `https://a.klaviyo.com/client/subscriptions/?company_id=${encodeURIComponent(publicKey)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              revision: "2026-04-15",
            },
            body: JSON.stringify(body),
          },
        );

        if (messageEl) {
          if (resp.ok) {
            messageEl.textContent = successMessage;
            messageEl.classList.remove("hidden", "text-red-600");
            messageEl.classList.add("text-green-600");
            form.reset();
          } else {
            let detail = this.#errorText();
            try {
              const data = await resp.json();
              detail = data.errors?.[0]?.detail || detail;
            } catch {
              // use fallback
            }
            messageEl.textContent = detail;
            messageEl.classList.remove("hidden", "text-green-600");
            messageEl.classList.add("text-red-600");
          }
        }
      } catch {
        if (messageEl) {
          messageEl.textContent = this.#errorText();
          messageEl.classList.remove("hidden", "text-green-600");
          messageEl.classList.add("text-red-600");
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  #errorText(): string {
    return this.dataset.errorText || "Something went wrong. Please try again.";
  }
}

if (!customElements.get("newsletter-signup")) {
  customElements.define("newsletter-signup", NewsletterSignup);
}

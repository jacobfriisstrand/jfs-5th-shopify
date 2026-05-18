/**
 * <swiper-carousel> — progressive-enhancement carousel that wraps a `<ul>` of `<li>`
 * items and morphs it into a Swiper Element on viewport intersection.
 *
 * The element is content-agnostic at the DOM level: it moves child `<li>`
 * nodes into `<swiper-slide>` elements (preserving listeners and image
 * fetches). What gets RENDERED inside each `<li>` is decided by the caller —
 * see `snippets/carousel.liquid`, which switches on a `type` parameter
 * (`product`, future: `article`, …) and renders the matching card snippet.
 *
 * Threshold logic (e.g. "only enhance when count >= 4") also lives in the
 * caller's Liquid — the element is purely presentational.
 *
 * The snippet may also render external prev/next `<button>` elements inside
 * the host (marked with `data-carousel-prev` / `data-carousel-next`). When
 * present, they are wired up as Swiper's navigation controls and the
 * built-in shadow-DOM arrows are suppressed.
 *
 * Configuration (data-attrs):
 *   - `data-bundle-url` (required) — URL of the Swiper Element bundle.
 *   - `data-slides-per-view` (optional, default `"1.2"`) — Swiper
 *     `slidesPerView` at the smallest breakpoint.
 *   - `data-breakpoints` (optional, JSON) — Swiper `breakpoints` object.
 *     Default: 640→2.5, 1024→3.5, 1280→4.5 (each breakpoint shows a
 *     half-card peek so the carousel-ness is visible).
 */

import { loadSwiper } from "@theme/swiper-loader";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface HTMLElementTagNameMap {
    "swiper-carousel": SwiperCarousel;
  }
}

const DEFAULT_SLIDES_PER_VIEW = "1.2";
const DEFAULT_BREAKPOINTS = {
  "640": { slidesPerView: 2.5, spaceBetween: 16 },
  "1024": { slidesPerView: 3.5, spaceBetween: 20 },
  "1280": { slidesPerView: 4.5, spaceBetween: 24 },
};

function parseSlidesPerView(raw: string): number | "auto" {
  if (raw === "auto") return "auto";
  const n = Number(raw);
  return Number.isFinite(n) ? n : 1;
}

class SwiperCarousel extends HTMLElement {
  private observer: IntersectionObserver | null = null;
  private upgraded = false;

  connectedCallback() {
    const src = this.getAttribute("data-bundle-url");
    if (!src) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.observer?.disconnect();
            void this.upgrade(src);
            break;
          }
        }
      },
      { rootMargin: "200px 0px" },
    );
    this.observer.observe(this);
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }

  private async upgrade(src: string) {
    if (this.upgraded) return;
    this.upgraded = true;

    await loadSwiper(src);

    const list = this.querySelector(":scope > ul");
    if (!(list instanceof HTMLUListElement)) return;

    const items = Array.from(list.children).filter(
      (el): el is HTMLLIElement => el instanceof HTMLLIElement,
    );
    if (items.length === 0) return;

    const slidesPerView =
      this.getAttribute("data-slides-per-view") ?? DEFAULT_SLIDES_PER_VIEW;
    const breakpointsRaw = this.getAttribute("data-breakpoints");
    const breakpoints = breakpointsRaw
      ? JSON.parse(breakpointsRaw)
      : DEFAULT_BREAKPOINTS;

    const prevEl = this.querySelector<HTMLElement>("[data-carousel-prev]");
    const nextEl = this.querySelector<HTMLElement>("[data-carousel-next]");
    const hasExternalNav = prevEl !== null && nextEl !== null;

    const container = document.createElement("swiper-container");
    // Defer Swiper's own init so we can pass element references for
    // external navigation, then call `initialize()` manually.
    container.setAttribute("init", "false");

    for (const li of items) {
      const slide = document.createElement("swiper-slide");
      // Move children rather than innerHTML to preserve event listeners and
      // avoid re-parsing image markup.
      while (li.firstChild) slide.appendChild(li.firstChild);
      container.appendChild(slide);
    }

    list.replaceWith(container);

    Object.assign(container, {
      slidesPerView: parseSlidesPerView(slidesPerView),
      spaceBetween: 16,
      breakpoints,
      keyboard: true,
      a11y: true,
      navigation: hasExternalNav ? { prevEl, nextEl } : false,
    });

    // @ts-expect-error — `initialize` is added by the swiper-element bundle.
    container.initialize();
    this.dataset.upgraded = "true";
  }
}

if (!customElements.get("swiper-carousel")) {
  customElements.define("swiper-carousel", SwiperCarousel);
}

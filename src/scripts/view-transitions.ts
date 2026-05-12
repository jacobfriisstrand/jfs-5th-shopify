/**
 * @theme/view-transitions
 *
 * Wires up *typed* cross-document view transitions for the storefront, plus
 * same-document `startViewTransition` helpers used by cart / variant re-renders.
 *
 * - The actual animation between full-page navigations is enabled by
 *   `@view-transition { navigation: auto }` in `src/styles/base.css`.
 * - The cross-doc bit below tags outgoing navigations with a type
 *   (e.g. "product-grid") so that the matching `:active-view-transition-type()`
 *   CSS rules in `base.css` are activated for that navigation.
 * - The same-doc helpers (`startViewTransition`, `viewTransitionTypes`,
 *   `supportsViewTransitions`) wrap `document.startViewTransition` and publish
 *   the in-flight transition handle on `viewTransition` (defined in
 *   `@theme/scheduling`) so the global Scheduler can await it before flushing.
 *
 * This file registers no custom elements; it's a side-effect module loaded
 * from `snippets/scripts.liquid`.
 */

import {
  isLowPowerDevice,
  requestIdleCallback,
  viewTransition,
} from "@theme/scheduling";
import { prefersReducedMotion } from "@theme/viewport";

const sameOrigin = (url: string): boolean => {
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
};

/**
 * Decide which view-transition types apply to a given navigation.
 * Returns an empty array if no typed transition should fire.
 */
const typesForNavigation = (fromUrl: string, toUrl: string): string[] => {
  if (!sameOrigin(toUrl)) return [];

  const from = new URL(fromUrl, location.href);
  const to = new URL(toUrl, location.href);

  // Pagination / sort / filter within the same collection => animate the grid.
  const isCollection = (u: URL) =>
    u.pathname.startsWith("/collections/") || u.pathname === "/search";

  if (isCollection(from) && isCollection(to) && from.pathname === to.pathname) {
    return ["product-grid"];
  }

  return [];
};

window.addEventListener("pageswap", (event) => {
  const swap = event as PageSwapEvent;
  const vt = swap.viewTransition;
  const activation = swap.activation;

  if (!vt || !activation || !activation.from) return;

  const types = typesForNavigation(activation.from.url, activation.entry.url);
  for (const type of types) vt.types.add(type);
});

// ---------------------------------------------------------------------------
// Same-document view transitions
// ---------------------------------------------------------------------------

/**
 * Check if the browser supports View Transitions API
 * @returns {boolean} True if the browser supports View Transitions API, false otherwise
 */
export function supportsViewTransitions() {
  return typeof document.startViewTransition === "function";
}

/**
 * Functions to run when a view transition of a given type is started
 * @type {{ [key: string]: () => Promise<(() => void) | undefined> }}
 */
const viewTransitionTypes = {
  "product-grid": async () => {
    const grid = document.querySelector(".product-grid");
    const productCards = [
      ...document.querySelectorAll<HTMLElement>(
        ".product-grid .product-grid__item",
      ),
    ];

    if (!grid || !productCards.length) return;

    await new Promise((resolve) =>
      requestIdleCallback(() => {
        const cardsToAnimate = getCardsToAnimate(grid, productCards);

        productCards.forEach((card, index) => {
          if (index < cardsToAnimate) {
            card.style.setProperty(
              "view-transition-name",
              `product-card-${card.dataset.productId}`,
            );
          } else {
            card.style.setProperty("content-visibility", "hidden");
          }
        });

        resolve(null);
      }),
    );

    return () =>
      productCards.forEach((card) => {
        card.style.removeProperty("view-transition-name");
        card.style.removeProperty("content-visibility");
      });
  },
};

/**
 * Starts a view transition
 * @param {() => void} callback The callback to call when the view transition starts
 * @param {string[]} [types] The types of view transition to use
 * @returns {Promise<void>} A promise that resolves when the view transition finishes
 */
export function startViewTransition(callback, types) {
  // Check if the API is supported and transitions are desired
  if (
    !supportsViewTransitions() ||
    isLowPowerDevice() ||
    prefersReducedMotion()
  ) {
    callback();
    return Promise.resolve();
  }

  // eslint-disable-next-line no-async-promise-executor
  return new Promise<void>(async (resolve) => {
    let cleanupFunctions = [];

    if (types) {
      for (const type of types) {
        if (viewTransitionTypes[type]) {
          const cleanupFunction = await viewTransitionTypes[type]();
          if (cleanupFunction) cleanupFunctions.push(cleanupFunction);
        }
      }
    }

    const transition = document.startViewTransition(callback);

    if (!viewTransition.current) {
      viewTransition.current = transition.finished;
    }

    if (types) types.forEach((type) => transition.types.add(type));

    transition.finished.then(() => {
      viewTransition.current = undefined;
      cleanupFunctions.forEach((cleanupFunction) => cleanupFunction());
      resolve();
    });
  });
}

/**
 * Determines which grid items should be animated during a transition.
 * It makes an estimation based on the zoom-out card size because it's
 * the common denominator for both transition states. I.e. transitioning either
 * from 10 to 20 cards the other way around, both need 20 cards to be animated.
 * @param {Element} grid - The grid element
 * @param {Element[]} cards - The cards to animate
 * @returns {number} - Number of cards that should be animated
 */
function getCardsToAnimate(grid, cards) {
  if (!grid || !cards || cards.length === 0) return 0;

  const itemSample = cards[0];
  if (!itemSample) return 0;

  // Calculate the visible area of the grid for the Y axis. Assume X is always fully visible:
  const gridRect = grid.getBoundingClientRect();
  const visibleArea = {
    top: Math.max(0, gridRect.top),
    bottom: Math.min(window.innerHeight, gridRect.bottom),
  };

  const visibleHeight = Math.round(visibleArea.bottom - visibleArea.top);
  if (visibleHeight <= 0) return 0;

  /** @type {import('product-card').ProductCard | null} */
  const cardSample = itemSample.querySelector("product-card");
  const gridStyle = getComputedStyle(grid);

  const galleryAspectRatio =
    cardSample?.refs?.cardGallery?.style.getPropertyValue(
      "--gallery-aspect-ratio",
    ) || "";
  let aspectRatio = parseFloat(galleryAspectRatio) || 0.5;
  if (galleryAspectRatio?.includes("/")) {
    const [width = "1", height = "2"] = galleryAspectRatio.split("/");
    aspectRatio = parseInt(width, 10) / parseInt(height, 10);
  }

  const cardGap =
    parseInt(
      cardSample?.refs?.productCardLink?.style.getPropertyValue(
        "--product-card-gap",
      ) || "",
    ) || 12;
  const gridGap =
    parseInt(gridStyle.getPropertyValue("--product-grid-gap")) || 12;

  // Assume only a couple of lines of text in the card details (title and price).
  // If the title wraps into more lines, we might just animate more cards, but that's fine.
  const detailsSize = ((parseInt(gridStyle.fontSize) || 16) + 2) * 2;

  const isMobile = window.innerWidth < 750;

  // Always use the zoom-out state card width
  const cardWidth = isMobile ? Math.round((gridRect.width - gridGap) / 2) : 100;
  const cardHeight =
    Math.round(cardWidth / aspectRatio) + cardGap + detailsSize;

  // Calculate the number of cards that fit in the visible area:
  // - The width estimation is pretty accurate, we can ignore decimals.
  // - The height estimation needs to account for peeking rows, so we round up.
  const columnsInGrid = isMobile
    ? 2
    : Math.floor((gridRect.width + gridGap) / (cardWidth + gridGap));
  const rowsInGrid = Math.ceil(
    (visibleHeight - gridGap) / (cardHeight + gridGap),
  );

  return columnsInGrid * rowsInGrid;
}

/**
 * @theme/viewport
 *
 * Breakpoint, media-query, touch, motion-preference, visibility, and
 * iOS-version helpers — anything that asks the browser about the
 * current viewport or device.
 */

/**
 * A media query for reduced motion
 * @type {MediaQueryList}
 */
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

/**
 * Check if the user prefers reduced motion
 * @returns {boolean} True if the user prefers reduced motion, false otherwise
 */
export function prefersReducedMotion() {
  return reducedMotion.matches;
}

/**
 * A media query for large screens
 * @type {MediaQueryList}
 */
export const mediaQueryLarge = matchMedia("(min-width: 750px)");

/**
 * Check if the current breakpoint is mobile
 * @returns {boolean} True if the current breakpoint is mobile, false otherwise
 */
export function isMobileBreakpoint() {
  return !mediaQueryLarge.matches;
}

/**
 * Check if the current breakpoint is desktop
 * @returns {boolean} True if the current breakpoint is desktop, false otherwise
 */
export function isDesktopBreakpoint() {
  return mediaQueryLarge.matches;
}

/**
 * Check if the device is a touch device independently of the screen size
 * @returns {boolean} True if the device is a touch device, false otherwise
 */
export function isTouchDevice() {
  return "ontouchstart" in window && navigator.maxTouchPoints > 0;
}

/**
 * Get the visible elements within a root element.
 * @template {Element} T
 * @param {Element} root - The element within which elements should be visible.
 * @param {T[] | undefined} elements - The elements to check for visibility.
 * @param {number} [ratio=1] - The minimum percentage of the element that must be visible.
 * @param {'x' | 'y'} [axis] - Whether to only check along 'x' axis, 'y' axis, or both if undefined.
 * @returns {T[]} An array containing the visible elements.
 */
export function getVisibleElements(root, elements, ratio = 1, axis) {
  if (!elements?.length) return [];
  const rootRect = root.getBoundingClientRect();

  return elements.filter((element) => {
    const { width, height, top, right, left, bottom } =
      element.getBoundingClientRect();

    if (ratio < 1) {
      const intersectionLeft = Math.max(rootRect.left, left);
      const intersectionRight = Math.min(rootRect.right, right);
      const intersectionWidth = Math.max(
        0,
        intersectionRight - intersectionLeft,
      );

      if (axis === "x") {
        return width > 0 && intersectionWidth / width >= ratio;
      }

      const intersectionTop = Math.max(rootRect.top, top);
      const intersectionBottom = Math.min(rootRect.bottom, bottom);
      const intersectionHeight = Math.max(
        0,
        intersectionBottom - intersectionTop,
      );

      if (axis === "y") {
        return height > 0 && intersectionHeight / height >= ratio;
      }

      const intersectionArea = intersectionWidth * intersectionHeight;
      const elementArea = width * height;

      // Check that at least the specified ratio of the element is visible
      return elementArea > 0 && intersectionArea / elementArea >= ratio;
    }

    const isWithinX = left >= rootRect.left && right <= rootRect.right;
    if (axis === "x") {
      return isWithinX;
    }

    const isWithinY = top >= rootRect.top && bottom <= rootRect.bottom;
    if (axis === "y") {
      return isWithinY;
    }

    return isWithinX && isWithinY;
  });
}

export function getIOSVersion() {
  const { userAgent } = navigator;
  const isIOS = /(iPhone|iPad)/i.test(userAgent);

  if (!isIOS) return null;

  const version = userAgent.match(/OS ([\d_]+)/)?.[1];
  const [major, minor] = version?.split("_") || [];
  if (!version || !major) return null;

  return {
    fullString: version.replace("_", "."),
    major: parseInt(major, 10),
    minor: minor ? parseInt(minor, 10) : 0,
  };
}

/**
 * A custom ResizeObserver that only calls the callback when the element is resized.
 * By default the ResizeObserver callback is called when the element is first observed.
 */
export class ResizeNotifier extends ResizeObserver {
  #initialized = false;

  /**
   * @param {ResizeObserverCallback} callback
   */
  constructor(callback) {
    super((entries) => {
      if (this.#initialized) return callback(entries, this);
      this.#initialized = true;
    });
  }

  disconnect() {
    this.#initialized = false;
    super.disconnect();
  }
}

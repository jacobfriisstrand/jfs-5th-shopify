/**
 * @theme/scheduling
 *
 * Idle / yield / debounce / throttle primitives, plus a small frame-aligned
 * Scheduler used to batch DOM work after view transitions settle.
 *
 * `viewTransition` is the in-flight same-document transition handle that
 * `@theme/view-transitions` publishes here so that `Scheduler.schedule()`
 * can await it before flushing DOM tasks. Keeping it in this Module
 * avoids a circular import with view-transitions.
 */

/**
 * Request an idle callback or fallback to setTimeout
 * @returns {function} The requestIdleCallback function
 */
export const requestIdleCallback =
  typeof window.requestIdleCallback == "function"
    ? window.requestIdleCallback
    : setTimeout;

/**
 * Returns a promise that resolves after yielding to the main thread.
 * @see https://web.dev/articles/optimize-long-tasks#scheduler-yield
 */
export const yieldToMainThread = () => {
  if ("yield" in scheduler) {
    // @ts-ignore - TypeScript doesn't recognize the yield method yet.
    return scheduler.yield();
  }

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
};

/**
 * Tells if we are on a low power device based on the number of CPU cores and RAM
 * @returns {boolean} True if the device is a low power device, false otherwise
 */
export function isLowPowerDevice() {
  return (
    Number(navigator.hardwareConcurrency) <= 2 ||
    Number(navigator.deviceMemory) <= 2
  );
}

/**
 * In-flight same-document view transition handle.
 * Written by `startViewTransition` in `@theme/view-transitions`,
 * read by `Scheduler.schedule()` below to avoid stomping on a transition.
 *
 * @type {{ current: Promise<void> | undefined }}
 */
export const viewTransition = {
  current: undefined,
};

/**
 * Creates a debounced function that delays calling the provided function (fn)
 * until after wait milliseconds have elapsed since the last time
 * the debounced function was invoked. The returned function has a .cancel()
 * method to cancel any pending calls.
 *
 * @template {(...args: any[]) => any} T
 * @param {T} fn The function to debounce
 * @param {number} wait The time (in milliseconds) to wait before calling fn
 * @returns {T & { cancel(): void }} A debounced version of fn with a .cancel() method
 */
export function debounce(fn, wait) {
  /** @type {number | undefined} */
  let timeout;

  /** @param {...any} args */
  function debounced(this: unknown, ...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  }

  // Add the .cancel method:
  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return /** @type {T & { cancel(): void }} */ (debounced);
}

/**
 * Creates a throttled function that calls the provided function (fn) at most once per every wait milliseconds
 *
 * @template {(...args: any[]) => any} T
 * @param {T} fn The function to throttle
 * @param {number} delay The time (in milliseconds) to wait before calling fn
 * @returns {T & { cancel(): void }} A throttled version of fn with a .cancel() method
 */
export function throttle(fn, delay) {
  let lastCall = 0;

  /** @param {...any} args */
  function throttled(this: unknown, ...args) {
    const now = performance.now();
    // If the time since the last call exceeds the delay, execute the callback
    if (now - lastCall >= delay) {
      lastCall = now;
      fn.apply(this, args);
    }
  }

  throttled.cancel = () => {
    lastCall = performance.now();
  };

  return /** @type {T & { cancel(): void }} */ (throttled);
}

class Scheduler {
  /** @type {Set<() => void>} */
  #queue = new Set<() => void>();
  /** @type {boolean} */
  #scheduled = false;

  /** @param {() => void} task */
  schedule = async (task) => {
    this.#queue.add(task);

    if (!this.#scheduled) {
      this.#scheduled = true;

      // Wait for any in-progress view transitions to finish
      if (viewTransition.current) await viewTransition.current;

      requestAnimationFrame(this.flush);
    }
  };

  flush = () => {
    for (const task of this.#queue) {
      setTimeout(task, 0);
    }

    this.#queue.clear();
    this.#scheduled = false;
  };
}

export { Scheduler };

export const scheduler = new Scheduler();

/**
 * Executes a callback once per session when in the Shopify theme editor
 * @param {HTMLElement} element - The element to check for the shopify editor block id
 * @param {string} sessionKeyName - Unique key for the session storage
 * @param {() => void} callback - Function to execute
 * @returns {void} - Void if the callback was executed, undefined if it wasn't
 */
export function oncePerEditorSession(element, sessionKeyName, callback) {
  const isInThemeEditor = window.Shopify?.designMode;
  const shopifyEditorSectionId = JSON.parse(
    element.dataset.shopifyEditorSection || "{}",
  ).id;
  const shopifyEditorBlockId = JSON.parse(
    element.dataset.shopifyEditorBlock || "{}",
  ).id;
  const editorId = shopifyEditorSectionId || shopifyEditorBlockId;
  const uniqueSessionKey = `${sessionKeyName}-${editorId}`;

  if (isInThemeEditor && sessionStorage.getItem(uniqueSessionKey)) return;

  callback();

  if (isInThemeEditor) sessionStorage.setItem(uniqueSessionKey, "true");

  return;
}

// Theme is not defined in some layouts, like the gift card page
if (typeof Theme !== "undefined") {
  Theme.utilities = {
    ...Theme.utilities,
    scheduler: scheduler,
  };
}

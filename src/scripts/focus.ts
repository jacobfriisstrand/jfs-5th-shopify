// Store references to our event handlers so we can remove them.
const trapFocusHandlers: {
  keydown?: (event: KeyboardEvent) => void;
  focusin?: (event: FocusEvent) => void;
} = {};

/**
 * Get all focusable elements within a container.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe",
    ),
  );
}

/**
 * Trap focus within the given container.
 */
export function trapFocus(container: HTMLElement) {
  // Clean up any previously set traps.
  removeTrapFocus();

  // Gather focusable elements.
  const focusable = getFocusableElements(container);
  if (!focusable.length) {
    // If nothing is focusable, just abort—no need to trap.
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  // Keydown handler for cycling focus with Tab and Shift+Tab
  trapFocusHandlers.keydown = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;

    const activeEl = document.activeElement;

    // If on the last focusable and tabbing forward, go to first
    if (!event.shiftKey && activeEl === last) {
      event.preventDefault();
      first?.focus();
    }
    // If on the first (or the container) and shift-tabbing, go to last
    else if (event.shiftKey && (activeEl === first || activeEl === container)) {
      event.preventDefault();
      last?.focus();
    }
  };

  // Focusin (capturing) handler to forcibly keep focus in the container
  trapFocusHandlers.focusin = (event: FocusEvent) => {
    // If the newly focused element isn't inside the container, redirect focus back.
    if (event.target instanceof Node && !container.contains(event.target)) {
      event.stopPropagation();
      // E.g., refocus the first focusable element:
      first?.focus();
    }
  };

  // Attach the handlers
  document.addEventListener("keydown", trapFocusHandlers.keydown, true);
  // Use capture phase for focusin so we can catch it before it lands outside
  document.addEventListener("focusin", trapFocusHandlers.focusin, true);

  // Finally, put focus where you want it.
  container.focus();
}

/**
 * Remove focus trap and optionally refocus another element.
 */
export function removeTrapFocus() {
  trapFocusHandlers.keydown &&
    document.removeEventListener("keydown", trapFocusHandlers.keydown, true);
  trapFocusHandlers.focusin &&
    document.removeEventListener("focusin", trapFocusHandlers.focusin, true);
}

/**
 * Cycle focus to the next or previous link
 */
export function cycleFocus(items: HTMLElement[], increment: number) {
  const currentIndex = items.findIndex((item) => item.matches(":focus"));
  let targetIndex = currentIndex + increment;

  if (targetIndex >= items.length) {
    targetIndex = 0;
  } else if (targetIndex < 0) {
    targetIndex = items.length - 1;
  }

  const targetItem = items[targetIndex];

  if (!targetItem) return;

  targetItem.focus();
}

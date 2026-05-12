/**
 * @theme/geometry
 *
 * Pure-math + element-rect helpers (no DOM mutation, no observers).
 */

/**
 * Clamps a number between a minimum and maximum value.
 * @param {number} value - The input number to clamp.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

/**
 * Calculates the center point of an element along the specified axis.
 * @param {Element} element - The DOM element to find the center of.
 * @param {'x' | 'y'} [axis] - The axis ('x' or 'y') to get the center for. If not provided, returns both axes.
 * @template {('x' | 'y')} T
 * @param {T} [axis]
 * @returns {T extends ('x' | 'y') ? number : {x: number, y: number}} The center point along the axis or an object with x and y coordinates.
 */
export function center(element, axis) {
  const { left, width, top, height } = element.getBoundingClientRect();
  const point = {
    x: left + width / 2,
    y: top + height / 2,
  };

  if (axis) return /**  @type {any} */ (point[axis]);

  return /**  @type {any} */ (point);
}

/**
 * Calculates the start point of an element along the specified axis.
 * @param {Element} element - The DOM element to find the start of.
 * @param {'x' | 'y'} [axis] - The axis ('x' or 'y') to get the start for. If not provided, returns both axes.
 * @returns {number | {x: number, y: number}} The start point along the axis or an object with x and y coordinates.
 */
export function start(element, axis) {
  const { left, top } = element.getBoundingClientRect();
  const point = { x: left, y: top };

  if (axis) return /**  @type {any} */ (point[axis]);

  return /**  @type {any} */ (point);
}

/**
 * Finds the value in an array that is closest to a target value.
 * @param {number[]} values - An array of numbers.
 * @param {number} target - The target number to find the closest value to.
 * @returns {number} The value from the array closest to the target.
 */
export function closest(values, target) {
  return values.reduce(function (prev, curr) {
    return Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev;
  });
}

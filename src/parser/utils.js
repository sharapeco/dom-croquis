/**
 * @param {string} colorValue
 * @returns {string | undefined}
 */
export function parseColor(colorValue) {
	if (isTransparent(colorValue)) {
		return;
	}
	return colorValue;
}

/**
 * @param {string} color
 * @returns {boolean}
 */
export function isTransparent(color) {
	return color === "transparent" || color === "rgba(0, 0, 0, 0)";
}

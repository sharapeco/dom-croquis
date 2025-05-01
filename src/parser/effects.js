/**
 * @typedef {import("../types.js").BlendMode} BlendMode
 *
 * @typedef {Object} Effects
 * @property {number} [opacity]
 * @property {BlendMode} [blendMode]
 */

/**
 * @param {Element} elem
 * @returns {Effects | null}
 */
export function parseEffects(elem) {
	const css = getComputedStyle(elem);
	const effects = {};

	const opacity = css.opacity !== "1" ? Number.parseFloat(css.opacity) : null;
	if (opacity != null && Number.isFinite(opacity)) {
		effects.opacity = opacity;
	}

	const blendMode = css.mixBlendMode;
	if (blendMode != null && blendMode !== "normal") {
		effects.blendMode = blendMode;
	}

	return Object.keys(effects).length > 0 ? effects : null;
}

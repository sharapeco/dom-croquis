/**
 * @typedef {import("../types.js").TextShadow} TextShadow
 */

/**
 * Parses a color value.
 *
 * @param {string} colorValue
 * @returns {string | undefined} Color string. undefined if the color is transparent.
 */
export function parseColor(colorValue) {
	if (isTransparent(colorValue)) {
		return;
	}
	return colorValue;
}

/**
 * Checks if the color obtained by getComputedStyle() is transparent.
 *
 * @param {string} color
 * @returns {boolean}
 */
export function isTransparent(color) {
	return color === "transparent" || color === "rgba(0, 0, 0, 0)";
}

/**
 * Parse CSS value string and return an array of tokens
 *
 * @param {string} input - CSS value string to parse
 * @returns {Array<{type: string, s?: string, f?: number}>} Array of tokens
 */
export function parseCSSValue(input) {
	const tokens = [];
	let current = input.trim();

	while (current.length > 0) {
		// Handle separator
		if (current[0] === ",") {
			tokens.push({ type: "separator", s: "," });
			current = current.slice(1).trim();
			continue;
		}

		// Handle color values
		const colorMatch = current.match(/^(?:rgb|rgba)\(([^)]+)\)/i);
		if (colorMatch) {
			tokens.push({ type: "color", s: colorMatch[0] });
			current = current.slice(colorMatch[0].length).trim();
			continue;
		}

		// Handle percentage values
		const percentageMatch = current.match(/^(-?\d+(?:\.\d+)?)%/);
		if (percentageMatch) {
			tokens.push({
				type: "percentage",
				f: Number.parseFloat(percentageMatch[1]),
			});
			current = current.slice(percentageMatch[0].length).trim();
			continue;
		}

		// Handle length values (with units)
		const lengthMatch = current.match(
			/^(-?\d+(?:\.\d+)?)(?:px|em|rem|vh|vw|vmin|vmax)?\b/,
		);
		if (lengthMatch) {
			tokens.push({ type: "length", f: Number.parseFloat(lengthMatch[1]) });
			current = current.slice(lengthMatch[0].length).trim();
			continue;
		}

		// Handle keywords and unparseable input
		const separatorMatch = current.match(/(\s|,)/);
		const content = separatorMatch
			? current.slice(0, separatorMatch.index)
			: current;
		if (/[^a-zA-Z-]/.test(content)) {
			tokens.push({ type: "error", s: content });
		} else {
			tokens.push({ type: "keyword", s: content });
		}
		current = separatorMatch ? current.slice(separatorMatch.index).trim() : "";
	}

	return tokens;
}

/**
 * @typedef {Object} BoxShadow
 * @property {string} color
 * @property {number} x
 * @property {number} y
 * @property {number} blur
 * @property {number} spread
 * @property {"outset" | "inset"} position
 *
 * @param {string} value
 * @returns {BoxShadow[]}
 */
export function parseBoxShadow(value) {
	if (value === "none") {
		return [];
	}

	const boxShadowTokens = parseCSSValue(value);
	const boxShadows = [];
	let item = {};
	for (const token of boxShadowTokens) {
		if (token.s === ",") {
			if (item.y != null) {
				boxShadows.push(item);
			}
			item = {};
		}
		if (token.f != null) {
			if (item.x == null) {
				item.x = token.f;
			} else if (item.y == null) {
				item.y = token.f;
			} else if (item.blur == null) {
				item.blur = token.f;
			} else if (item.spread == null) {
				item.spread = token.f;
			}
		} else if (token.type === "color") {
			if (item.color == null) {
				item.color = token.s;
			}
		} else if (token.type === "keyword" && token.s === "inset") {
			if (item.position == null) {
				item.position = "inset";
			}
		}
	}
	if (item.y != null) {
		boxShadows.push(item);
	}

	return boxShadows.map((item) => ({
		...item,
		position: item.position ?? "outset",
	}));
}

/**
 * @param {string} value
 * @returns {TextShadow[]}
 */
export function parseTextShadow(value) {
	if (value === "none") {
		return [];
	}

	const textShadowTokens = parseCSSValue(value);
	const textShadows = [];
	let item = {};
	for (const token of textShadowTokens) {
		if (token.s === ",") {
			textShadows.push(item);
			item = {};
		}
		if (token.type === "length" && token.f != null) {
			if (item.x == null) {
				item.x = token.f;
			} else if (item.y == null) {
				item.y = token.f;
			} else if (item.blur == null) {
				item.blur = token.f;
			}
		} else if (token.type === "color") {
			if (item.color == null) {
				item.color = token.s;
			}
		}
	}
	if (item.y != null) {
		textShadows.push(item);
	}
	return textShadows;
}

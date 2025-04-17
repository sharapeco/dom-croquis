/**
 * Parse CSS value string and return an array of tokens
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
			/^(-?\d+(?:\.\d+)?)(?:px|em|rem|vh|vw|vmin|vmax)?(?:\s|$)/,
		);
		if (lengthMatch) {
			tokens.push({ type: "length", f: Number.parseFloat(lengthMatch[1]) });
			current = current.slice(lengthMatch[0].length).trim();
			continue;
		}

		// Handle keywords
		const keywordMatch = current.match(/^([a-zA-Z-]+)(?:\s|$)/);
		if (keywordMatch) {
			tokens.push({ type: "keyword", s: keywordMatch[1] });
			current = current.slice(keywordMatch[0].length).trim();
			continue;
		}

		// Handle unparseable input
		const nextSpace = current.indexOf(" ");
		const errorContent = nextSpace === -1 ? current : current.slice(0, nextSpace);
		tokens.push({ type: "error", s: errorContent });
		current = nextSpace === -1 ? "" : current.slice(nextSpace).trim();
	}

	return tokens;
}

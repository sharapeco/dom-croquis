/**
 * @typedef {import("../types.js").TextProp} TextProp
 */

/**
 * @param {CSSStyleDeclaration} css
 * @returns {TextProp}
 */
export function parseFontProperties(css) {
	const {
		color,
		fontStyle,
		fontVariant,
		fontWeight,
		fontSize,
		fontFamily,
		fontKerning,
		fontStretch,
		fontVariantCaps,
		letterSpacing,
		lineHeight,
		textAlign,
		textDecorationLine,
		textDecorationColor,
		textDecorationThickness,
		transform,
		whiteSpace,
		writingMode,
	} = css;

	/**
	 * transform は次のように matrix で表現される。
	 * - 長体: matrix(0.8, 0, 0, 1, 0, 0)
	 * - 平体: matrix(1.25, 0, 0, 1, 0, 0)
	 *
	 * また、本来は transform-origin を考慮する必要があるが、
	 * このプログラムでは center center に固定しているため、
	 * あえて考慮しない。
	 */
	const scaleX = transform.match(/matrix\(([^,]+),/)?.[1];

	return {
		color,
		font: `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize}/1 ${fontFamily}`,
		fontKerning,
		fontStretch,
		fontVariantCaps,
		letterSpacing,
		fontSize: Number.parseFloat(fontSize),
		lineHeight: Number.parseFloat(lineHeight),
		textAlign,
		textDecoration:
			textDecorationLine === "none"
				? undefined
				: {
						underline: textDecorationLine === "underline",
						overline: textDecorationLine === "overline",
						lineThrough: textDecorationLine === "line-through",
						color: textDecorationColor,
						thickness:
							textDecorationThickness === "auto"
								? 1
								: Number.parseFloat(textDecorationThickness),
					},
		whiteSpace,
		scaleX: scaleX != null ? Number.parseFloat(scaleX) : 1,
		writingMode,
	};
}

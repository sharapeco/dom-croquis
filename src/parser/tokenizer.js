/**
 * @typedef {import("../types.js").Token} Token
 * @typedef {import("../types.js").ClipToken} ClipToken
 * @typedef {import("../types.js").FillToken} FillToken
 * @typedef {import("../types.js").TextToken} TextToken
 * @typedef {import("../types.js").ImageToken} ImageToken
 * @typedef {import("../types.js").Rect} Rect
 * @typedef {import("../types.js").BoxShadow} BoxShadow
 * @typedef {import("../types.js").TextProp} TextProp
 *
 * @typedef {Object} State
 * @property {boolean} clipOverflow
 * @property {boolean} hidden
 */

/** @type {State} */
const defaultState = {
	clipOverflow: false,
	hidden: false,
};

const textSpacingTrimList =
	"、，。．・：；（〔［｛〈《「『【⦅〘〖«〝）〕］｝〉》」』】⦆〙〗»〟";

export class Tokenizer {
	/**
	 * @param {HTMLElement} root
	 */
	constructor(root) {
		this.root = root;
		this.window = root.ownerDocument.defaultView;
		this.getComputedStyle = this.window.getComputedStyle.bind(this.window);
		this.pixel = Number.parseFloat(this.getComputedStyle(root).fontSize) / 16;
		this.rootRect = root.getClientRects()[0];
	}

	/**
	 * @returns {Promise<Token[]>}
	 */
	async tokenize() {
		/** 状態のスタック。子要素を選択するたびに要素を追加する */
		const states = [defaultState];

		/** @type {Token[]} トークンリスト */
		const tokens = [];

		const pushState = (state) => {
			states.push(state);
		};
		const popState = () => {
			const state = states.pop();
			if (state.clipOverflow && !state.hidden) {
				tokens.push({
					type: "endClip",
				});
			}
			return state;
		};

		/** @type {Node} */
		let node = this.root;
		walk: while (node != null && node !== this.root.nextSibling) {
			const state = this.readState(node, states[states.length - 1]);
			pushState(state);

			switch (node.nodeType) {
				case Node.ELEMENT_NODE:
					if (!state.hidden) {
						const elementTokens = await this.readElementTokens(node, state);
						for (const token of elementTokens) {
							tokens.push(token);
						}
					}
					break;
				case Node.TEXT_NODE:
					if (!state.hidden) {
						const token = this.readTextToken(node, tokens[tokens.length - 1]);
						if (token != null) {
							tokens.push(token);
						}
					}
					break;
			}

			if (node.childNodes.length > 0) {
				node = node.firstChild;
			} else if (node.nextSibling !== null) {
				popState();
				node = node.nextSibling;
			} else {
				popState();
				while (node != null && node.nextSibling === null) {
					popState();
					node = node.parentNode;
					if (node === this.root) {
						break walk;
					}
				}
				node = node?.nextSibling;
			}
		}

		return tokens;
	}

	/**
	 * @param {Node} node
	 * @param {State} parentState
	 * @returns {State}
	 */
	readState(node, parentState) {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return { ...parentState, clipOverflow: false };
		}

		const { display, opacity, overflow } = this.getComputedStyle(node);
		return {
			clipOverflow:
				display !== "inline" &&
				display !== "inline flow" &&
				display !== "none" &&
				display !== "contents" &&
				display !== "table" &&
				display !== "table-row" &&
				(overflow === "hidden" ||
					overflow === "clip" ||
					overflow === "scroll" ||
					overflow === "auto"),
			hidden: parentState.hidden || display === "none" || opacity === "0",
		};
	}

	/**
	 * @param {HTMLElement} elem
	 * @param {State} state
	 * @returns {Promise<Token[]>}
	 */
	async readElementTokens(elem, state) {
		// rects.length > 1 の場合は必ず複数行にまたがるインライン要素なので、次のようにレンダリングする
		// 1. すべての rects の幅を合計した仮想的な矩形を想像する
		// 2. その矩形の中に background-color, background-image, border, box-shadow を描画する
		// 3. 各 rect にクリップを適用し、その中に仮想的な矩形を描画する
		//    このとき、オフセットは現在の rect 以前の rects の幅の合計とする

		const rects = elem.getClientRects();

		// display: contents, display: none はボックスを生成しない
		if (rects.length === 0) {
			return [];
		}

		const mainRect = rects[0];

		/** @type {Array<Token | null>} */
		const tokens = [];

		const css = this.getComputedStyle(elem);

		const backgroundClip = css.backgroundClip;
		if (backgroundClip === "text") {
			// Unsupported: background-clip: text
			return [];
		}

		const usePaddingBox = css.backgroundClip === "padding-box";
		const isVertical =
			css.writingMode === "vertical-rl" || css.writingMode === "vertical-lr";

		// インライン要素は行ごとに矩形を生成する
		const virtualRect = !isVertical
			? {
					x: 0,
					y: 0,
					width: Array.from(rects).reduce((acc, rect) => acc + rect.width, 0),
					height: mainRect.height,
				}
			: {
					x: 0,
					y: 0,
					width: mainRect.width,
					height: Array.from(rects).reduce((acc, rect) => acc + rect.height, 0),
				};

		if (virtualRect.width <= 0 || virtualRect.height <= 0) {
			return [];
		}

		// 要素のアウトライン
		const borderBoxPath = this.getBorderBoxPath(css, virtualRect);
		const paddingBoxPath = this.getPaddingBoxPath(css, virtualRect);

		// overflow: hidden などの場合はクリップパスを生成する
		if (state.clipOverflow) {
			/** @type {ClipToken} */
			const clipToken = {
				type: "clip",
				node: elem,
				x: mainRect.left - this.rootRect.left,
				y: mainRect.top - this.rootRect.top,
				width: mainRect.width,
				height: mainRect.height,
				path: borderBoxPath,
			};
			tokens.push(clipToken);
		}

		const fillColor = this.parseColor(css.backgroundColor);
		const borders = this.parseBorders(css);
		if (fillColor != null || borders.some((b) => b.width > 0)) {
			const backgroundPath = usePaddingBox ? paddingBoxPath : borderBoxPath;
			const borderPath = {
				segments: borderBoxPath.segments.concat(paddingBoxPath.segments),
				fillRule: "evenodd",
			};

			let offset = 0;
			for (const rect of rects) {
				// Add background-color
				if (fillColor != null) {
					tokens.push({
						tag: "background-color",
						type: "clip",
						node: elem,
						x: rect.left - this.rootRect.left,
						y: rect.top - this.rootRect.top,
						rect: {
							width: rect.width,
							height: rect.height,
						},
					});
					tokens.push({
						tag: "background-color",
						type: "fill",
						node: elem,
						x: rect.left - this.rootRect.left + (!isVertical ? offset : 0),
						y: rect.top - this.rootRect.top + (isVertical ? offset : 0),
						path: backgroundPath,
						color: fillColor,
					});
					tokens.push({
						tag: "background-color",
						type: "endClip",
					});
				}

				// Add borders
				const a = [1, 0, -1, 0];
				const origins = [
					{ x: 0, y: 0 },
					{ x: rect.width, y: 0 },
					{ x: rect.width, y: rect.height },
					{ x: 0, y: rect.height },
				];
				const lengths = [rect.width, rect.height, rect.width, rect.height];
				const radius = this.prevPaddingBoxRadius;
				const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
				const flatten = ({ x, y }) => [x, y];
				for (let i = 0; i < 4; i++) {
					if (borders[i].width <= 0) {
						continue;
					}
					const rotate = ({ x, y }) => ({
						x: a[i % 4] * x + a[(i + 1) % 4] * y,
						y: a[(i + 3) % 4] * x + a[i % 4] * y,
					});

					const origin = origins[i];
					const len = lengths[i];

					const wN = borders[i].width;
					const wTS = borders[(i + 3) % 4].width;
					const wTE = borders[(i + 1) % 4].width;
					const rSN = radius[(i * 2 + 7) % 8];
					const rST = radius[(i * 2 + 0) % 8];
					const rEN = radius[(i * 2 + 2) % 8];
					const rET = radius[(i * 2 + 1) % 8];

					const S = { x: 0, y: 0 };
					const E = { x: len, y: 0 };
					const CSP = { x: wTS + rST, y: wN + rSN };
					const CEP = { x: len - (wTE + rET), y: wN + rEN };
					const PS = { x: CSP.y * wTS / wN, y: CSP.y };
					const PE = { x: len - (CEP.y * wTE / wN), y: CEP.y };

					const clipPath = {
						segments: [
							{ command: "M", coordinates: flatten(add(rotate(S), origin)) },
							{ command: "L", coordinates: flatten(add(rotate(PS), origin)) },
							{ command: "L", coordinates: flatten(add(rotate(CSP), origin)) },
							{ command: "L", coordinates: flatten(add(rotate(CEP), origin)) },
							{ command: "L", coordinates: flatten(add(rotate(PE), origin)) },
							{ command: "L", coordinates: flatten(add(rotate(E), origin)) },
							{ command: "Z", coordinates: [] },
						],
					};
					tokens.push({
						tag: `border-${borders[i].side}`,
						type: "clip",
						node: elem,
						x: rect.left - this.rootRect.left,
						y: rect.top - this.rootRect.top,
						path: clipPath,
					});
					tokens.push({
						tag: `border-${borders[i].side}`,
						type: "fill",
						node: elem,
						x: rect.left - this.rootRect.left + (!isVertical ? offset : 0),
						y: rect.top - this.rootRect.top + (isVertical ? offset : 0),
						path: borderPath,
						color: borders[i].color,
					});
					tokens.push({
						tag: `border-${borders[i].side}`,
						type: "endClip",
					});
				}

				offset -= isVertical ? rect.height : rect.width;
			}
		}

		const position = {
			x: rects[0].left - this.rootRect.left,
			y: rects[0].top - this.rootRect.top,
			width: rects[0].width,
			height: rects[0].height,
		};

		const backgroundToken = await this.parseBackgroundImageToken(
			elem,
			position,
		);
		if (backgroundToken != null) {
			tokens.push(backgroundToken);
		}

		const nodeName = elem.nodeName.toLowerCase();
		if (nodeName === "img") {
			tokens.push(await this.parseImageToken(elem, position));
		}

		return tokens.filter((token) => token != null);
	}

	/**
	 * @param {string} colorValue
	 * @returns {string | undefined}
	 */
	parseColor(colorValue) {
		if (this.isTransparent(colorValue)) {
			return;
		}
		return colorValue;
	}

	/**
	 * @param {string} color
	 * @returns {boolean}
	 */
	isTransparent(color) {
		return color === "transparent" || color === "rgba(0, 0, 0, 0)";
	}

	/**
	 * @param {CSSStyleDeclaration} css
	 * @returns {{ style: string, width: number, color: string }[]} top, right, bottom, left の順
	 */
	parseBorders(css) {
		return ["Top", "Right", "Bottom", "Left"].map((side) => {
			const style = css[`border${side}Style`];
			const width = Number.parseFloat(css[`border${side}Width`]);
			const color = css[`border${side}Color`];
			if (
				style === "none" ||
				width <= 0 ||
				Number.isNaN(width) ||
				this.isTransparent(color)
			) {
				return { style: "none", width: 0, color: "transparent" };
			}
			return { Side: side, side: side.toLowerCase(), style, width, color };
		});
	}
	/**
	 * rect の左上を原点とする border-box のパスを生成する
	 *
	 * @param {CSSStyleDeclaration} css
	 * @param {Rect} rect
	 * @returns {Path}
	 */
	getBorderBoxPath(css, rect) {
		const radius = this.parseBorderRadius(css, rect);
		this.prevBorderBoxRadius = radius;
		return {
			segments: this.getPathFromRadius(radius, { ...rect, x: 0, y: 0 }),
		};
	}

	/**
	 * rect の左上を原点とする padding-box のパスを生成する
	 *
	 * @param {CSSStyleDeclaration} css
	 * @param {Rect} rect
	 * @returns {Path}
	 */
	getPaddingBoxPath(css, rect) {
		const borders = this.parseBorders(css);
		const radius = this.parseBorderRadius(css, rect).map((r, index) => {
			const borderWidth = borders[index >> 1].width;
			return Math.max(0, r - borderWidth);
		});
		this.prevPaddingBoxRadius = radius;
		return {
			segments: this.getPathFromRadius(radius, {
				x: borders[3].width,
				y: borders[0].width,
				width: rect.width - borders[1].width - borders[3].width,
				height: rect.height - borders[0].width - borders[2].width,
			}),
		};
	}

	/**
	 * @param {number[]} radius
	 * @param {Rect} rect
	 * @returns {PathSegment[]}
	 */
	getPathFromRadius(radius, rect) {
		const path = [
			{
				command: "M",
				coordinates: [rect.x + radius[0], rect.y],
			},
			{ command: "L", coordinates: [rect.x + rect.width - radius[1], rect.y] },
			radius[1] > 0 &&
				radius[2] > 0 && {
					command: "A",
					coordinates: [
						radius[1],
						radius[2],
						0,
						0,
						1,
						rect.x + rect.width,
						rect.y + radius[2],
					],
				},
			{
				command: "L",
				coordinates: [rect.x + rect.width, rect.y + rect.height - radius[3]],
			},
			radius[3] > 0 &&
				radius[4] > 0 && {
					command: "A",
					coordinates: [
						radius[4],
						radius[3],
						0,
						0,
						1,
						rect.x + rect.width - radius[4],
						rect.y + rect.height,
					],
				},
			{ command: "L", coordinates: [rect.x + radius[5], rect.y + rect.height] },
			radius[5] > 0 &&
				radius[6] > 0 && {
					command: "A",
					coordinates: [
						radius[5],
						radius[6],
						0,
						0,
						1,
						rect.x,
						rect.y + rect.height - radius[6],
					],
				},
			{ command: "L", coordinates: [rect.x, rect.y + radius[7]] },
			radius[7] > 0 &&
				radius[0] > 0 && {
					command: "A",
					coordinates: [
						radius[0],
						radius[7],
						0,
						0,
						1,
						rect.x + radius[0],
						rect.y,
					],
				},
			{ command: "Z", coordinates: [] },
		];
		return path.filter((segment) => segment !== false);
	}

	/**
	 * @param {CSSStyleDeclaration} css
	 * @param {Rect} rect
	 * @returns {number[]} 次の順に並んだ角丸半径（ピクセル）の列: [
	 *   0: top-left-horizontal,
	 *   1: top-right-horizontal,
	 *   2: top-right-vertical,
	 *   3: bottom-right-vertical,
	 *   4: bottom-right-horizontal,
	 *   5: bottom-left-horizontal,
	 *   6: bottom-left-vertical
	 *   7: top-left-vertical
	 * ]
	 */
	parseBorderRadius(css, rect) {
		const tl = this.parseBorderRadiusValue(css.borderTopLeftRadius, rect);
		const tr = this.parseBorderRadiusValue(css.borderTopRightRadius, rect);
		const bl = this.parseBorderRadiusValue(css.borderBottomLeftRadius, rect);
		const br = this.parseBorderRadiusValue(css.borderBottomRightRadius, rect);
		const radius = [tl.h, tr.h, tr.v, br.v, br.h, bl.h, bl.v, tl.v];
		// top, right, bottom, left の border-radius の最大値を 1 とした比率
		const ratio = [1, 1, 1, 1];
		for (let k = 0; k < 4; k++) {
			const max = k % 2 === 0 ? rect.width : rect.height;
			ratio[k] = Math.min(ratio[k], max / (radius[2 * k] + radius[2 * k + 1]));
		}
		return radius.map((r, i) => {
			const k = ((i + 7) >> 1) % 4;
			return r * Math.min(ratio[k], ratio[(k + 1) % 4]);
		});
	}

	/**
	 * @param {string} value
	 * @param {Rect} rect
	 * @returns {{ h: number, v: number }} h: 水平半径 (px), v: 垂直半径 (px)
	 */
	parseBorderRadiusValue(value, rect) {
		if (value == null || value === "") {
			return { h: 0, hOU: "px", v: 0, vOU: "px" };
		}
		const vs = value.split(" ");
		const withUnit = vs.length === 1 ? [vs[0], vs[0]] : vs;
		const pixels = withUnit.map((v, i) => {
			if (v.endsWith("%")) {
				return (
					(Number.parseFloat(v) / 100) * (i === 0 ? rect.width : rect.height)
				);
			}
			return Number.parseFloat(v);
		});
		return {
			h: pixels[0],
			v: pixels[1],
		};
	}

	/**
	 * @param {Text} node
	 * @param {Token=} prevToken
	 * @returns {Token | null}
	 */
	readTextToken(node, prevToken) {
		const text = node.textContent;
		if (!/[^\s]/u.test(text)) {
			if (prevToken != null && prevToken.type === "text") {
				prevToken.text += text;
			}
			return null;
		}

		// (parent) > x-text > x-char > #text
		const graphemeElement = node.parentNode;
		const parentElement = graphemeElement?.parentNode?.parentNode;
		const rect = graphemeElement.getClientRects()[0];
		const position = {
			x: rect.left - this.rootRect.left,
			y: rect.top - this.rootRect.top,
			width: rect.width,
			height: rect.height,
		};
		if (
			Number.isNaN(
				position.x + position.y + position.width + position.height,
			) ||
			position.width <= 0 ||
			position.height <= 0
		) {
			return null;
		}

		// 同じ行のテキストは連結する
		if (
			prevToken?.type === "text" &&
			prevToken.node === parentElement &&
			!textSpacingTrimList.includes(text[0]) &&
			this.isSameLine(position, prevToken)
		) {
			prevToken.text += text;
			prevToken.width = position.x + position.width - prevToken.x;
			return null;
		}

		return {
			type: "text",
			node: parentElement,
			...position,
			text,
			...this.parseFontProperties(parentElement),
		};
	}

	/**
	 *
	 * @param {Rect} a
	 * @param {Rect} b
	 */
	isSameLine(a, b) {
		const delta = a.height * 0.5;
		return a.y + delta < b.y + b.height && b.y + delta < a.y + a.height;
	}

	/**
	 * @param {HTMLElement} el
	 * @param {Rect} position
	 * @returns {Promise<ImageToken | null>}
	 */
	async parseBackgroundImageToken(el, position) {
		const { backgroundImage, mixBlendMode } = this.getComputedStyle(el);
		if (backgroundImage === "none") {
			return;
		}

		const url = backgroundImage.match(/^url\("(.+)"\)/)?.[1];
		if (url == null) {
			return;
		}

		const image = await readImage(url);

		// NOTE: 使っている機能のみ対応
		/** @type {ImageToken} */
		const token = {
			type: "image",
			node: el,
			image,
			...position,
			height: (position.width / image.width) * image.height,
			blendMode: mixBlendMode === "normal" ? undefined : mixBlendMode,
		};
		return token;
	}

	/**
	 * <img> 要素から画像トークンを生成する
	 *
	 * @param {HTMLImageElement} elem
	 * @param {Rect} position
	 * @returns {Promise<ImageToken | undefined>}
	 */
	async parseImageToken(elem, position) {
		const src = elem.getAttribute("src");
		if (src == null) {
			return;
		}
		const image = await readImage(src);
		const token = { type: "image", node: elem, image, ...position };
		if (elem.dataset.fillCurrentColor != null) {
			const parentStyle = this.getComputedStyle(elem.parentElement);
			token.fillColor = parentStyle.color;
		}
		return token;
	}

	parseFillProperties(el) {
		const computedStyle = this.getComputedStyle(el);
		return {
			radius: {
				tl: Number.parseFloat(computedStyle.borderTopLeftRadius),
				tr: Number.parseFloat(computedStyle.borderTopRightRadius),
				bl: Number.parseFloat(computedStyle.borderBottomLeftRadius),
				br: Number.parseFloat(computedStyle.borderBottomRightRadius),
			},
			boxShadow: this.parseBoxShadow(computedStyle.boxShadow),
		};
	}

	/**
	 * @param {string} boxShadow
	 * @returns {BoxShadow | undefined}
	 */
	parseBoxShadow(boxShadow) {
		// 単一、外側、スプレッド 0 のみ対応
		const colorMatch = boxShadow.match(/rgba?\([^)]+\)/);
		if (colorMatch == null) {
			return;
		}
		const color = colorMatch[0];
		const rest = (
			boxShadow.slice(0, colorMatch.index) +
			boxShadow.slice(colorMatch.index + color.length)
		)
			.trim()
			.split(/\s+/);
		const offsetX = Number.parseFloat(rest[0]);
		const offsetY = Number.parseFloat(rest[1]);
		const blurRadius = rest[2] != null ? Number.parseFloat(rest[2]) : 0;
		if (Number.isNaN(offsetX + offsetY + blurRadius)) {
			return;
		}
		return { offsetX, offsetY, blurRadius, color };
	}

	/**
	 * @param {HTMLElement} el
	 * @returns {{ x: number; y: number }}
	 */
	getTransformXY(el) {
		const computedStyle = this.getComputedStyle(el);
		const transform = computedStyle.transform;
		if (transform === "none") {
			return { x: 0, y: 0 };
		}
		const match = transform.match(
			/matrix\(([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+), ([^,]+)\)/,
		);
		if (match == null) {
			return { x: 0, y: 0 };
		}
		return { x: Number.parseFloat(match[5]), y: Number.parseFloat(match[6]) };
	}

	/**
	 * @param {HTMLElement} elem
	 * @returns {TextProp}
	 */
	parseFontProperties(elem) {
		const computedStyle = this.getComputedStyle(elem);
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
		} = computedStyle;

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
									? this.pixel
									: Number.parseFloat(textDecorationThickness),
						},
			whiteSpace,
			scaleX: scaleX != null ? Number.parseFloat(scaleX) : 1,
		};
	}
}

/**
 * @param {string} src
 * @return {Promise<HTMLImageElement>}
 */
function readImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => {
			reject(new Error("Failed to load image"));
		};
		img.src = src;
	});
}

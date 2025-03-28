/**
 * @typedef {import("./types.js").Token} Token
 * @typedef {import("./types.js").ClipToken} ClipToken
 * @typedef {import("./types.js").FillToken} FillToken
 * @typedef {import("./types.js").TextToken} TextToken
 * @typedef {import("./types.js").ImageToken} ImageToken
 * @typedef {import("./types.js").Rect} Rect
 * @typedef {import("./types.js").BoxShadow} BoxShadow
 * @typedef {import("./types.js").TextProp} TextProp
 *
 * @typedef {Object} State
 * @property {boolean} clip
 * @property {boolean} hidden
 */

/** @type {State} */
const defaultState = {
	clip: false,
	hidden: false,
};

const textSpacingTrimList = "、，。．・：；（〔［｛〈《「『【⦅〘〖«〝）〕］｝〉》」』】⦆〙〗»〟";

export class Tokenizer {
	/**
	 * @param {HTMLElement} root
	 */
	constructor(root) {
		this.root = root;
		this.window = root.ownerDocument.defaultView;
		this.getComputedStyle = this.window.getComputedStyle.bind(this.window);
		this.pixel = Number.parseFloat(this.getComputedStyle(root).fontSize) / 16;
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
			if (state.clip && !state.hidden) {
				tokens.push({
					type: "endClip",
					x: 0,
					y: 0,
					width: 0,
					height: 0,
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
						tokens.push(...(await this.readElementTokens(node, state)));
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
			return { ...parentState, clip: false };
		}

		const { display, opacity, overflow } = this.getComputedStyle(node);
		return {
			clip: overflow === "hidden",
			hidden: parentState.hidden || display === "none" || opacity === "0",
		};
	}

	/**
	 * @param {HTMLElement} elem
	 * @param {State} state
	 * @returns {Promise<Token[]>}
	 */
	async readElementTokens(elem, state) {
		/** @type {Array<Token | null>} */
		const tokens = [];

		const position = this.parseOffsetPosition(elem);
		const fill = this.parseFillColor(elem);
		const fillProps =
			state.clip || fill != null ? this.parseFillProperties(elem) : {};

		if (state.clip) {
			/** @type {ClipToken} */
			const clipToken = {
				type: "clip",
				node: elem,
				...position,
				...fillProps,
			};
			tokens.push(clipToken);
		}

		if (fill != null) {
			/** @type {FillToken} */
			const fillToken = {
				type: "fill",
				node: elem,
				...position,
				color: fill,
				...fillProps,
			};
			tokens.push(fillToken);
		}

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
	 * @param {HTMLElement} elem
	 * @returns {string | undefined}
	 */
	parseFillColor(elem) {
		const { backgroundColor } = this.getComputedStyle(elem);
		if (this.isTransparent(backgroundColor)) {
			return;
		}
		return backgroundColor;
	}

	/**
	 * @param {string} color
	 * @returns {boolean}
	 */
	isTransparent(color) {
		return color === "transparent" || color === "rgba(0, 0, 0, 0)";
	}

	/**
	 * @param {Text} node
	 * @param {Token=} prevToken
	 * @returns {Token | null}
	 */
	readTextToken(node, prevToken) {
		const text = node.textContent;
		if (text === "") {
			return null;
		}
		const graphemeElement = node.parentNode;
		const parentElement = graphemeElement?.parentNode;
		const position = this.parseOffsetPosition(graphemeElement);
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

	/**
	 * @param {HTMLElement} el
	 * @returns {Rect}
	 */
	parseOffsetPosition(el) {
		let x = 0;
		let y = 0;
		let ptr = el;
		while (ptr && ptr !== this.root) {
			x += ptr.offsetLeft;
			y += ptr.offsetTop;
			const transform = this.getTransformXY(ptr);
			x += transform.x;
			y += transform.y;
			ptr = ptr.offsetParent;
		}
		return { x, y, width: el.offsetWidth, height: el.offsetHeight };
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

import { BoxTokenizer } from "./box.js";
import { parseFontProperties } from "./text.js";
import { createsStackingContext } from "./createsStackingContext.js";
import { sortByZIndex } from "./sortByZIndex.js";
import { parseEffects } from "./effects.js";

/**
 * @typedef {import("../types.js").Token} Token
 * @typedef {import("../types.js").StackingContextProp} StackingContextProp
 * @typedef {import("../types.js").StackingContextToken} StackingContextToken
 * @typedef {import("../types.js").ClipToken} ClipToken
 * @typedef {import("../types.js").FillToken} FillToken
 * @typedef {import("../types.js").TextToken} TextToken
 * @typedef {import("../types.js").ImageToken} ImageToken
 * @typedef {import("../types.js").Rect} Rect
 * @typedef {import("../types.js").TextProp} TextProp
 *
 * @typedef {Object} State
 * @property {boolean} clipOverflow
 * @property {boolean} hidden
 * @property {StackingContextProp | null} stackingContext
 * @property {Effects | null} effects
 *
 * @typedef {import("../types.js").BlendMode} BlendMode
 *
 * @typedef {Object} Effects
 * @property {number} [opacity]
 * @property {BlendMode} [blendMode]
 */

/** @type {State} */
const defaultState = {
	clipOverflow: false,
	hidden: false,
	stackingContext: null,
	effects: null,
};

const textSpacingTrimList =
	"、，。．・：；（〔［｛〈《「『【⦅〘〖«〝）〕］｝〉》」』】⦆〙〗»〟";

export class Tokenizer {
	/**
	 * @param {HTMLElement} root
	 * @param {number} scale
	 */
	constructor(root, scale) {
		if (typeof [].toSorted !== "function") {
			throw new Error("Stable sort is not supported");
		}
		const rects = root.getClientRects();
		if (rects.length === 0) {
			throw new Error("Root element has no bounding box");
		}
		this.root = root;
		this.scale = scale;
		this.window = root.ownerDocument.defaultView;
		this.getComputedStyle = this.window.getComputedStyle.bind(this.window);
		this.rootRect = rects[0];
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

			if (!state.hidden && state.stackingContext != null) {
				tokens.push({
					type: "endStackingContext",
				});
			}

			if (!state.hidden && state.effects != null) {
				tokens.push({
					type: "endEffect",
				});
			}

			return state;
		};

		/** @type {Node} */
		let node = this.root;
		walk: while (node != null && node !== this.root.nextSibling) {
			const state = this.readState(node, states[states.length - 1]);
			pushState(state);

			if (!state.hidden && state.stackingContext != null) {
				const css = this.getComputedStyle(node);
				tokens.push({
					type: "stackingContext",
					zIndex:
						!state.stackingContext.z || css.zIndex === "auto"
							? 0
							: Number.parseInt(css.zIndex),
					reason: state.stackingContext.reason,
				});
			}

			if (!state.hidden && state.effects != null) {
				tokens.push({
					type: "effect",
					...state.effects,
				});
			}

			switch (node.nodeType) {
				case Node.ELEMENT_NODE:
					if (!state.hidden) {
						const tagName = node.tagName.toLowerCase();
						if (tagName === "x-text" || tagName === "x-char") {
							break;
						}
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

		return sortByZIndex(tokens);
	}

	/**
	 * @param {Node} node
	 * @param {State} parentState
	 * @returns {State}
	 */
	readState(node, parentState) {
		if (node.nodeType !== Node.ELEMENT_NODE) {
			return { ...parentState, clipOverflow: false, stackingContext: null };
		}

		const { display, opacity, overflow, visibility } =
			this.getComputedStyle(node);
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
			hidden:
				parentState.hidden ||
				display === "none" ||
				opacity === "0" ||
				visibility === "hidden",
			stackingContext: createsStackingContext(node),
			effects: parseEffects(node),
		};
	}

	/**
	 * @param {HTMLElement} elem
	 * @param {State} state
	 * @returns {Promise<Token[]>}
	 */
	async readElementTokens(elem, state) {
		const boxTokenizer = new BoxTokenizer({
			element: elem,
			rootRect: this.rootRect,
			getComputedStyle: this.getComputedStyle,
			scale: this.scale,
		});
		return await boxTokenizer.tokenize(state);
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
			...parseFontProperties(this.getComputedStyle(parentElement)),
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
}

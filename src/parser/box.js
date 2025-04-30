import { readImage } from "./image.js";
import {
	compositePath,
	polygonPath,
	rectPath,
	roundedRectPath,
} from "./path.js";
import { offsetRadius, offsetRect } from "./utils.js";
import { parseColor, isTransparent, parseBoxShadow } from "./parser.js";

export class BoxTokenizer {
	/** @type {HTMLElement} */
	element;
	/** @type {Rect} */
	rootRect;
	/** @type {() => CSSStyleDeclaration} */
	getComputedStyle;
	/** @type {number} */
	scale;

	constructor({ element, rootRect, getComputedStyle, scale }) {
		this.element = element;
		this.rootRect = rootRect;
		this.getComputedStyle = getComputedStyle;
		this.scale = scale;
		this.rects = element.getClientRects();
		this.css = getComputedStyle(element);
	}

	async tokenize(state) {
		// rects.length > 1 の場合は必ず複数行にまたがるインライン要素なので、次のようにレンダリングする
		// 1. すべての rects の幅を合計した仮想的な矩形を想像する
		// 2. その矩形の中に background-color, background-image, border, box-shadow を描画する
		// 3. 各 rect にクリップを適用し、その中に仮想的な矩形を描画する
		//    このとき、オフセットは現在の rect 以前の rects の幅の合計とする
		const { element: elem, rects, css } = this;

		// display: contents, display: none はボックスを生成しない
		if (rects.length === 0) {
			return [];
		}

		const mainRect = rects[0];

		/** @type {Array<Token | null>} */
		const tokens = [];

		const backgroundClip = css.backgroundClip;
		if (backgroundClip === "text") {
			// Unsupported: background-clip: text
			return [];
		}

		const usePaddingBox = css.backgroundClip === "padding-box";
		const isVertical =
			css.writingMode === "vertical-rl" || css.writingMode === "vertical-lr";
		const wmX = isVertical ? "y" : "x";
		const wmY = isVertical ? "x" : "y";
		const wmWidth = isVertical ? "height" : "width";
		const wmHeight = isVertical ? "width" : "height";

		// インライン要素は行ごとに矩形を生成する
		const virtualRect = {
			[wmX]: 0,
			[wmY]: 0,
			[wmWidth]: Array.from(rects).reduce(
				(acc, rect) => acc + rect[wmWidth],
				0,
			),
			[wmHeight]: mainRect[wmHeight],
		};

		if (virtualRect.width <= 0 || virtualRect.height <= 0) {
			return [];
		}

		// 要素のアウトライン
		const { radius, borders, borderBoxPath, paddingBoxRadius, paddingBoxPath } =
			this.getBoxPaths(css, virtualRect);

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

		const boxShadows = parseBoxShadow(css.boxShadow);

		const fillColor = parseColor(css.backgroundColor);

		const backgroundPath = usePaddingBox ? paddingBoxPath : borderBoxPath;
		const borderPath = compositePath(
			[borderBoxPath, paddingBoxPath],
			"evenodd",
		);

		let offset = 0;
		let rectIndex = -1;
		for (const absRect of rects) {
			rectIndex++;
			const isFirst = rectIndex === 0;
			const isLast = rectIndex === rects.length - 1;

			const rect = {
				x: absRect.x - this.rootRect.x,
				y: absRect.y - this.rootRect.y,
				width: absRect.width,
				height: absRect.height,
			};

			// Add box-shadow
			const outsetBoxShadows = boxShadows
				.filter((boxShadow) => boxShadow.position === "outset")
				.reverse(); // box-shadow は先頭にあるものが一番上に描画される
			if (outsetBoxShadows.length > 0) {
				// 行ごとに分割される場合はマスクをかける
				const start = isFirst ? 0 : rect[wmX];
				const end = isLast ? this.rootRect[wmWidth] : this.rootRect[wmHeight];
				tokens.push({
					tag: "box-shadow",
					type: "clip",
					node: elem,
					[wmX]: start,
					[wmY]: 0,
					rect: {
						[wmWidth]: end - start,
						[wmHeight]: this.rootRect[wmHeight],
					},
				});

				// border-box の内側に描画されないようマスクをかける
				let bleeding = 0;
				for (const boxShadow of outsetBoxShadows) {
					const { x, y, blur, spread } = boxShadow;
					bleeding = Math.max(
						bleeding,
						blur + spread + Math.max(x < 0 ? -x : x, y < 0 ? -y : y),
					);
				}
				const outerPath = rectPath(
					offsetRect(virtualRect, [bleeding, bleeding, bleeding, bleeding]),
				);
				tokens.push({
					tag: "box-shadow",
					type: "clip",
					node: elem,
					[wmX]: offset + rect[wmX],
					[wmY]: rect[wmY],
					path: compositePath([outerPath, borderBoxPath], "evenodd"),
				});

				for (const boxShadow of boxShadows) {
					const { color, x, y, blur, spread } = boxShadow;
					const boxOffset = [spread, spread, spread, spread];

					tokens.push({
						tag: "box-shadow",
						type: "fill",
						node: elem,
						[wmX]: rect[wmX] + boxShadow[wmX] + offset,
						[wmY]: rect[wmY] + boxShadow[wmY],
						path: roundedRectPath(
							offsetRect(virtualRect, boxOffset),
							offsetRadius(radius, boxOffset),
						),
						color,
						filter: `blur(${blur}px)`,
					});
					console.log(tokens[tokens.length - 1]);
				}

				tokens.push({ tag: "box-shadow", type: "endClip" });
				tokens.push({ tag: "box-shadow", type: "endClip" });
			}

			// 矩形を原点に移動する
			tokens.push({
				tag: "background-and-border",
				type: "transform",
				matrix: [1, 0, 0, 1, rect.x, rect.y],
			});

			// Add background-color
			if (fillColor != null) {
				tokens.push({
					tag: "background-color",
					type: "clip",
					node: elem,
					x: 0,
					y: 0,
					rect: {
						width: rect.width,
						height: rect.height,
					},
				});
				tokens.push({
					tag: "background-color",
					type: "fill",
					node: elem,
					[wmX]: offset,
					[wmY]: 0,
					path: backgroundPath,
					color: fillColor,
				});
				tokens.push({ tag: "background-color", type: "endClip" });
			}

			// Add inset box-shadow
			const insetBoxShadows = boxShadows
				.filter((boxShadow) => boxShadow.position === "inset")
				.reverse(); // box-shadow は先頭にあるものが一番上に描画される
			if (insetBoxShadows.length > 0) {
				tokens.push({
					tag: "box-shadow-inset",
					type: "clip",
					node: elem,
					x: 0,
					y: 0,
					path: paddingBoxPath,
				});

				for (const boxShadow of insetBoxShadows) {
					const { color, x, y, blur, spread } = boxShadow;
					const bleeding = blur + Math.max(x < 0 ? -x : x, y < 0 ? -y : y);
					const outerPath = rectPath(
						offsetRect(virtualRect, [bleeding, bleeding, bleeding, bleeding]),
					);
					const innerOffset = [-spread, -spread, -spread, -spread];
					const innerPath = roundedRectPath(
						offsetRect(virtualRect, innerOffset),
						offsetRadius(radius, innerOffset),
					);
					tokens.push({
						tag: "box-shadow-inset",
						type: "fill",
						node: elem,
						[wmX]: offset + boxShadow[wmX],
						[wmY]: boxShadow[wmY],
						path: compositePath([outerPath, innerPath], "evenodd"),
						color,
						filter: `blur(${blur}px)`,
					});
				}

				tokens.push({ tag: "box-shadow-inset", type: "endClip" });
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
			const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
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
				const rSN = paddingBoxRadius[(i * 2 + 7) % 8];
				const rST = paddingBoxRadius[(i * 2 + 0) % 8];
				const rEN = paddingBoxRadius[(i * 2 + 2) % 8];
				const rET = paddingBoxRadius[(i * 2 + 1) % 8];

				const S = { x: 0, y: 0 };
				const E = { x: len, y: 0 };
				const CSP = { x: wTS + rST, y: wN + rSN };
				const CEP = { x: len - (wTE + rET), y: wN + rEN };
				const PS = { x: (CSP.y * wTS) / wN, y: CSP.y };
				const PE = { x: len - (CEP.y * wTE) / wN, y: CEP.y };

				const clipPath = polygonPath(
					[S, PS, CSP, CEP, PE, E].map((point) => add(rotate(point), origin)),
				);
				tokens.push({
					tag: `border-${borders[i].side}`,
					type: "clip",
					node: elem,
					x: 0,
					y: 0,
					path: clipPath,
				});
				tokens.push({
					tag: `border-${borders[i].side}`,
					type: "fill",
					node: elem,
					[wmX]: offset,
					[wmY]: 0,
					path: borderPath,
					color: borders[i].color,
				});
				tokens.push({
					tag: `border-${borders[i].side}`,
					type: "endClip",
				});
			}

			if (
				tokens.length > 0 &&
				tokens[tokens.length - 1].tag === "background-and-border" &&
				tokens[tokens.length - 1].type === "transform"
			) {
				// No contents
				tokens.pop();
			} else {
				tokens.push({ tag: "background-and-border", type: "endTransform" });
			}

			offset -= rect[wmWidth];
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
	 * rect の左上を原点とする border-box, padding-box の角丸半径を取得する
	 *
	 * @param {CSSStyleDeclaration} css
	 * @param {Rect} rect
	 * @returns {{
	 *   radius: number[],
	 *   borders: { width: number, color: string }[],
	 *   borderBoxPath: Path,
	 *   paddingBoxRadius: number[],
	 *   paddingBoxPath: Path
	 * }}
	 */
	getBoxPaths(css, rect) {
		const radius = this.parseBorderRadius(css, rect);
		const borders = this.parseBorders(css);

		const borderBoxPath = roundedRectPath(rect, radius);

		const paddingBoxOffset = borders.map((b) => -b.width);
		const paddingBoxRadius = offsetRadius(radius, paddingBoxOffset);
		const paddingBoxPath = roundedRectPath(
			offsetRect(rect, paddingBoxOffset),
			paddingBoxRadius,
		);

		return {
			radius,
			borders,
			borderBoxPath,
			paddingBoxRadius,
			paddingBoxPath,
		};
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
			return { h: 0, v: 0 };
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
				isTransparent(color)
			) {
				return { style: "none", width: 0, color: "transparent" };
			}
			return { Side: side, side: side.toLowerCase(), style, width, color };
		});
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
}

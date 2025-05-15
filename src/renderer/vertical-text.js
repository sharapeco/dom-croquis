/**
 * @typedef {Object} DrawVerticalTextStyles
 * @property {string} [fillStyle]
 * @property {string} [font]
 * @property {string} [fontKerning]
 * @property {string} [fontStretch]
 * @property {string} [fontVariantCaps]
 * @property {string} [letterSpacing]
 * @property {string} [textAlign]
 */

/** @type {"vertical" | "horizontal" | undefined} */
let verticalRenderingType;

/**
 * Canvas に writingMode = "vertical-rl" を設定したときに
 * テキストが縦方向に描画される (vertical) か、
 * それとも反時計回りに90度回転して描画される (horizontal) かを検出する
 */
export function detectVerticalRenderingType() {
	if (verticalRenderingType) {
		return verticalRenderingType;
	}

	const canvas = createHiddenCanvas(10, 5);

	// "vertical-rl" is only reflected when the canvas is attached to the DOM.
	document.body.appendChild(canvas);

	const ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, 10, 5);
	ctx.font = "10px/1 'Hiragino Kaku Gothic', 'Meiryo', sans-serif";
	ctx.fillText("鬼", 0, 10);

	const imageData = ctx.getImageData(0, 0, 10, 5);
	const data = imageData.data;
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] >= 32) {
			verticalRenderingType = "horizontal";
			return "horizontal";
		}
	}
	verticalRenderingType = "vertical";

	canvas.remove();
	return "vertical";
}

export class VerticalTextRenderer {
	/**
	 * @param {number} width Width of the rendering area
	 * @param {number} height Height of the rendering area
	 * @param {number} scale Scale of the rendering area
	 */
	constructor(width, height, scale) {
		this.width = width;
		this.height = height;
		this.scale = scale;
		this.initialized = false;
	}

	init() {
		this.type = detectVerticalRenderingType();
		this.vCanvas = createHiddenCanvas(this.width, this.height);
		this.vCtx = this.vCanvas.getContext("2d");
		this.vCtx.scale(this.scale, this.scale);

		// "vertical-rl" is only reflected when the canvas is attached to the DOM.
		document.body.appendChild(this.vCanvas);

		this.initialized = true;
	}

	destroy() {
		this.vCanvas.remove();
	}

	/**
	 * Draws vertical text on a canvas.
	 *
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {string} text
	 * @param {number} x Begin point of x coordinate (middle of the line)
	 * @param {number} y Begin point of y coordinate
	 * @param {DrawVerticalTextStyles} [styles]
	 */
	render(ctx, text, x, y, styles) {
		this.vCtx.clearRect(0, 0, this.width, this.height);

		for (const key in styles) {
			this.vCtx[key] = styles[key];
		}
		this.vCtx.textBaseline = "middle";

		if (this.type === "vertical") {
			this.vCtx.fillText(text, x, y);
		} else {
			this.vCtx.save();
			this.vCtx.transform(0, 1, -1, 0, x + y, y - x);
			this.vCtx.fillText(text, x, y);
			this.vCtx.restore();
		}

		ctx.drawImage(this.vCanvas, 0, 0, this.width, this.height);
	}
}

function createHiddenCanvas(width, height) {
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const style = canvas.style;
	style.writingMode = "vertical-rl";
	style.position = "absolute";
	style.left = "-1000px";
	style.top = "0";
	style.visibility = "hidden";

	return canvas;
}

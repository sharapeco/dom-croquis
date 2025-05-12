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
			console.log("verticalRenderingType", "horizontal");
			return "horizontal";
		}
	}
	verticalRenderingType = "vertical";
	console.log("verticalRenderingType", "vertical");

	canvas.remove();
	return "vertical";
}

/**
 * Draws vertical text on a canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 * @param {number} x Begin point of x coordinate (middle of the line)
 * @param {number} y Begin point of y coordinate
 * @param {number} scale
 * @param {DrawVerticalTextStyles} [styles]
 */
export function drawVerticalText(canvas, text, x, y, scale = 1, styles = {}) {
	const type = detectVerticalRenderingType();

	const vCanvas = createHiddenCanvas(canvas.width, canvas.height);

	// "vertical-rl" is only reflected when the canvas is attached to the DOM.
	document.body.appendChild(vCanvas);

	const vCtx = vCanvas.getContext("2d");
	for (const key in styles) {
		vCtx[key] = styles[key];
	}
	vCtx.textBaseline = "middle";
	vCtx.scale(scale, scale);

	if (type === "vertical") {
		vCtx.fillText(text, x, y);
	} else {
		vCtx.transform(0, 1, -1, 0, x + y, y - x);
		vCtx.fillText(text, x, y);
	}

	const ctx = canvas.getContext("2d");
	ctx.drawImage(vCanvas, 0, 0, canvas.width, canvas.height);

	vCanvas.remove();
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

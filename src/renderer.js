/**
 * @typedef {import("./types.js").Token} Token
 * @typedef {import("./types.js").ClipToken} ClipToken
 * @typedef {import("./types.js").FillToken} FillToken
 * @typedef {import("./types.js").TextToken} TextToken
 * @typedef {import("./types.js").ImageToken} ImageToken
 */

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const textOffsetY = isSafari ? -1 : 1;
const underlineOffset = isSafari ? 0.5 : -2.5;

export function render(tokens, options = {}) {
	const { width, height, scale } = options;

	const canvas = document.createElement("canvas");
	canvas.width = width * scale;
	canvas.height = height * scale;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get 2d context");
	}
	ctx.scale(scale, scale);

	for (const token of tokens) {
		switch (token.type) {
			case "clip":
				ctx.save();
				clip(ctx, token);
				break;
			case "endClip":
				ctx.restore();
				break;
			case "fill":
				fill(ctx, token);
				break;
			case "text":
				text(ctx, token, scale);
				break;
			case "image":
				image(ctx, token, scale);
				break;
		}
	}

	return canvas;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {FillToken} token
 */
function clip(ctx, token) {
	ctx.beginPath();
	drawRect(ctx, token);
	ctx.clip();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {FillToken} token
 */
function fill(ctx, token) {
	ctx.fillStyle = token.color;
	if (token.boxShadow) {
		const { offsetX, offsetY, blurRadius, color } = token.boxShadow;
		ctx.shadowOffsetX = offsetX;
		ctx.shadowOffsetY = offsetY;
		ctx.shadowBlur = blurRadius;
		ctx.shadowColor = color;
	}

	ctx.beginPath();
	drawRect(ctx, token);
	ctx.fill();

	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;
	ctx.shadowBlur = 0;
	ctx.shadowColor = "transparent";
}

/**
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {ClipToken | FillToken} token
 */
function drawRect(ctx, token) {
	const k = 0.5522847498;
	const kk = 1 - k;
	const {
		x,
		y,
		width,
		height,
		radius: { tl, tr, bl, br },
	} = token;

	ctx.moveTo(x + width / 2, y);
	ctx.lineTo(x + width - tr, y);
	if (tr > 0) {
		ctx.bezierCurveTo(
			x + width - kk * tr,
			y,
			x + width,
			y + kk * tr,
			x + width,
			y + tr,
		);
	}
	ctx.lineTo(x + width, y + height - br);
	if (br > 0) {
		ctx.bezierCurveTo(
			x + width,
			y + height - kk * br,
			x + width - kk * br,
			y + height,
			x + width - br,
			y + height,
		);
	}
	ctx.lineTo(x + bl, y + height);
	if (bl > 0) {
		ctx.bezierCurveTo(
			x + kk * bl,
			y + height,
			x,
			y + height - kk * bl,
			x,
			y + height - bl,
		);
	}
	ctx.lineTo(x, y + tl);
	if (tl > 0) {
		ctx.bezierCurveTo(x, y + kk * tl, x + kk * tl, y, x + tl, y);
	}
	ctx.lineTo(x + width / 2, y);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {TextToken} token
 * @param {number} scale
 */
function text(ctx, token, scale) {
	const text = prepareText(token);

	ctx.textBaseline = "top";
	ctx.fillStyle = token.color;
	ctx.font = token.font;
	ctx.fontKerning = token.fontKerning;
	ctx.fontStretch = token.fontStretch;
	ctx.fontVariantCaps = token.fontVariantCaps;
	ctx.letterSpacing = token.letterSpacing;
	ctx.textAlign = token.textAlign;
	const x = (() => {
		switch (token.textAlign) {
			case "center":
				return token.x + token.width / 2;
			case "right":
				return token.x + token.width;
			default:
				return token.x;
		}
	})();
	const y = token.y + (token.height - token.fontSize) / 2 + textOffsetY;
	const scaleX = token.scaleX ?? 1;

	ctx.setTransform(scale * scaleX, 0, 0, scale, x * scale, y * scale);
	ctx.fillText(text, 0, 0);
	ctx.setTransform(scale, 0, 0, scale, 0, 0);

	const { textDecoration } = token;
	if (textDecoration) {
		ctx.strokeStyle = textDecoration.color;
		ctx.lineWidth = textDecoration.thickness;
		if (textDecoration.underline) {
			const y = token.y + token.height + underlineOffset;
			ctx.beginPath();
			ctx.moveTo(token.x, y);
			ctx.lineTo(token.x + token.width, y);
			ctx.stroke();
		}
		// NOTE: overline, line-through は使用していないので実装しない
	}
}

function prepareText(token) {
	const { text, whiteSpace } = token;
	if (whiteSpace === "pre" || whiteSpace === "pre-wrap" || whiteSpace === "break-spaces" || whiteSpace === "preserve-spaces") {
		return text.trim();
	}
	return text.replace(/\s+/g, " ");
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ImageToken} token
 * @param {number} scale
 */
async function image(ctx, token, scale) {
	if (token.blendMode != null) {
		ctx.globalCompositeOperation = token.blendMode;
	}
	if (!token.fillColor) {
		ctx.drawImage(
			token.image,
			0,
			0,
			token.image.width,
			token.image.height,
			token.x,
			token.y,
			token.width,
			token.height,
		);
	} else {
		const canvas = document.createElement("canvas");
		canvas.width = token.width * scale;
		canvas.height = token.height * scale;
		const ctx2 = canvas.getContext("2d");
		if (!ctx2) {
			throw new Error("Failed to get 2d context");
		}
		ctx2.scale(scale, scale);
		ctx2.globalCompositeOperation = "source-over";
		ctx2.fillStyle = token.fillColor;
		ctx2.fillRect(0, 0, token.width, token.height);
		ctx2.globalCompositeOperation = "destination-in";
		ctx2.drawImage(
			token.image,
			0,
			0,
			token.image.width,
			token.image.height,
			0,
			0,
			token.width,
			token.height,
		);
		ctx.drawImage(canvas, token.x, token.y, token.width, token.height);
	}

	// デフォルトに戻す
	ctx.globalCompositeOperation = "source-over";
}

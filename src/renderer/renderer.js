/**
 * @typedef {import("../types.js").Token} Token
 * @typedef {import("../types.js").ClipToken} ClipToken
 * @typedef {import("../types.js").TransformToken} TransformToken
 * @typedef {import("../types.js").FillToken} FillToken
 * @typedef {import("../types.js").TextToken} TextToken
 * @typedef {import("../types.js").ImageToken} ImageToken
 */

import { createPath2d } from "./path.js";
import { supportsCanvasBlur, blur } from "./blur.js";

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const textOffsetY = isSafari ? -1 : 1;
const underlineOffset = isSafari ? 0.5 : -2.5;

export function render(tokens, options = {}) {
	const { width, height, scale } = options;

	const createCanvas = (existingCanvas) => {
		const canvas = existingCanvas ?? document.createElement("canvas");
		canvas.width = width * scale;
		canvas.height = height * scale;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Failed to get 2d context");
		}
		ctx.scale(scale, scale);

		return { canvas, ctx };
	};

	const rootLayer = createCanvas(options.canvas);
	const layers = [rootLayer];
	let { canvas, ctx } = rootLayer;

	for (const token of tokens) {
		switch (token.type) {
			case "effect": {
				ctx.save();
				if (token.opacity != null) {
					ctx.globalAlpha = token.opacity;
				}
				if (token.blendMode != null) {
					ctx.globalCompositeOperation = token.blendMode;
				}

				const newLayer = createCanvas();
				layers.push(newLayer);
				canvas = newLayer.canvas;
				ctx = newLayer.ctx;
				break;
			}
			case "endEffect": {
				const effectLayer = layers.pop();
				canvas = layers[layers.length - 1].canvas;
				ctx = layers[layers.length - 1].ctx;
				ctx.drawImage(effectLayer.canvas, 0, 0, width, height);
				ctx.restore();
				break;
			}
			case "clip":
				ctx.save();
				clip(ctx, token);
				break;
			case "transform":
				ctx.save();
				ctx.transform(...token.matrix);
				break;
			case "endClip":
			case "endTransform":
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
 * @param {ClipToken} token
 */
function clip(ctx, token) {
	if (token.path) {
		const path2d = createPath2d(token.path);
		ctx.translate(token.x, token.y);
		ctx.clip(path2d, token.path.fillRule ?? "nonzero");
		ctx.translate(-token.x, -token.y);
		return;
	}
	if (token.rect) {
		ctx.rect(token.x, token.y, token.rect.width, token.rect.height);
		ctx.clip();
	}
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {FillToken} token
 */
function fill(ctx, token) {
	ctx.save();

	ctx.fillStyle = token.color;
	if (token.filter != null) {
		ctx.filter = token.filter;
	}

	const blurRadius = getBlurRadius(token.filter);
	let blurCanvas;
	let blurCtx;
	if (!supportsCanvasBlur() && blurRadius > 0) {
		blurCanvas = document.createElement("canvas");
		blurCanvas.width = token.rect.width;
		blurCanvas.height = token.rect.height;
		blurCtx = blurCanvas.getContext("2d");
		blurCtx.fillStyle = token.color;
		blurCtx.translate(-token.rect.x, -token.rect.y);
	} else {
		ctx.translate(token.x, token.y);
	}

	const targetCtx = blurCtx ?? ctx;

	if (token.path) {
		const path2d = createPath2d(token.path);
		targetCtx.translate(0, 0);
		targetCtx.fill(path2d, token.path.fillRule ?? "nonzero");
	} else {
		targetCtx.rect(0, 0, token.rect.width, token.rect.height);
		targetCtx.fill();
	}

	if (blurCtx) {
		blur(blurCanvas, blurRadius);
		ctx.drawImage(blurCanvas, token.x + token.rect.x, token.y + token.rect.y);
	}

	ctx.restore();
}

function getBlurRadius(filter) {
	const blurRadius = filter?.match(/blur\((\d+)px\)/)?.[1];
	if (!blurRadius) {
		return 0;
	}
	const radius = Number.parseInt(blurRadius);
	return Number.isNaN(radius) ? 0 : radius;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {TextToken} token
 * @param {number} scale
 */
function text(ctx, token, scale) {
	const text = prepareText(token);

	ctx.save();
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
	ctx.restore();

	ctx.save();
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
	ctx.restore();
}

function prepareText(token) {
	const { text, whiteSpace } = token;
	if (
		whiteSpace === "pre" ||
		whiteSpace === "pre-wrap" ||
		whiteSpace === "break-spaces" ||
		whiteSpace === "preserve-spaces"
	) {
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
}

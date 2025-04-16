/**
 * @typedef {import("../types.js").Token} Token
 * @typedef {import("../types.js").ClipToken} ClipToken
 * @typedef {import("../types.js").FillToken} FillToken
 * @typedef {import("../types.js").TextToken} TextToken
 * @typedef {import("../types.js").ImageToken} ImageToken
 */

import { createPath2d } from "./path.js";

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const textOffsetY = isSafari ? -1 : 1;
const underlineOffset = isSafari ? 0.5 : -2.5;

export function render(tokens, options = {}) {
	const { width, height, scale } = options;

	const canvas = options.canvas ?? document.createElement("canvas");
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

	if (token.boxShadow) {
		const { offsetX, offsetY, blurRadius, color } = token.boxShadow;
		ctx.shadowOffsetX = offsetX;
		ctx.shadowOffsetY = offsetY;
		ctx.shadowBlur = blurRadius;
		ctx.shadowColor = color;
	}

	if (token.path) {
		const path2d = createPath2d(token.path);
		ctx.translate(token.x, token.y);
		ctx.fill(path2d, token.path.fillRule ?? "nonzero");
	} else {
		ctx.rect(token.x, token.y, token.rect.width, token.rect.height);
		ctx.fill();
	}

	ctx.restore();
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

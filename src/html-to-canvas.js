/**
 * @typedef {Object} Options
 * @property {number=} width
 * @property {number=} height
 * @property {number=} scale
 */

import { render } from "./renderer.js";
import { Tokenizer } from "./tokenizer.js";
import { Sandbox } from "./sandbox.js";

/**
 * @param {HTMLElement} root
 * @param {Options} options
 * @param {boolean=} [options.debug]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function htmlToCanvas(root, options = {}) {
	options.debug = true;
	const scale = Math.abs(options.scale ?? window.devicePixelRatio ?? 1);

	const sandbox = new Sandbox(root, options);
	const [iframe, promise] = await sandbox.create();
	document.body.appendChild(iframe);
	const targetClone = await promise;

	const tokenizer = new Tokenizer(targetClone, getComputedStyle);
	const tokens = await tokenizer.tokenize();
	console.log("[html-to-canvas.js] tokens", tokens);

	const canvas = render(tokens, {
		width: options.width ?? root.clientWidth,
		height: options.height ?? root.clientHeight,
		scale,
	});

	if (!options.debug) {
		sandbox.destroy();
	}

	if (options.debug) {
		const iframeStyle = sandbox.iframe.style;
		iframeStyle.border = "dotted 5px red";
		iframeStyle.position = "static";
		iframeStyle.visibility = "visible";
	}

	return canvas;
}

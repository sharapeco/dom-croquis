import { DocumentCloner } from "./document-cloner.js";
import { tinyUid } from "./tiny-uid.js";

const CALLBACK_PREFIX = "htmlToCanvas_Sandbox_callback_";

const _global =
	typeof self !== "undefined"
		? self
		: typeof globalThis !== "undefined"
			? globalThis
			: typeof global !== "undefined"
				? global
				: typeof window !== "undefined"
					? window
					: {};

export class Sandbox {
	/**
	 * @param {HTMLElement} root
	 * @param {Object} options
	 * @param {boolean=} [options.debug]
	 */
	constructor(root, options = {}) {
		this.root = root;
		this.options = options;

		/** @type {string} */
		this.callbackFunctionName = `${CALLBACK_PREFIX}${tinyUid().replace(/-/g, "")}`;
	}

	async create() {
		const ownerDocument = this.root.ownerDocument;
		if (!ownerDocument) {
			throw new Error("Root element must be in a document");
		}

		const documentCloner = new DocumentCloner(this.root);
		documentCloner.clone();

		const body = documentCloner.root.querySelector("body");
		if (!body) {
			throw new Error("Body element not found");
		}
		body.appendChild(this.createCallback(documentCloner.doc));

		const iframe = ownerDocument.createElement("iframe");
		const iframeStyle = iframe.style;
		iframeStyle.width = "100vw";
		iframeStyle.height = "100vh";
		iframeStyle.position = "fixed";
		iframeStyle.zIndex = "-2147483647";
		iframeStyle.top = "0";
		iframeStyle.left = "-110vw";
		iframeStyle.visibility = "hidden";
		this.iframe = iframe;

		const blob = new Blob([documentCloner.clonedHTML], { type: "text/html" });
		iframe.src = URL.createObjectURL(blob);

		return [iframe, new Promise((resolve) => {
			_global[this.callbackFunctionName] = (target) => resolve(target);
		})];
	}

	destroy() {
		delete _global[this.callbackFunctionName];
		this.iframe.remove();
	}

	/**
	 * @param {Document} doc
	 * @returns {HTMLScriptElement} コールバック関数を呼び出すための script 要素
	 */
	createCallback(doc) {
		const script = doc.createElement("script");
		const selector = `[${DocumentCloner.MARK_ATTR}]`;
		script.textContent = `window.parent.${this.callbackFunctionName}(document.querySelector('${selector}'));`;
		return script;
	}
}

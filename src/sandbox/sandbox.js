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

		const { root, doc } = documentCloner;

		const head = root.querySelector("head");
		if (!head) {
			throw new Error("Head element not found");
		}
		const base = doc.createElement("base");
		base.setAttribute("href", location.href);
		head.appendChild(base);

		const body = root.querySelector("body");
		if (!body) {
			throw new Error("Body element not found");
		}
		body.appendChild(this.createScripts(doc));

		const callbackPromise = new Promise((resolve) => {
			_global[this.callbackFunctionName] = (target) => resolve(target);
		});

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

		const iframeLoadPromise = new Promise((resolve, reject) => {
			iframe.addEventListener("load", () => {
				URL.revokeObjectURL(iframe.src);
				resolve();
			});
			iframe.addEventListener("error", () => {
				reject(new Error("Failed to load iframe"));
			});
		});

		const blob = new Blob([documentCloner.clonedHTML], { type: "text/html" });
		iframe.src = URL.createObjectURL(blob);

		return [
			iframe,
			new Promise((resolve, reject) => {
				Promise.all([callbackPromise, iframeLoadPromise])
					.then(([targetClone]) => resolve(targetClone))
					.catch(reject);
			}),
		];
	}

	destroy() {
		delete _global[this.callbackFunctionName];
		this.iframe.remove();
	}

	/**
	 * @param {Document} doc
	 * @returns {HTMLScriptElement} コールバック関数を呼び出すための script 要素
	 */
	createScripts(doc) {
		const script = doc.createElement("script");
		script.type = "module";
		const selector = `[${DocumentCloner.MARK_ATTR}]`;
		script.textContent = `function replaceHref(href) {
	const url = new URL(href);
	url.searchParams.set("__dom-croquis-sandbox", "${Date.now()}");
	return url.toString();
}
for (const link of document.querySelectorAll("link[rel='stylesheet']")) {
	link.setAttribute("href", replaceHref(link.href));
}
window.addEventListener("load", () => {
	window.parent.${this.callbackFunctionName}(document.querySelector('${selector}'));
});`;
		return script;
	}
}

import { splitChar } from "./split-char.js";

/**
 * DOMを複製する
 *
 * - 対象の要素に目印をつける
 * - DOCTYPE宣言を揃える（CSSの解釈に影響する）
 * - <script> を除いてDOMツリーを複製する
 * - テキストノードは <x-text> 要素にし、内容を1文字ずつ <x-char> 要素に分割する
 * - 連続する <x-text> 要素は1つの <x-text> 要素にまとめる
 * - <x-text>, <x-char> 要素のスタイルを定義する
 * - 目印を伝える
 */
export class DocumentCloner {
	/** @type {string} 目印の属性名 */
	static MARK_ATTR = "data-html-to-canvas-target";

	/**
	 * @param {HTMLElement} target
	 */
	constructor(target) {
		/** @type {HTMLElement} */
		this.target = target;
		/** @type {Document} */
		this.doc = null;
		/** @type {HTMLElement | null} */
		this.root = null;
	}

	clone() {
		this.target.setAttribute(DocumentCloner.MARK_ATTR, "true");

		const ownerDocument = this.target.ownerDocument;
		if (!ownerDocument) {
			throw new Error("Target must be in a document");
		}
		this.doc = ownerDocument;

		this.root = this.cloneRootNode(ownerDocument.documentElement);

		this.target.removeAttribute(DocumentCloner.MARK_ATTR);
	}

	get clonedHTML() {
		return `${this.serializeDoctype(this.doc.doctype)}${this.root.outerHTML}`;
	}

	/**
	 * @param {Node} root
	 * @returns {Node}
	 */
	cloneRootNode(root) {
		const rootClone = this.cloneNode(root);
		this.combineTextElements(rootClone);
		this.defineStyles(rootClone);
		return rootClone;
	}

	/**
	 * 連続する <x-text> 要素は1つの <x-text> 要素にまとめる
	 * @param {Node} root
	 */
	combineTextElements(root) {
		for (const text of root.querySelectorAll("x-text + x-text")) {
			const prevText = text.previousSibling;
			if (prevText != null && prevText.nodeName === "X-TEXT") {
				for (const char of text.childNodes) {
					prevText.appendChild(char);
				}
				text.remove();
			}
		}
	}

	/**
	 * <x-text>, <x-char> 要素のスタイルを定義する
	 * @param {Node} root
	 */
	defineStyles(root) {
		const style = this.doc.createElement("style");
		style.textContent = `
		x-text, x-char {
			display: inline !important;
		}
		`;
		root.appendChild(style);
	}

	/**
	 * @param {Node} node
	 * @param {boolean} [inBody=false]
	 * @returns {Node | null}
	 */
	cloneNode(node, inBody = false) {
		switch (node.nodeType) {
			case Node.ELEMENT_NODE:
				return this.cloneElementNode(node, inBody);
			case Node.TEXT_NODE:
				return this.cloneTextNode(node, inBody);
			default:
				return null;
		}
	}

	/**
	 * @param {Element} element
	 * @param {boolean} [inBody=false]
	 * @returns {Element}
	 */
	cloneElementNode(element, inBody = false) {
		if (element.tagName === "SCRIPT") {
			return null;
		}
		const clone = element.cloneNode(false);
		for (const child of element.childNodes) {
			const childClone = this.cloneNode(child, inBody || element.tagName === "BODY");
			if (childClone != null) {
				clone.appendChild(childClone);
			}
		}
		return clone;
	}

	/**
	 * @param {Text} text
	 * @param {boolean} [inBody=false]
	 * @returns {Element}
	 */
	cloneTextNode(text, inBody = false) {
		if (!inBody) {
			return text.cloneNode();
		}
		if (!/[^\s]/u.test(text.textContent)) {
			// 空白文字のみのテキストノードはそのまま返す
			return text.cloneNode();
		}
		const clone = this.doc.createElement("x-text");
		for (const char of splitChar(text.textContent)) {
			const charClone = this.doc.createElement("x-char");
			// textContent が一番速い
			// https://www.measurethat.net/Benchmarks/Show/17024/0/createtextnode-vs-textcontent-vs-innertext-vs-append-vs
			charClone.textContent = char;
			clone.appendChild(charClone);
		}
		return clone;
	}

	/**
	 * @param {DocumentType} doctype
	 * @returns {string}
	 */
	serializeDoctype(doctype) {
		let str = "";
		if (doctype) {
			str += "<!DOCTYPE";
			if (doctype.name) {
				str += ` ${doctype.name}`;
			}
			if (doctype.internalSubset) {
				str += ` ${doctype.internalSubset}`;
			}
			if (doctype.publicId) {
				str += ` "${doctype.publicId}"`;
			}
			if (doctype.systemId) {
				str += ` "${doctype.systemId}"`;
			}
			str += ">";
		}
		return str;
	}
}

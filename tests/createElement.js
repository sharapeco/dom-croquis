/**
 * @typedef {string | (() => Node)} TagOrComponent
 *
 * @typedef {Record<string, string | Record<string, string> | Record<string, EventListener>>} AttributeList
 *
 * @typedef {Object} CreateElementWithRefReturn
 * @property {HTMLElement} element
 * @property {Record<string, HTMLElement>} refs
 * @property {(() => void)[]} subscriptions イベントリスナの解除関数の配列
 *
 * @typedef {CreateElementWithRefReturn | Node | string | number | boolean | null | undefined} ChildType
 */

/**
 * DOM要素を生成する
 *
 * @param {TagOrComponent} tag タグ名
 * @param {AttributeList} attributes 属性の連想配列
 * @param {ChildType[]} children DOM要素または文字列の配列。文字列はテキストノードとして追加される
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = []) {
	const { element } = createElementWithRef(tag, attributes, children);
	return element;
}

/**
 * DOM要素を生成する
 *
 * @param {TagOrComponent} tag タグ名またはコンポーネント関数／クラス
 * @param {AttributeList} attributes 属性の連想配列
 * @param {ChildType[]} children DOM要素または文字列の配列。文字列はテキストノードとして追加される
 * @returns {CreateElementWithRefReturn}
 */
export function createElementWithRef(tag, attributes = {}, children = []) {
	const refs = {};
	const subscriptions = [];
	const element =
		typeof tag === "function"
			? tag.toString().startsWith("class")
				? new tag()
				: tag()
			: document.createElement(tag);
	const { style, ref, value, on, ...rest } = attributes;

	for (const [key, value] of Object.entries(rest)) {
		if (typeof value === "string" || typeof value === "number") {
			element.setAttribute(key, value.toString());
		}
		if (typeof value === "boolean" && value) {
			element.setAttribute(key, "");
		}
	}
	// <input type="range"> の初期値は min = 0, max = 100, value = 50 であり、
	// min, max が設定された後に value を設定する必要がある
	if (value != null) {
		element.setAttribute("value", value.toString());
	}

	if (typeof ref === "string") {
		refs[ref] = element;
	}

	if (typeof style === "object") {
		applyStyles(element, style);
	}

	// イベントリスナの登録
	if (typeof on === "object") {
		for (const [type, listener] of Object.entries(on)) {
			element.addEventListener(type, listener);
			subscriptions.push(() => element.removeEventListener(type, listener));
		}
	}

	for (const child of children) {
		if (child == null) continue;
		if (
			typeof child === "string" ||
			typeof child === "number" ||
			typeof child === "boolean"
		) {
			element.appendChild(document.createTextNode(child.toString()));
		} else if (child instanceof Node) {
			element.appendChild(child);
		} else {
			const {
				element: childElement,
				refs: childRefs,
				subscriptions: childSubs,
			} = child;
			element.appendChild(childElement);
			Object.assign(refs, childRefs);
			subscriptions.push(...childSubs);
		}
	}
	return { element, refs, subscriptions };
}

/**
 * Apply styles to an element
 *
 * @param {HTMLElement} element
 * @param {Record<string, string>} styles
 */
function applyStyles(element, styles) {
	const style = element.style;
	for (const key of Object.keys(styles)) {
		style.setProperty(kebabCase(key), styles[key]);
	}
}

/**
 * Convert camelCase to kebab-case
 *
 * @param {string} str
 * @returns {string}
 */
function kebabCase(str) {
	return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

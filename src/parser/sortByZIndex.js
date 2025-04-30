/**
 * @typedef {import("../types.js").Token} Token
 * @typedef {import("../types.js").StackingContextProp} StackingContextProp
 * @typedef {import("../types.js").StackingContextToken} StackingContextToken
 */

/**
 * @typedef {Object} TreeNode
 * @property {Token | null} token
 * @property {TreeNode[] | null} tree
 * @property {number} zIndex
 */

/**
 * Sort tokens by z-index and stacking context
 *
 * @param {Token[]} tokens
 * @returns {Token[]}
 */
export function sortByZIndex(tokens) {
	const tree = makeStackingContextTree(tokens);
	sortNodes(tree);
	return flattenTree(tree);
}

/**
 * Sort nodes by z-index
 *
 * @param {TreeNode[]} nodes
 */
function sortNodes(nodes) {
	for (const node of nodes) {
		if (node.tree) {
			sortNodes(node.tree);
		}
	}
	nodes.sort((a, b) => a.zIndex - b.zIndex);
}

/**
 * Flatten a tree of stacking context
 *
 * @param {TreeNode[]} tree
 * @returns {Token[]}
 */
function flattenTree(tree) {
	const tokens = [];
	for (const node of tree) {
		if (node.token != null) {
			tokens.push(node.token);
		}
		if (node.tree) {
			for (const child of flattenTree(node.tree)) {
				tokens.push(child);
			}
		}
	}
	return tokens;
}

/**
 * Make a tree of stacking context
 *
 * @param {Token[]} tokens
 * @returns {TreeNode[]}
 */
function makeStackingContextTree(tokens) {
	const tree = [];
	const context = [tree];
	for (const token of tokens) {
		if (token.type === "stackingContext") {
			const node = {
				token: null,
				tree: [],
				zIndex: token.zIndex,
			};
			context[context.length - 1].push(node);
			context.push(node.tree);
		} else if (token.type === "endStackingContext") {
			context.pop();
		} else {
			context[context.length - 1].push({
				token,
				zIndex: 0,
			});
		}
	}
	return tree;
}

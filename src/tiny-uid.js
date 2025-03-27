const used = new Set();

/**
 * Generate a unique identifier like "a5f6-n1br-1lb6-zy6p"
 *
 * @returns {string}
 */
export function tinyUid() {
	let uid;
	do {
		uid = Array.from({ length: 4 }, () =>
			Math.random().toString(36).substring(2, 6),
		).join("-");
	} while (used.has(uid));
	used.add(uid);
	return uid;
}

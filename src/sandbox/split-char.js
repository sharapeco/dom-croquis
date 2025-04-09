/**
 * JavaScript Text Character Splitting (1文字毎に分解) #文字列 - Qiita
 * https://qiita.com/yoya/items/636e3992ec45c1c40c14
 *
 * @param {string} text
 * @returns {string[]}
 */
export function splitChar(text) {
	const charArr = [];
	let char = [];
	let needCode = 0;
	for (const c of text) {
		const cp = c.codePointAt(0);
		if (cp === 0x200d) {
			// ZWJ (Zero Width Joiner)
			needCode += 1;
		} else if (
			(0xfe00 <= cp && cp <= 0xfe0f) ||
			(0xe0100 <= cp && cp <= 0xe01fe)
		) {
			// Variation Selector
		} else if (0x1f3fb <= cp && cp <= 0x1f3ff) {
			// Emoji Modifier
		} else if (needCode > 0) {
			needCode -= 1;
		} else if (char.length > 0) {
			charArr.push(char.join(""));
			char = [];
		}
		char.push(c);
	}
	if (char.length > 0) {
		charArr.push(char.join(""));
		char = [];
	}
	return charArr;
}

/**
 * @typedef {import("../types.js").Rect} Rect
 */

/**
 * 角丸半径をオフセットする
 *
 * @param {number[]} radius 要素数8の角丸半径の列
 * @param {number[]} offset 要素数4のオフセットの列（top, right, bottom, left の順; 正の値は外側, 負の値は内側）
 * @returns {number[]} 要素数8の角丸半径の列
 */
export function offsetRadius(radius, offset) {
	return radius.map((r, index) => {
		const j = index >> 1;
		return Math.max(0, r + offset[j]);
	});
}

/**
 * 矩形をオフセットする
 *
 * @param {Rect} rect
 * @param {number[]} offset 要素数4のオフセットの列（top, right, bottom, left の順; 正の値は外側, 負の値は内側）
 * @returns {Rect} オフセットした矩形
 */
export function offsetRect(rect, offset) {
	return {
		x: rect.x - offset[3],
		y: rect.y - offset[0],
		width: rect.width + offset[1] + offset[3],
		height: rect.height + offset[0] + offset[2],
	};
}

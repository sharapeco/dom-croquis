/**
 * @typedef {import("../types.js").Path} Path
 * @typedef {import("../types.js").PathSegment} PathSegment
 * @typedef {import("../types.js").PathCommand} PathCommand
 */

/**
 * @param {Path} path
 * @returns {Path2D}
 */
export function createPath2d(path) {
	const d = path.segments
		.map((segment) => {
			const { command, coordinates } = segment;
			return `${command}${coordinates.join(" ")}`;
		})
		.join(" ");
	return new Path2D(d);
}

window.p2d = function p2d(path) {
	return path.segments
		.map((segment) => {
			const { command, coordinates } = segment;
			return `${command}${coordinates.join(" ")}`;
		})
		.join(" ");
};

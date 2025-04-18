/**
 * @typedef {import("../types.js").Coordinates} Coordinates
 * @typedef {import("../types.js").Rect} Rect
 * @typedef {import("../types.js").Path} Path
 * @typedef {import("../types.js").PathSegment} PathSegment
 */

/**
 * @typedef {Object} DOMRectLike
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * Creates a composite path from multiple simple paths.
 * Compositing between composite paths is not supported.
 *
 * @param {Path[]} paths
 * @param {"nonzero" | "evenodd"} [fillRule]
 * @returns {Path}
 */
export function compositePath(paths, fillRule = "nonzero") {
	const segments = paths.flatMap((path) => path.segments);
	return {
		segments,
		fillRule,
	};
}

/**
 * Creates a path with the specified points.
 *
 * @param {Coordinates[][]} pointList
 * @returns {Path}
 */
export function polygonPath(pointList) {
	const segments = pointList.map((point, index) => ({
		command: index === 0 ? "M" : "L",
		coordinates: [point.x, point.y],
	}));
	segments.push({ command: "Z", coordinates: [] });
	return {
		segments,
	};
}

/**
 * Creates a path of rectangle.
 *
 * @param {DOMRectLike} rect
 * @returns {Path}
 */
export function rectPath(rect) {
	const segments = [
		{ command: "M", coordinates: [rect.x, rect.y] },
		{ command: "L", coordinates: [rect.x + rect.width, rect.y] },
		{ command: "L", coordinates: [rect.x + rect.width, rect.y + rect.height] },
		{ command: "L", coordinates: [rect.x, rect.y + rect.height] },
		{ command: "Z", coordinates: [] },
	];
	return {
		segments,
	};
}

/**
 * Creates a path of rounded rectangle.
 *
 * @param {DOMRectLike} rect
 * @param {number[]} [radius]
 * @returns {Path}
 */
export function roundedRectPath(rect, radius = [0, 0, 0, 0, 0, 0, 0, 0]) {
	const segments = [
		{
			command: "M",
			coordinates: [rect.x + radius[0], rect.y],
		},
		{ command: "L", coordinates: [rect.x + rect.width - radius[1], rect.y] },
		radius[1] > 0 &&
			radius[2] > 0 && {
				command: "A",
				coordinates: [
					radius[1],
					radius[2],
					0,
					0,
					1,
					rect.x + rect.width,
					rect.y + radius[2],
				],
			},
		{
			command: "L",
			coordinates: [rect.x + rect.width, rect.y + rect.height - radius[3]],
		},
		radius[3] > 0 &&
			radius[4] > 0 && {
				command: "A",
				coordinates: [
					radius[4],
					radius[3],
					0,
					0,
					1,
					rect.x + rect.width - radius[4],
					rect.y + rect.height,
				],
			},
		{ command: "L", coordinates: [rect.x + radius[5], rect.y + rect.height] },
		radius[5] > 0 &&
			radius[6] > 0 && {
				command: "A",
				coordinates: [
					radius[5],
					radius[6],
					0,
					0,
					1,
					rect.x,
					rect.y + rect.height - radius[6],
				],
			},
		{ command: "L", coordinates: [rect.x, rect.y + radius[7]] },
		radius[7] > 0 &&
			radius[0] > 0 && {
				command: "A",
				coordinates: [
					radius[0],
					radius[7],
					0,
					0,
					1,
					rect.x + radius[0],
					rect.y,
				],
			},
		{ command: "Z", coordinates: [] },
	];
	return {
		segments: segments.filter((segment) => segment !== false),
	};
}

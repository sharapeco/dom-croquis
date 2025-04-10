import { createElementWithRef as h } from "../createElement.js";
import { render } from "../../src/renderer/renderer.js";
import { createPath2d } from "../../src/renderer/path.js";

const scale = window.devicePixelRatio;

const testCases = [
	{
		title: "テストケース1: 基本的な図形",
		width: 300,
		height: 200,
		path: {
			segments: [
				{ command: "M", coordinates: [50, 50] },
				{ command: "L", coordinates: [150, 50] },
				{ command: "L", coordinates: [150, 150] },
				{ command: "L", coordinates: [50, 150] },
				{ command: "Z", coordinates: [] },
			],
		},
	},
	{
		title: "テストケース2: ベジェ曲線",
		width: 300,
		height: 200,
		path: {
			segments: [
				{ command: "M", coordinates: [50, 100] },
				{ command: "C", coordinates: [50, 50, 150, 50, 150, 100] },
				{ command: "S", coordinates: [250, 150, 250, 100] },
				{ command: "S", coordinates: [200, 175, 150, 175] },
			],
		},
	},
	{
		title: "テストケース3: 楕円",
		width: 300,
		height: 200,
		path: {
			segments: [
				{ command: "M", coordinates: [100, 100] },
				{ command: "L", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 10, 1, 1, 100, 150] }, // π/2 → −π/2 への時計回りの楕円弧
				{ command: "A", coordinates: [50, 30, -10, 1, 1, 100, 50] }, // −π/2 → π/2 への時計回りの楕円弧
			],
		},
	},
	{
		title: "テストケース4: large-arg-flag=0, sweep-flag=1",
		width: 300,
		height: 200,
		path: {
			segments: [
				// [rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 0, 0, 1, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 30, 0, 1, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 60, 0, 1, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 90, 0, 1, 150, 100] },
			],
		},
	},
	{
		title: "テストケース5: large-arg-flag=1, sweep-flag=1",
		width: 300,
		height: 200,
		path: {
			segments: [
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 0, 1, 1, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 30, 1, 1, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 60, 1, 1, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 90, 1, 1, 150, 100] },
			],
		},
	},
	{
		title: "テストケース6: large-arg-flag=0, sweep-flag=0",
		width: 300,
		height: 200,
		path: {
			segments: [
				// [rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 0, 0, 0, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 30, 0, 0, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 60, 0, 0, 150, 100] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 90, 0, 0, 150, 100] },
			],
		},
	},
	{
		title: "テストケース7: large-arg-flag=1, sweep-flag=0",
		width: 300,
		height: 200,
		path: {
			segments: [
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 0, 1, 0, 100, 150] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 30, 1, 0, 100, 150] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 60, 1, 0, 100, 150] },
				{ command: "Z", coordinates: [] },
				{ command: "M", coordinates: [100, 50] },
				{ command: "A", coordinates: [50, 30, 90, 1, 0, 100, 150] },
			],
		},
	},
];

const container = document.querySelector(".container");
for (const testCase of testCases) {
	const section = createTest(testCase);
	container.appendChild(section);
}

function createTest(testCase) {
	const { element, refs } = h("section", { class: "test-case" }, [
		h("h2", { class: "title" }, [testCase.title]),
		h("div", { class: "comparison" }, [
			h("div", { class: "svg-container" }, [
				h("h3", {}, ["SVG"]),
				createSvg(testCase),
			]),
			h("div", { class: "canvas-container" }, [
				h("h3", {}, ["Canvas"]),
				h("canvas", {
					ref: "canvas",
					width: testCase.width,
					height: testCase.height,
				}),
			]),
		]),
	]);

	const tokens = [
		{
			type: "fill",
			path: testCase.path,
			color: "transparent",
			strokeWidth: 1,
			stroke: "#000000",
		},
	];
	render(tokens, {
		width: testCase.width,
		height: testCase.height,
		scale,
		canvas: refs.canvas,
	});

	return element;
}

function createSvg(testCase) {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", testCase.width);
	svg.setAttribute("height", testCase.height);
	svg.setAttribute("viewBox", `0 0 ${testCase.width} ${testCase.height}`);

	const d = testCase.path.segments
		.map((segment) => {
			const { command, coordinates } = segment;
			return `${command}${coordinates.join(" ")}`;
		})
		.join(" ");
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute("d", d);
	path.setAttribute("fill", "none");
	path.setAttribute("stroke", "black");
	path.setAttribute("stroke-width", "1");
	svg.appendChild(path);

	return svg;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Path} path
 */
export function drawPath(ctx, path) {
    ctx.stroke(createPath2d(path));
}

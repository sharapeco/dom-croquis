import { parseCSSValue } from "../../src/parser/parser.js";

describe("parseCSSValue", () => {
	test("should parse basic box-shadow values", () => {
		const input = "rgb(0, 0, 0, 0.5) 2px 5px 7px";
		const expected = [
			{ type: "color", s: "rgb(0, 0, 0, 0.5)" },
			{ type: "length", f: 2 },
			{ type: "length", f: 5 },
			{ type: "length", f: 7 },
		];

		expect(parseCSSValue(input)).toEqual(expected);
	});

	test("should parse inset box-shadow value", () => {
		const input = "inset 0 0 2px rgb(128, 64, 0)";
		const expected = [
			{ type: "keyword", s: "inset" },
			{ type: "length", f: 0 },
			{ type: "length", f: 0 },
			{ type: "length", f: 2 },
			{ type: "color", s: "rgb(128, 64, 0)" },
		];

		expect(parseCSSValue(input)).toEqual(expected);
	});

	test("should parse multiple box-shadow values", () => {
		const input =
			"rgba(0, 36, 96, 0.5) 2px 7px 5px -5px, rgb(255, 204, 0) -5px -5px 0px 0px";
		const expected = [
			{ type: "color", s: "rgba(0, 36, 96, 0.5)" },
			{ type: "length", f: 2 },
			{ type: "length", f: 7 },
			{ type: "length", f: 5 },
			{ type: "length", f: -5 },
			{ type: "separator", s: "," },
			{ type: "color", s: "rgb(255, 204, 0)" },
			{ type: "length", f: -5 },
			{ type: "length", f: -5 },
			{ type: "length", f: 0 },
			{ type: "length", f: 0 },
		];

		expect(parseCSSValue(input)).toEqual(expected);
	});

	test("should parse percentage values", () => {
		const input = "50% 100%";
		const expected = [
			{ type: "percentage", f: 50 },
			{ type: "percentage", f: 100 },
		];

		expect(parseCSSValue(input)).toEqual(expected);
	});

	test("should parse new RGB format", () => {
		const input = "rgb(255 0 153) rgb(255 0 153 / 80%)";
		const expected = [
			{ type: "color", s: "rgb(255 0 153)" },
			{ type: "color", s: "rgb(255 0 153 / 80%)" },
		];

		expect(parseCSSValue(input)).toEqual(expected);
	});

	test("should return error token for invalid input", () => {
		const input = "invalid@value 123px";
		const expected = [
			{ type: "error", s: "invalid@value" },
			{ type: "length", f: 123 },
		];

		expect(parseCSSValue(input)).toEqual(expected);
	});

	test("should return error token for invalid input at the end", () => {
		const input = "123px invalid@value 20%";
		const expected = [
			{ type: "length", f: 123 },
			{ type: "error", s: "invalid@value" },
			{ type: "percentage", f: 20 },
		];

		expect(parseCSSValue(input)).toEqual(expected);
	});
});

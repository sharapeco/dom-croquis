/** @type {import('jest').Config} */
export default {
	testEnvironment: "node",
	testMatch: ["**/tests/**/*.test.js"],
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	transform: {},
	moduleFileExtensions: [
		"js",
		"mjs",
		"cjs",
		"jsx",
		"ts",
		"tsx",
		"json",
		"node",
	],
	transformIgnorePatterns: [],
};

import terser from "@rollup/plugin-terser";
import strip from "@rollup/plugin-strip";

const minify = process.env.MINIFY || false;

async function config() {
	return {
		input: "src/dom-croquis.js",
		output: {
			file: `dist/dom-croquis${minify ? ".min" : ""}.js`,
			format: "es",
			sourcemap: true,
		},
		plugins: [
			minify ? terser() : undefined,
			strip({
				functions: ["console.log", "performance.*"],
			}),
		],
	};
}

export default config;

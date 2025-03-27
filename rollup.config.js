import terser from "@rollup/plugin-terser";
import strip from "@rollup/plugin-strip";

const minify = process.env.MINIFY || false;

async function config() {
	return {
		input: "src/html-to-canvas.js",
		output: {
			file: `dist/html-to-canvas${minify ? ".min" : ""}.js`,
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

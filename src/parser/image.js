/**
 * @param {string} src
 * @return {Promise<HTMLImageElement>}
 */
export function readImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => {
			reject(new Error("Failed to load image"));
		};
		img.src = src;
	});
}

function drawRect(rect, root) {
	const div = document.createElement("div");
	const s = div.style;
	s.position = "absolute";
	s.left = `${rect.x}px`;
	s.top = `${rect.y}px`;
	s.width = `${rect.width}px`;
	s.height = `${rect.height}px`;
	s.boxSizing = "border-box";
	s.border = "solid 1px #8888";
	(root ?? document.body).appendChild(div);
}

function drawRectsOfElement(element, root) {
	const rootRect = root.getBoundingClientRect();
	const rects = element.getClientRects();
	for (const rect of rects) {
		drawRect(
			{
				x: rect.x - rootRect.x,
				y: rect.y - rootRect.y,
				width: rect.width,
				height: rect.height,
			},
			root,
		);
	}
}

function prettyToken(token) {
	let str = `%c${token.tag} %c(${token.type})`;
	const styles = [
		"color: #777",
		"font-weight: bold; color: #75BFFE",
	];
	if (typeof token.x === "number") {
		str += `%c [${token.x}, ${token.y}]`;
		styles.push("color:rgb(239, 104, 183)");
	}
	if (token.rect) {
		str += `%c rect[${token.rect.width}, ${token.rect.height}]`;
		styles.push("color: #87DE74");
	}
	if (token.path) {
		str += `%c path[${prettyPath(token.path)}]`;
		styles.push("color: #FFD700");
	}
	if (token.matrix) {
		str += `%c transform[${token.matrix.join(", ")}]`;
		styles.push("color:rgb(26, 179, 151)");
	}
	if (token.color) {
		str += `%c${token.color}`;
		styles.push(`background: ${token.color}; color: #fff; padding: 2px 4px; border-radius: 4px;`);
	}
	return [str, ...styles];
}

function prettyPath(path) {
	return path.segments
		.map((segment) => {
			const { command, coordinates } = segment;
			return `${command}${coordinates.join(" ")}`;
		})
		.join(" ");
}

function printTokens(tokens) {
	for (const token of tokens) {
		console.log(...prettyToken(token));
	}
}

window.DC = {
	drawRect,
	drawRectsOfElement,
	prettyToken,
	printTokens,
};

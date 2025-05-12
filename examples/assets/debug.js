function drawRect(rect) {
	const div = document.createElement("div");
	const s = div.style;
	s.position = "fixed";
	s.left = `${rect.x}px`;
	s.top = `${rect.y}px`;
	s.width = `${rect.width}px`;
	s.height = `${rect.height}px`;
	s.boxSizing = "border-box";
	s.border = "solid 1px #8888";
	document.body.appendChild(div);
}

function drawRectsOfElement(element) {
	const rects = element.getClientRects();
	for (const rect of rects) {
		drawRect(rect);
	}
}

window.DC = {
	drawRectsOfElement,
};

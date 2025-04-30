/**
 * Get the closest stacking context to the given node.
 * from: https://github.com/gwwar/z-context
 *
 * @param {Node | null} node
 * @returns {{ z: boolean, reason: string } | null}
 */
export function createsStackingContext(node) {
	// the root element (HTML).
	if (!node || node.nodeName === "HTML") {
		return { z: true, reason: "root" };
	}

	// handle shadow root elements.
	if (node.nodeName === "#document-fragment") {
		return null;
	}

	const computedStyle = getComputedStyle(node);

	// position: fixed or sticky.
	if (
		computedStyle.position === "fixed" ||
		computedStyle.position === "sticky"
	) {
		return { z: true, reason: `position: ${computedStyle.position}` };
	}

	// container-type: size or inline-size
	if (
		computedStyle.containerType === "size" ||
		computedStyle.containerType === "inline-size"
	) {
		return {
			z: false,
			reason: `container-type: ${computedStyle.containerType}`,
		};
	}

	// positioned (absolutely or relatively) with a z-index value other than "auto".
	if (computedStyle.zIndex !== "auto" && computedStyle.position !== "static") {
		return {
			z: true,
			reason: `position: ${computedStyle.position}; z-index: ${computedStyle.zIndex}`,
		};
	}

	// elements with an opacity value less than 1.
	if (computedStyle.opacity !== "1") {
		return { z: false, reason: `opacity: ${computedStyle.opacity}` };
	}

	// elements with a transform value other than "none".
	if (computedStyle.transform !== "none") {
		return { z: false, reason: `transform: ${computedStyle.transform}` };
	}

	// elements with a scale value other than "none"
	if (computedStyle.scale !== "none") {
		return { z: false, reason: `scale: ${computedStyle.scale}` };
	}

	// elements with a rotate value other than "none"
	if (computedStyle.rotate !== "none") {
		return { z: false, reason: `rotate: ${computedStyle.rotate}` };
	}

	// elements with a translate value other than "none"
	if (computedStyle.translate !== "none") {
		return { z: false, reason: `translate: ${computedStyle.translate}` };
	}

	// elements with a mix-blend-mode value other than "normal".
	if (computedStyle.mixBlendMode !== "normal") {
		return {
			z: false,
			reason: `mixBlendMode: ${computedStyle.mixBlendMode}`,
		};
	}

	// elements with a filter value other than "none".
	if (computedStyle.filter !== "none") {
		return {
			z: false,
			reason: `filter: ${computedStyle.filter}`,
		};
	}

	// elements with a backdropFilter value other than "none".
	if (
		computedStyle.backdropFilter != null &&
		computedStyle.backdropFilter !== "none"
	) {
		return {
			z: false,
			reason: `backdropFilter: ${computedStyle.backdropFilter}`,
		};
	}

	// elements with a perspective value other than "none".
	if (computedStyle.perspective !== "none") {
		return {
			z: false,
			reason: `perspective: ${computedStyle.perspective}`,
		};
	}

	// elements with a clip-path value other than "none".
	if (computedStyle.clipPath !== "none") {
		return { z: false, reason: `clip-path: ${computedStyle.clipPath} ` };
	}

	// elements with a mask value other than "none".
	const mask = computedStyle.mask || computedStyle.webkitMask;
	if (mask !== "none" && mask !== undefined) {
		return { z: false, reason: `mask:  ${mask}` };
	}

	// elements with a mask-image value other than "none".
	const maskImage = computedStyle.maskImage || computedStyle.webkitMaskImage;
	if (maskImage !== "none" && maskImage !== undefined) {
		return { z: false, reason: `mask-image: ${maskImage}` };
	}

	// elements with a mask-border value other than "none".
	const maskBorder = computedStyle.maskBorder || computedStyle.webkitMaskBorder;
	if (maskBorder !== "none" && maskBorder !== undefined) {
		return { z: false, reason: `mask-border: ${maskBorder}` };
	}

	// elements with isolation set to "isolate".
	if (computedStyle.isolation === "isolate") {
		return { z: false, reason: `isolation: ${computedStyle.isolation}` };
	}

	// transform or opacity in will-change even if you don't specify values for these attributes directly.
	if (
		computedStyle.willChange === "transform" ||
		computedStyle.willChange === "opacity"
	) {
		return { z: false, reason: `willChange: ${computedStyle.willChange}` };
	}

	// elements with -webkit-overflow-scrolling set to "touch".
	if (computedStyle.webkitOverflowScrolling === "touch") {
		return { z: false, reason: "-webkit-overflow-scrolling: touch" };
	}

	// an item with a z-index value other than "auto".
	if (computedStyle.zIndex !== "auto") {
		const parentStyle = getComputedStyle(node.parentNode);
		// with a flex|inline-flex parent.
		if (
			parentStyle.display === "flex" ||
			parentStyle.display === "inline-flex"
		) {
			return {
				z: true,
				reason: `flex-item; z-index: ${computedStyle.zIndex}`,
			};
		}
		// with a grid parent.
		if (parentStyle.display === "grid") {
			return {
				z: true,
				reason: `child of grid container; z-index: ${computedStyle.zIndex}`,
			};
		}
	}

	// contain with a value of layout, or paint, or a composite value that includes either of them
	const contain = computedStyle.contain;
	if (
		["layout", "paint", "strict", "content"].indexOf(contain) > -1 ||
		contain.indexOf("paint") > -1 ||
		contain.indexOf("layout") > -1
	) {
		return {
			z: false,
			reason: `contain: ${contain}`,
		};
	}

	return null;
}

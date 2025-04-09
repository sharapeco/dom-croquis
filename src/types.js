/**
 * @typedef {"clip" | "endClip" | "fill" | "text" | "image"} TokenType
 *
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 *
 * @typedef {"M" | "L" | "H" | "V" | "C" | "S" | "Q" | "T" | "A" | "Z"} PathCommand
 *
 * Path commands and their arguments:
 * - M (Move): [x, y] - Move to absolute coordinates
 * - L (Line): [x, y] - Draw a line to absolute coordinates
 * - H (Horizontal): [x] - Draw a horizontal line to absolute x coordinate
 * - V (Vertical): [y] - Draw a vertical line to absolute y coordinate
 * - C (Cubic Bezier): [x1, y1, x2, y2, x, y] - Draw a cubic Bezier curve
 *   (x1,y1) is the first control point, (x2,y2) is the second control point, (x,y) is the end point
 * - S (Smooth Cubic): [x2, y2, x, y] - Draw a smooth cubic Bezier curve
 *   (x2,y2) is the second control point, (x,y) is the end point
 *   First control point is reflection of previous curve's second control point
 * - Q (Quadratic Bezier): [x1, y1, x, y] - Draw a quadratic Bezier curve
 *   (x1,y1) is the control point, (x,y) is the end point
 * - T (Smooth Quadratic): [x, y] - Draw a smooth quadratic Bezier curve
 *   (x,y) is the end point, control point is reflection of previous curve's control point
 * - A (Arc): [rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y]
 *   Draw an elliptical arc from current point to (x,y)
 *   rx, ry: radii of the ellipse
 *   x-axis-rotation: rotation of the ellipse in degrees
 *   large-arc-flag: 0 for small arc, 1 for large arc
 *   sweep-flag: 0 for counter-clockwise, 1 for clockwise
 * - Z (Close): [] - Close the current path by drawing a line to the start point
 *
 * @typedef {Object} PathSegment
 * @property {PathCommand} command
 * @property {number[]} coordinates
 *
 * @typedef {Object} Path
 * @property {PathSegment[]} segments
 *
 * @typedef {Object} BaseToken
 * @property {TokenType} type
 * @property {Node} node
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 *
 * @typedef {Object} BorderRadius
 * @property {number} tl
 * @property {number} tr
 * @property {number} bl
 * @property {number} br
 *
 * @typedef {Object} ClipTokenProp
 * @property {Path=} path
 * @property {BorderRadius=} radius
 *
 * @typedef {BaseToken & ClipTokenProp} ClipToken
 *
 * @typedef {Object} FillTokenProp
 * @property {string} color
 * @property {BorderRadius} radius
 * @property {number} strokeWidth
 * @property {Path=} path
 * @property {BoxShadow=} boxShadow
 *
 * @typedef {Object} BoxShadow
 * @property {number} offsetX
 * @property {number} offsetY
 * @property {number} blurRadius
 * @property {string} color
 *
 * @typedef {BaseToken & FillTokenProp} FillToken
 *
 * @typedef {Object} TextProp
 * @property {string} color
 * @property {string} font
 * @property {string} fontKerning
 * @property {string} fontStretch
 * @property {string} fontVariantCaps
 * @property {string} letterSpacing
 * @property {number} fontSize
 * @property {number} lineHeight
 * @property {string} textAlign
 * @property {TextDecoration=} textDecoration
 * @property {string} whiteSpace
 * @property {number} scaleX 長体・平体の比率。1 が標準、< 1 が長体、> 1 が平体
 *
 * @typedef {Object} TextTokenProp
 * @property {string} text
 *
 * @typedef {BaseToken & TextTokenProp & TextProp} TextToken
 *
 * @typedef {Object} TextDecoration
 * @property {boolean} underline
 * @property {boolean} overline
 * @property {boolean} lineThrough
 * @property {string} color
 * @property {number} thickness
 *
 * @typedef {Object} ImageTokenProp
 * @property {HTMLImageElement} image
 * @property {Clip=} clip
 * @property {string=} fillColor
 * @property {string=} blendMode "soft-light" など
 *
 * @typedef {BaseToken & ImageTokenProp} ImageToken
 *
 * @typedef {Object} Clip
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 *
 * @typedef {FillToken | TextToken | ImageToken} Token
 */

export default {};

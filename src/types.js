/**
 * @typedef {"stackingContext" | "endStackingContext" | "clip" | "endClip" | "transform" | "endTransform" | "effect" | "endEffect" | "fill" | "text" | "image"} TokenType
 *
 * @typedef {Object} Coordinates
 * @property {number} x
 * @property {number} y
 *
 * @typedef {Object} Rect
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
 * @property {"nonzero" | "evenodd"} [fillRule]
 *
 * @typedef {Object} Shape
 * @property {Rect} rect
 * @property {Path} path
 *
 * @typedef {Object} BaseToken
 * @property {TokenType} type
 * @property {Node} node
 *
 * @typedef {Object} StackingContextProp
 * @property {number} zIndex
 * @property {string} reason
 *
 * @typedef {BaseToken & StackingContextProp} StackingContextToken
 *
 * @typedef {BaseToken & Coordinates & Shape} ClipToken
 *
 * @typedef {number[6]} TransformMatrix
 *
 * @typedef {Object} TransformProp
 * @property {TransformMatrix} matrix
 *
 * @typedef {BaseToken & TransformProp} TransformToken
 *
 * @typedef {"normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity"} BlendMode
 *
 * @typedef {Object} EffectProp
 * @property {number} [opacity]
 * @property {BlendMode} [blendMode]
 *
 * @typedef {BaseToken & EffectProp} EffectToken
 *
 * @typedef {Object} FillTokenProp
 * @property {string} color
 * @property {string} [filter]
 *
 * @typedef {BaseToken & Coordinates & Shape & FillTokenProp} FillToken
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
 * @property {string} writingMode
 * @property {number} scaleX 長体・平体の比率。1 が標準、< 1 が長体、> 1 が平体
 *
 * @typedef {Object} TextTokenProp
 * @property {string} text
 *
 * @typedef {BaseToken & Coordinates & Rect & TextTokenProp & TextProp} TextToken
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
 * @property {ImageClip} [clip]
 * @property {string} [fillColor]
 *
 * @typedef {BaseToken & Coordinates & Rect & ImageTokenProp} ImageToken
 *
 * @typedef {Coordinates & Rect} ImageClip
 *
 * @typedef {StackingContextToken | ClipToken | TransformToken | FillToken | TextToken | ImageToken | BaseToken} Token
 */

export default {};

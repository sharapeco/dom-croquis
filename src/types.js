/**
 * @typedef {"clip" | "endClip" | "fill" | "text" | "image"} TokenType
 *
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
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
 * @property {BorderRadius} radius
 *
 * @typedef {BaseToken & ClipTokenProp} ClipToken
 *
 * @typedef {Object} FillTokenProp
 * @property {string} color
 * @property {BorderRadius} radius
 * @property {number} strokeWidth
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

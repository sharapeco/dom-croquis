/**
 * @typedef {import("../types.js").Path} Path
 * @typedef {import("../types.js").PathSegment} PathSegment
 * @typedef {import("../types.js").PathCommand} PathCommand
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Path} path
 */
export function drawPath(ctx, path) {
    ctx.beginPath();

    for (const segment of path.segments) {
        const { command, coordinates } = segment;

        switch (command) {
            case "M":
                ctx.moveTo(coordinates[0], coordinates[1]);
                break;
            case "L":
                ctx.lineTo(coordinates[0], coordinates[1]);
                break;
            case "H":
                ctx.lineTo(coordinates[0], ctx.currentY);
                break;
            case "V":
                ctx.lineTo(ctx.currentX, coordinates[0]);
                break;
            case "C":
                ctx.bezierCurveTo(
                    coordinates[0], coordinates[1],
                    coordinates[2], coordinates[3],
                    coordinates[4], coordinates[5]
                );
                break;
            case "S":
                ctx.bezierCurveTo(
                    ctx.currentX + (ctx.currentX - ctx.lastControlX),
                    ctx.currentY + (ctx.currentY - ctx.lastControlY),
                    coordinates[0], coordinates[1],
                    coordinates[2], coordinates[3]
                );
                break;
            case "Q":
                ctx.quadraticCurveTo(
                    coordinates[0], coordinates[1],
                    coordinates[2], coordinates[3]
                );
                break;
            case "T":
                ctx.quadraticCurveTo(
                    ctx.currentX + (ctx.currentX - ctx.lastControlX),
                    ctx.currentY + (ctx.currentY - ctx.lastControlY),
                    coordinates[0], coordinates[1]
                );
                break;
            case "A": {
                // SVGのAコマンドのパラメータをCanvasのellipseメソッドのパラメータに変換
                const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y] = coordinates;
                const startX = ctx.currentX;
                const startY = ctx.currentY;

                // 楕円の中心点を計算
                const dx = startX - x;
                const dy = startY - y;
                const xAxisRotationRad = xAxisRotation * Math.PI / 180;

                // 楕円を描画
                ctx.ellipse(
                    x, y,           // 中心点
                    rx, ry,         // 半径
                    xAxisRotationRad, // 回転角度（ラジアン）
                    0,              // 開始角度
                    2 * Math.PI,    // 終了角度
                    sweepFlag === 0  // 反時計回りかどうか
                );
                break;
            }
            case "Z":
                ctx.closePath();
                break;
        }
    }
}
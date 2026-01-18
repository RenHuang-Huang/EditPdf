export interface Point {
    x: number;
    y: number;
}

/**
 * Converts an array of points into a smoothed SVG path string using Quadratic Bezier curves.
 * @param points Array of points {x, y}
 * @param viewportHeight Optional - if provided, Y coordinates will be mirrored (height - y) for PDF export
 */
export function getSmoothedPath(points: Point[], viewportHeight?: number): string {
    if (points.length === 0) return '';

    // Helper to flip Y if needed
    const getY = (y: number) => viewportHeight ? viewportHeight - y : y;

    // Helper to format point
    const pt = (p: Point) => `${p.x} ${getY(p.y)}`;

    if (points.length === 1) return `M ${pt(points[0])} L ${pt(points[0])}`;
    if (points.length === 2) return `M ${pt(points[0])} L ${pt(points[1])}`;

    let d = `M ${pt(points[0])}`;

    for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;

        // Use generic point object for helper
        const midPoint = { x: midX, y: midY };
        const controlPoint = points[i];

        d += ` Q ${pt(controlPoint)} ${pt(midPoint)}`;
    }

    // Connect to the very last point
    d += ` L ${pt(points[points.length - 1])}`;

    return d;
}

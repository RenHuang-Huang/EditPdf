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

/**
 * Converts an array of raw input points into a flattened array of points representing the smoothed curve.
 * Used for PDF export where drawing many small lines is more reliable than SVG paths (avoids fill issues).
 */
export function getFlattenedPoints(points: Point[]): Point[] {
    if (points.length === 0) return [];
    if (points.length < 3) return [...points];

    const result: Point[] = [points[0]];
    let p0 = points[0];

    const steps = 5; // Resolution per segment

    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i]; // Control
        const p2 = {          // End (Midpoint)
            x: (points[i].x + points[i + 1].x) / 2,
            y: (points[i].y + points[i + 1].y) / 2
        };

        // Quadratic Bezier: B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
        for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const t1 = 1 - t;

            const x = (t1 * t1 * p0.x) + (2 * t1 * t * p1.x) + (t * t * p2.x);
            const y = (t1 * t1 * p0.y) + (2 * t1 * t * p1.y) + (t * t * p2.y);

            result.push({ x, y });
        }

        p0 = p2; // Next segment starts at previous mid
    }

    // Last segment: Linear line to final point
    result.push(points[points.length - 1]);

    return result;
}

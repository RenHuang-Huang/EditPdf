import { getSmoothedPath } from './geometry';

// Simple test suite using Vitest (to be run via npx vitest)

describe('geometry utils', () => {
    it('getSmoothedPath returns empty string for empty input', () => {
        expect(getSmoothedPath([])).toBe('');
    });

    it('getSmoothedPath returns Line for 2 points', () => {
        const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
        const path = getSmoothedPath(points);
        expect(path).toContain('M 0 0');
        expect(path).toContain('L 10 10');
    });

    it('getSmoothedPath uses Quadratic Bezier for 3+ points', () => {
        const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }];
        const path = getSmoothedPath(points);
        // Should contain 'Q' command
        expect(path).toContain('Q');
    });

    it('getSmoothedPath handles viewport flipping', () => {
        const points = [{ x: 0, y: 10 }];
        // flip with height 100: y=10 -> y=90
        const path = getSmoothedPath(points, 100);
        // Should be M 0 90 L 0 90 (single point)
        expect(path).toContain('90');
    });
});

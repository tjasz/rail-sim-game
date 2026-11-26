import { describe, expect, it, jest } from '@jest/globals';
import { baseGameState } from './baseGameState';
import { createCirclePath, createPolygonPath } from './utils/svgShapes';

jest.mock('./iconPaths', () => ({
  iconPaths: { 'configured-icon': 'M 0 0 L 1 1 Z' },
}));

describe('initial neighborhood icons', () => {
  it('overrides the first 24 configured icons in neighborhood order', () => {
    const neighborhoods = baseGameState.city.config.neighborhoods;
    for (let index = 0; index < Math.min(24, neighborhoods.length); index++) {
      expect(neighborhoods[index].icon).not.toBe('configured-icon');
      expect(neighborhoods[index].icon).toMatch(/^M /);
      expect(neighborhoods[index].icon).not.toMatch(/NaN|Infinity/);
    }
    expect(neighborhoods[0].icon).toBe(createCirclePath(7.5, { x: 7.5, y: 7.5 }));
    expect(neighborhoods[23].icon).toBe(
      createPolygonPath(5, i => (i === 1 || i === 4) ? 5 : 7.5, { x: 7.5, y: 7.5 }),
    );
  });

  it('preserves later configured icons', () => {
    const neighborhoods = baseGameState.city.config.neighborhoods;
    expect(neighborhoods.length).toBeGreaterThan(24);
    for (const neighborhood of neighborhoods.slice(24)) {
      expect(neighborhood.icon).toBe('configured-icon');
    }
  });
});

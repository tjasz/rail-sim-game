import { describe, expect, it, jest } from '@jest/globals';
import { baseGameState, createGameState } from './baseGameState';
import { cities } from './cities/index';
import { cityMap as seattleHalfMile } from './cities/generated-seattle-half-mi';
import { cityMap as seattleOneMile } from './cities/generated-seattle-1mi';
import { cityMap as seattleTwoMile } from './cities/generated-seattle-2mi';
import { cityMap as slcOneMile } from './cities/generated-slc-1mi';
import { cityMap as slcTwoMile } from './cities/generated-slc-2mi';
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

  describe('city game initialization', () => {
    it.each([
      ['Seattle 0.5mi', seattleHalfMile],
      ['Seattle 1mi', seattleOneMile],
      ['Seattle 2mi', seattleTwoMile],
      ['SLC 1mi', slcOneMile],
      ['SLC 2mi', slcTwoMile],
    ])('starts %s with its selected map and initialized day', (name, map) => {
      const city = cities.find(city => city.config.name === name)!;
      const state = createGameState(city);

      expect(state.city.config.tiles).toBe(map.tiles);
      expect(state.city.config.water).toBe(map.water);
      expect(state.city.config.neighborhoods.map(n => n.position)).toEqual(
        map.neighborhoods.map(n => n.position),
      );
      expect(state.currentTripMatrix?.date).toBe(0);
      expect(state.activeNeighborhoodCount).toBe(Math.min(3, map.neighborhoods.length));
      expect(state.city.config.activeNeighborhoodsAtTime(1e6)).toBe(map.neighborhoods.length);
    });

    it('restarts the selected city without sharing mutable game state', () => {
      const city = cities[3];
      const played = createGameState(city);
      played.city.currentDay = 5;
      played.city.budget = 0;
      played.city.config.neighborhoods[0].lineIds?.push('old-line');
      played.city.config.neighborhoods[0].waitingCitizens?.set('old-line', ['citizen']);
      played.railNetwork.trains.get('train-initial-0')!.passengerIds.push('citizen');

      const fresh = createGameState(played.city);
      expect(fresh.city.config.id).toBe(city.config.id);
      expect(fresh.city.currentDay).toBe(0);
      expect(fresh.city.budget).toBe(city.config.initialBudget);
      expect(fresh.city.config.neighborhoods[0].lineIds).toEqual([]);
      expect(fresh.city.config.neighborhoods[0].waitingCitizens?.size).toBe(0);
      expect(fresh.railNetwork.trains.get('train-initial-0')?.passengerIds).toEqual([]);
      expect(city.config.neighborhoods[0].lineIds).toBeUndefined();
    });
  });

  it('preserves later configured icons', () => {
    const neighborhoods = baseGameState.city.config.neighborhoods;
    expect(neighborhoods.length).toBeGreaterThan(24);
    for (const neighborhood of neighborhoods.slice(24)) {
      expect(neighborhood.icon).toBe('configured-icon');
    }
  });
});

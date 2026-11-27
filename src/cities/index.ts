import { SeattleConfig } from '../cities';
import type { CityConfig, CityState } from '../models';
import { cityMap as seattleHalfMile } from './generated-seattle-half-mi';
import { cityMap as seattleOneMile } from './generated-seattle-1mi';
import { cityMap as seattleTwoMile } from './generated-seattle-2mi';
import { cityMap as tacomaOneMile } from './generated-tacoma-1mi';
import { cityMap as slcOneMile } from './generated-slc-1mi';
import { cityMap as slcTwoMile } from './generated-slc-2mi';

type CityMap = Pick<CityConfig, 'gridWidth' | 'gridHeight' | 'tiles' | 'water' | 'neighborhoods'>;

function createCity(id: string, name: string, map: CityMap): CityState {
  return {
    ...SeattleConfig,
    config: {
      ...SeattleConfig.config,
      ...map,
      id,
      name,
      activeNeighborhoodsAtTime: (elapsedMinutes: number) =>
        Math.min(
          SeattleConfig.config.activeNeighborhoodsAtTime(elapsedMinutes),
          map.neighborhoods.length,
        ),
    },
  };
}

export const cities: CityState[] = [
  createCity('seattle-half-mi', 'Seattle 0.5mi', seattleHalfMile),
  createCity('seattle-1mi', 'Seattle 1mi', seattleOneMile),
  createCity('seattle-2mi', 'Seattle 2mi', seattleTwoMile),
  createCity('tacoma-1mi', 'Tacoma 1mi', tacomaOneMile),
  createCity('slc-1mi', 'SLC 1mi', slcOneMile),
  createCity('slc-2mi', 'SLC 2mi', slcTwoMile),
];

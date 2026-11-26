
import { cities } from './cities/index';
import type { CityState, GameState, Train } from './models';
import { initializeDay } from './utils/tripGeneration';
import {
  createArcStarPath,
  createCirclePath,
  createPolarRosePath,
  createPolygonPath,
  createStarPath,
} from './utils/svgShapes';

// Base game configuration (without citizens - they'll be generated)
// Initialize all neighborhoods with station properties
const iconCenter = { x: 7.5, y: 7.5 };
const initialNeighborhoodIcons = [
  createCirclePath(7.5, iconCenter),
  createPolygonPath(3, 7.5, iconCenter),
  createPolygonPath(4, 7.5, iconCenter),
  createPolygonPath(5, 7.5, iconCenter),
  createPolygonPath(6, 7.5, iconCenter),
  createStarPath(3, 7.5, 2, iconCenter),
  createStarPath(4, 7.5, 3, iconCenter),
  createStarPath(5, 7.5, 3, iconCenter),
  createStarPath(8, 7.5, 4, iconCenter),
  createPolarRosePath(3, 7.5, 0.25, iconCenter, 30)
    + createCirclePath(2, iconCenter, true),
  createPolarRosePath(4, 7.5, 0.25, iconCenter, 22.5)
    + createCirclePath(3, iconCenter, true),
  createPolarRosePath(5, 7.5, 0.25, iconCenter, 18)
    + createCirclePath(4, iconCenter, true),
  createPolygonPath(4, 7.5, iconCenter, 45),
  createPolarRosePath(2, 7.5, 0.25, iconCenter, 45)
    + createCirclePath(2, iconCenter, true),
  createArcStarPath(3, 7.5, 3, iconCenter, -60),
  createArcStarPath(4, 7.5, 2, iconCenter),
  createArcStarPath(4, 7.5, 3, iconCenter),
  createArcStarPath(4, 7.5, 4, iconCenter, 135),
  createArcStarPath(5, 7.5, 2, iconCenter, 90),
  createArcStarPath(5, 7.5, 3, iconCenter, 36),
  createArcStarPath(5, 7.5, 4, iconCenter, 0),
  createArcStarPath(5, 7.5, 5, iconCenter, -36),
  createPolygonPath(4, i => (i < 2) ? 4 : 7.5, iconCenter, -45),
  createPolygonPath(5, i => (i === 1 || i === 4) ? 5 : 7.5, iconCenter),
];
export function createBaseGameState(city: CityState): GameState {
  const neighborhoods = city.config.neighborhoods
    .map((n, index) => ({
      ...n,
      icon: initialNeighborhoodIcons[index] ?? n.icon,
      lineIds: [],
      waitingCitizens: new Map(),
    }));

  const initialTrains = new Map<string, Train>();
  for (let i = 0; i < city.config.initialEngines; i++) {
    const trainId = `train-initial-${i}`;
    initialTrains.set(trainId, {
      id: trainId,
      lineId: 'unassigned',
      currentNeighborhoodIndex: 0,
      direction: 'forward',
      position: { x: 0, y: 0 },
      passengerIds: [],
      capacity: city.config.initialTrainCapacity,
      speed: city.config.initialTrainSpeed,
    });
  }

  return {
    status: 'playing',
    city: {
      ...city,
      currentDay: 0,
      budget: city.config.initialBudget,
      config: {
        ...city.config,
        neighborhoods,
      },
    },
    railNetwork: {
      lines: new Map(),
      trains: initialTrains,
    },
    currentTripMatrix: undefined, // Will be populated by initializeDay
    citizens: new Map(), // Will be populated by initializeDay
    isSimulating: true,
    simulationTime: 0,
    simulationSpeed: 1,
    activeNeighborhoodCount: city.config.activeNeighborhoodsAtTime(0),
    totalTripsStarted: 0,
    allowedLines: city.config.initialLines,
    currentTrainCapacity: city.config.initialTrainCapacity,
    currentTrainSpeed: city.config.initialTrainSpeed,
    stats: {
      totalCitizensTransported: 0,
      totalMoneySpent: 0,
      totalMoneyEarned: 0,
      totalStationsBuilt: 2,
      totalTrainsPurchased: city.config.initialEngines,
    },
  };
}

export function createGameState(city: CityState): GameState {
  const state = createBaseGameState(city);
  const { tripMatrix, citizens, updatedNetwork } = initializeDay(
    state.city.config,
    state.city.currentDay,
    state.activeNeighborhoodCount,
    state.railNetwork,
  );
  return {
    ...state,
    currentTripMatrix: tripMatrix,
    citizens,
    railNetwork: updatedNetwork,
  };
}

export const baseGameState = createBaseGameState(cities[1]);

import { SeattleConfig } from './cities';
import { cityMap } from './generated-seattle-1mi';
import type { GameState } from './models';
import {
  createArcStarPath,
  createCirclePath,
  createPolarRosePath,
  createPolygonPath,
  createStarPath,
} from './utils/svgShapes';

const CityConfig = {
  ...SeattleConfig,
  config: {
    ...SeattleConfig.config,
    ...cityMap,
    activeNeighborhoodsAtTime: (elapsedMinutes: number) =>
      Math.min(
        SeattleConfig.config.activeNeighborhoodsAtTime(elapsedMinutes),
        cityMap.neighborhoods.length,
      ),
  },
};

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
const neighborhoods = CityConfig.config.neighborhoods
  .map((n, index) => ({
    ...n,
    icon: initialNeighborhoodIcons[index] ?? n.icon,
    lineIds: [],
    waitingCitizens: new Map(),
  }));

// Create initial unassigned trains based on config
const initialTrains = new Map();
for (let i = 0; i < CityConfig.config.initialEngines; i++) {
  const trainId = `train-initial-${i}`;
  initialTrains.set(trainId, {
    id: trainId,
    lineId: 'unassigned',
    currentNeighborhoodIndex: 0,
    direction: 'forward' as const,
    position: { x: 0, y: 0 },
    passengerIds: [],
    capacity: CityConfig.config.initialTrainCapacity,
    speed: CityConfig.config.initialTrainSpeed,
  });
}

export const baseGameState: GameState = {
  status: 'playing',
  city: {
    ...CityConfig,
    config: {
      ...CityConfig.config,
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
  activeNeighborhoodCount: CityConfig.config.activeNeighborhoodsAtTime(0),
  totalTripsStarted: 0,
  allowedLines: CityConfig.config.initialLines,
  currentTrainCapacity: CityConfig.config.initialTrainCapacity,
  currentTrainSpeed: CityConfig.config.initialTrainSpeed,
  stats: {
    totalCitizensTransported: 0,
    totalMoneySpent: 0,
    totalMoneyEarned: 0,
    totalStationsBuilt: 2,
    totalTrainsPurchased: CityConfig.config.initialEngines,
  },
};
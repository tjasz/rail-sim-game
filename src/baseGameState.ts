
import { SeattleConfig } from './cities';
import { cityMap } from './generated-seattle-1mi';
import type { GameState } from './models';

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
const neighborhoods = CityConfig.config.neighborhoods
  .map(n => ({
    ...n,
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
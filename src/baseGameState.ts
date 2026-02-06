
import { SeattleConfig } from './cities';
import type { GameState } from './models';

// Base game configuration (without citizens - they'll be generated)
// Initialize all neighborhoods with station properties
const neighborhoods = SeattleConfig.config.neighborhoods
  .map(n => ({
    ...n,
    lineIds: [],
    waitingCitizens: new Map(),
  }));

// Create initial unassigned trains based on config
const initialTrains = new Map();
for (let i = 0; i < SeattleConfig.config.initialEngines; i++) {
  const trainId = `train-initial-${i}`;
  initialTrains.set(trainId, {
    id: trainId,
    lineId: 'unassigned',
    currentNeighborhoodIndex: 0,
    direction: 'forward' as const,
    position: { x: 0, y: 0 },
    passengerIds: [],
    capacity: SeattleConfig.config.trainCapacity,
    speed: SeattleConfig.config.trainSpeed,
  });
}

export const baseGameState: GameState = {
  status: 'playing',
  city: {
    ...SeattleConfig,
    config: {
      ...SeattleConfig.config,
      neighborhoods,
    },
  },
  railNetwork: {
    lines: new Map(),
    trains: initialTrains,
  },
  currentTripMatrix: undefined, // Will be populated by initializeDay
  citizens: new Map(), // Will be populated by initializeDay
  isSimulating: false,
  simulationTime: 0,
  simulationSpeed: 1,
  activeNeighborhoodCount: SeattleConfig.config.activeNeighborhoodsAtTime(0),
  totalTripsStarted: 0,
  stats: {
    totalCitizensTransported: 0,
    totalMoneySpent: 0,
    totalMoneyEarned: 0,
    totalStationsBuilt: 2,
    totalTrainsPurchased: SeattleConfig.config.initialEngines,
  },
};
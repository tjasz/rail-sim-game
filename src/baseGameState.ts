
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
    trains: new Map(),
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
    totalTrainsPurchased: 1,
  },
};
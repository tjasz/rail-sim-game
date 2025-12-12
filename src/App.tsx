import { Game } from './Game';
import type { GameState } from './models';
import { initializeDay } from './utils';
import './App.css';
import { SeattleConfig } from './cities';

// Base game configuration (without citizens - they'll be generated)
// Initialize all neighborhoods with station properties
const neighborhoods = SeattleConfig.config.neighborhoods
  .map(n => ({
    ...n,
    lineIds: [],
    waitingCitizens: new Map(),
  }));

const baseGameState: GameState = {
  status: 'playing',
  city: {
    ...SeattleConfig,
    config: {
      ...SeattleConfig.config,
      neighborhoods,
    },
  },
  railNetwork: {
    tracks: new Map(),
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
    totalTrackMilesBuilt: 2.24,
    totalTrainsPurchased: 1,
  },
};

function App() {
  // Initialize the first day with continuous trip generation
  const { tripMatrix, citizens, updatedNetwork } = initializeDay(
    baseGameState.city.config,
    baseGameState.city.currentDay,
    baseGameState.activeNeighborhoodCount,
    baseGameState.railNetwork,
  );
  
  const gameState = {
    ...baseGameState,
    currentTripMatrix: tripMatrix,
    citizens,
    railNetwork: updatedNetwork,
  };

  return <Game gameState={gameState} />;
}

export default App;

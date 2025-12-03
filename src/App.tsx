import { Game } from './Game';
import type { GameState } from './models';
import { calculateDistance, initializeDay } from './utils';
import './App.css';
import { SeattleConfig } from './cities';

// Base game configuration (without citizens - they'll be generated)
const baseGameState: GameState = {
  status: 'playing',
  city: {
    ...SeattleConfig,
    config: {
      ...SeattleConfig.config,
      neighborhoods: SeattleConfig.config.neighborhoods.sort((a, b) => {
        const aScore = (a.residents + 0.5 * a.proportionOfJobs) * (17.8 - calculateDistance(a.position, { x: 5, y: 11 }));
        const bScore = (b.residents + 0.5 * b.proportionOfJobs) * (17.8 - calculateDistance(b.position, { x: 5, y: 11 }));
        return bScore - aScore;
      }),
    },
  },
  railNetwork: {
    stations: new Map(),
    tracks: new Map(),
    lines: new Map(),
    trains: new Map(),
  },
  currentTripMatrix: undefined, // Will be populated by initializeDay
  citizens: new Map(), // Will be populated by initializeDay
  isSimulating: false,
  simulationTime: 0,
  simulationSpeed: 1,
  stats: {
    totalDaysPlayed: 0,
    totalCitizensTransported: 0,
    totalHappyCitizens: 0,
    totalUnhappyCitizens: 0,
    currentDayHappyCitizens: 0,
    currentDayUnhappyCitizens: 0,
    happinessRate: 0,
    totalMoneySpent: 0,
    totalMoneyEarned: 0,
    totalStationsBuilt: 2,
    totalTrackMilesBuilt: 2.24,
    totalTrainsPurchased: 1,
  },
};

function App() {
  // Initialize the first day with citizens and positioned trains
  const { tripMatrix, citizens, updatedNetwork } = initializeDay(
    baseGameState.city.config,
    baseGameState.city.currentDay,
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

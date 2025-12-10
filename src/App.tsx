import { Game } from './Game';
import type { GameState, Neighborhood, Station } from './models';
import { calculateDistance, initializeDay } from './utils';
import './App.css';
import { SeattleConfig } from './cities';

const getNeighborhoodPriority = (neighborhood: Neighborhood) => {
  return (neighborhood.residents + 0.125 * neighborhood.proportionOfJobs) * (17.2 - calculateDistance(neighborhood.position, { x: 5, y: 10 }));
}

// Base game configuration (without citizens - they'll be generated)
const neighborhoods = SeattleConfig.config.neighborhoods
  .filter(n => 
    SeattleConfig.config.tiles[n.position.x][n.position.y] !== 'w'
  )
  .sort((a, b) => {
    const aScore = getNeighborhoodPriority(a);
    const bScore = getNeighborhoodPriority(b);
    return bScore - aScore;
  });
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
    // Automatically build stations at each active neighborhood
    stations: new Map([
      ...neighborhoods.slice(0, SeattleConfig.config.activeNeighborhoodsAtTime(0)).map<[string, Station]>(n => {
        const stationId = `station-${n.id}`;
        const station : Station = {
          id: stationId,
          neighborhoodId: n.id,
          position: { ...n.position },
          lineIds: [],
          waitingCitizens: new Map(),
        };
        return [stationId, station];
      }),
    ]),
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

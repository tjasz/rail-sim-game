import { Game } from './Game';
import { initializeDay } from './utils';
import './App.css';
import { baseGameState } from './baseGameState';

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

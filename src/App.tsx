import { useState } from 'react';
import { Game } from './Game';
import type { GameState } from './models';
import { cities } from './cities/index';
import './App.css';
import { createGameState } from './baseGameState';

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  if (gameState) {
    return <Game gameState={gameState} onExit={() => setGameState(null)} />;
  }

  return (
    <main className="front-menu">
      <section className="front-menu-card" aria-labelledby="menu-title">
        <h1 id="menu-title">Rails Game</h1>
        <p>Choose a city map to build your metro system.</p>
        <div className="city-options">
          {cities.map(city => (
            <button
              key={city.config.id}
              className="city-option"
              onClick={() => setGameState(createGameState(city))}
            >
              {city.config.name}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;

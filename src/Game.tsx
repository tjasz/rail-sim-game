import { useState, useEffect, useCallback } from 'react';
import {
  GameStats,
  NetworkStats,
  CityGrid,
  TrackOverlay,
  TrainMarkers,
  LinesList,
  TrainsList,
  PassengersList,
  StationsList
} from './components';
import type { GameState } from './models';
import { tickSimulation, formatTime, MINUTES_PER_DAY } from './utils';
import './Game.css';

interface GameProps {
  gameState: GameState;
  onGameStateChange?: (newState: GameState) => void;
}

export function Game({ gameState: initialGameState, onGameStateChange }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [activeTab, setActiveTab] = useState<'lines' | 'trains' | 'stations' | 'passengers'>('lines');

  // Update local state when prop changes
  useEffect(() => {
    setGameState(initialGameState);
  }, [initialGameState]);

  // Notify parent of state changes
  useEffect(() => {
    onGameStateChange?.(gameState);
  }, [gameState, onGameStateChange]);

  // Simulation loop
  useEffect(() => {
    if (!gameState.isSimulating) return;

    const interval = setInterval(() => {
      setGameState((prevState) => {
        const deltaMinutes = (0.05 * prevState.simulationSpeed * 1440) / 1000; // 50ms tick scaled
        return tickSimulation(prevState, deltaMinutes);
      });
    }, 50); // 50ms tick rate

    return () => clearInterval(interval);
  }, [gameState.isSimulating, gameState.simulationSpeed]);

  const handleStartPause = useCallback(() => {
    setGameState((prevState) => ({
      ...prevState,
      isSimulating: !prevState.isSimulating,
    }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setGameState((prevState) => ({
      ...prevState,
      simulationSpeed: speed,
    }));
  }, []);
  
  const timeOfDay = formatTime(gameState.simulationTime);
  const dayProgress = (gameState.simulationTime / MINUTES_PER_DAY) * 100;

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Rails Game</h1>
        <div className="day-time-display">
          <div className="day-info">
            <span className="day-label">Day {gameState.city.currentDay}</span>
            <span className="time-label">{timeOfDay}</span>
          </div>
          <div className="time-progress-bar">
            <div 
              className="time-progress-fill" 
              style={{ width: `${dayProgress}%` }}
            />
          </div>
        </div>
        <div className="game-controls">
          <div className="speed-controls">
            <button
              className={`speed-btn ${gameState.simulationSpeed === 1 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(1)}
              disabled={!gameState.isSimulating}
            >
              1x
            </button>
            <button
              className={`speed-btn ${gameState.simulationSpeed === 2 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(2)}
              disabled={!gameState.isSimulating}
            >
              2x
            </button>
            <button
              className={`speed-btn ${gameState.simulationSpeed === 5 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(5)}
              disabled={!gameState.isSimulating}
            >
              5x
            </button>
          </div>
          <button className="btn-primary" onClick={handleStartPause}>
            {gameState.isSimulating ? '⏸ Pause' : '▶ Start Day'}
          </button>
          <button className="btn-secondary">🔧 Build Mode</button>
        </div>
      </div>
      
      <div className="game-content">
        <div className="left-panel">
          <GameStats
            stats={gameState.stats}
            budget={gameState.city.budget}
            population={gameState.city.population}
            currentDay={gameState.city.currentDay}
            currentMonth={gameState.city.currentMonth}
          />
          
          <NetworkStats network={gameState.railNetwork} />
          
          <div className="panel-tabs">
            <button
              className={`tab ${activeTab === 'lines' ? 'active' : ''}`}
              onClick={() => setActiveTab('lines')}
            >
              Lines
            </button>
            <button
              className={`tab ${activeTab === 'trains' ? 'active' : ''}`}
              onClick={() => setActiveTab('trains')}
            >
              Trains
            </button>
            <button
              className={`tab ${activeTab === 'stations' ? 'active' : ''}`}
              onClick={() => setActiveTab('stations')}
            >
              Stations
            </button>
            <button
              className={`tab ${activeTab === 'passengers' ? 'active' : ''}`}
              onClick={() => setActiveTab('passengers')}
            >
              Passengers
            </button>
          </div>
          
          <div className="panel-content">
            {activeTab === 'lines' && (
              <LinesList
                lines={gameState.railNetwork.lines}
                stations={gameState.railNetwork.stations}
              />
            )}
            {activeTab === 'trains' && (
              <TrainsList
                trains={gameState.railNetwork.trains}
                lines={gameState.railNetwork.lines}
                stations={gameState.railNetwork.stations}
              />
            )}
            {activeTab === 'stations' && (
              <StationsList
                stations={gameState.railNetwork.stations}
                lines={gameState.railNetwork.lines}
              />
            )}
            {activeTab === 'passengers' && (
              <PassengersList
                citizens={gameState.citizens}
                neighborhoods={gameState.city.config.neighborhoods}
              />
            )}
          </div>
        </div>
        
        <div className="map-panel">
          <div className="map-container">
            <CityGrid
              config={gameState.city.config}
              neighborhoods={gameState.city.config.neighborhoods}
              stations={gameState.railNetwork.stations}
              citizens={gameState.citizens}
            />
            <TrackOverlay
              tracks={gameState.railNetwork.tracks}
              lines={gameState.railNetwork.lines}
              gridWidth={gameState.city.config.gridWidth}
              gridHeight={gameState.city.config.gridHeight}
            />
            <TrainMarkers
              trains={gameState.railNetwork.trains}
              lines={gameState.railNetwork.lines}
              stations={gameState.railNetwork.stations}
              gridWidth={gameState.city.config.gridWidth}
              gridHeight={gameState.city.config.gridHeight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

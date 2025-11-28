import { useState } from 'react';
import {
  GameStats,
  NetworkStats,
  CityGrid,
  TrackOverlay,
  LinesList,
  TrainsList,
  PassengersList,
  StationsList
} from './components';
import type { GameState } from './models';
import './Game.css';

interface GameProps {
  gameState: GameState;
}

export function Game({ gameState }: GameProps) {
  const [activeTab, setActiveTab] = useState<'lines' | 'trains' | 'stations' | 'passengers'>('lines');
  
  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Rails Game</h1>
        <div className="game-controls">
          <button className="btn-primary">
            {gameState.isSimulating ? 'Pause' : 'Start Day'}
          </button>
          <button className="btn-secondary">Build Mode</button>
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
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { GameStats } from '../models';

interface GameStatsProps {
  stats: GameStats;
  budget: number;
  population: number;
  currentDay: number;
}

export function GameStats({ stats, budget, population, currentDay }: GameStatsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <div className="game-stats">
      <div className="stats-header">
        <h2>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              marginRight: '8px',
              padding: 0,
              fontSize: 'inherit'
            }}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
          Game Statistics
        </h2>
      </div>
      
      {!isCollapsed && <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Day</span>
          <span className="stat-value">{currentDay}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Population</span>
          <span className="stat-value">{population.toLocaleString()}</span>
        </div>
        
        <div className="stat-item budget">
          <span className="stat-label">Budget</span>
          <span className="stat-value">${budget.toLocaleString()}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Happiness Rate</span>
          <span className={`stat-value ${stats.happinessRate >= 50 ? 'happy' : 'unhappy'}`}>
            {stats.happinessRate.toFixed(1)}%
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Today: Happy / Unhappy</span>
          <span className="stat-value">
            {stats.currentDayHappyCitizens} / {stats.currentDayUnhappyCitizens}
          </span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Total Days</span>
          <span className="stat-value">{stats.totalDaysPlayed}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Total Transported</span>
          <span className="stat-value">{stats.totalCitizensTransported.toLocaleString()}</span>
        </div>
      </div>}
    </div>
  );
}

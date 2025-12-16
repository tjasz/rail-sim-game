import type { GameState } from '../models';

interface GameOverModalProps {
  gameState: GameState;
  onRestart?: () => void;
  onContinueEndless?: () => void;
}

export function GameOverModal({ gameState, onRestart, onContinueEndless }: GameOverModalProps) {
  // Find the neighborhood that caused the game over
  const crowdedStation = gameState.city.config.neighborhoods.find(
    n => (n.crowdingTime || 0) >= gameState.city.config.stationCrowdingTimeLimit
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content game-over-modal">
        <h2 className="failure">
          {'✗ Game Over'}
        </h2>
        
        <div className="result-summary">
          <div className="result-message">
            <p>
              {crowdedStation 
                ? `Station "${crowdedStation.name}" was overcrowded for too long!`
                : 'A station was overcrowded for too long!'
              }
            </p>
            <p>
              Too many passengers were waiting, and the station couldn't handle the crowd.
            </p>
          </div>
          
          <div className="result-grid">
            <div className="result-stat">
              <span className="stat-label">Day Reached</span>
              <span className="stat-value">{gameState.city.currentDay}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Citizens Transported</span>
              <span className="stat-value">{gameState.stats.totalCitizensTransported.toLocaleString()}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Total Earned</span>
              <span className="stat-value success">${gameState.stats.totalMoneyEarned.toLocaleString()}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Total Spent</span>
              <span className="stat-value">${gameState.stats.totalMoneySpent.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {onContinueEndless && (
            <button className="btn-large btn-primary" onClick={onContinueEndless}>
              {'Continue in Endless Mode'}
            </button>
          )}
          {onRestart && (
            <button className="btn-large btn-primary" onClick={onRestart}>
              {'Restart Game'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

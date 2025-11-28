import type { DayResult } from '../models';

interface DayResultModalProps {
  result: DayResult;
  onContinue: () => void;
  onGameOver?: () => void;
}

export function DayResultModal({ result, onContinue, onGameOver }: DayResultModalProps) {
  const handleClick = () => {
    if (result.passed) {
      onContinue();
    } else {
      onGameOver?.();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content day-result-modal">
        <h2 className={result.passed ? 'success' : 'failure'}>
          {result.passed ? '✓ Day Complete!' : '✗ Day Failed'}
        </h2>
        
        <div className="result-summary">
          <div className="result-stat">
            <span className="stat-label">Day {result.day}</span>
          </div>
          
          <div className="result-stat large">
            <span className="stat-label">Happiness Rate</span>
            <span className={`stat-value ${result.passed ? 'success' : 'failure'}`}>
              {result.happinessRate.toFixed(1)}%
            </span>
          </div>
          
          <div className="result-grid">
            <div className="result-stat">
              <span className="stat-label">Total Citizens</span>
              <span className="stat-value">{result.totalCitizens}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Happy</span>
              <span className="stat-value success">{result.happyCitizens}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Unhappy</span>
              <span className="stat-value failure">{result.unhappyCitizens}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Budget Earned</span>
              <span className="stat-value success">${result.budgetEarned.toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="result-message">
          {result.passed ? (
            <p>Great job! More than half of your citizens were happy with the metro service.</p>
          ) : (
            <p>Too many citizens were unhappy with the metro service. Try expanding your network!</p>
          )}
        </div>
        
        <button className="btn-large btn-primary" onClick={handleClick}>
          {result.passed ? 'Continue to Next Day' : 'Game Over'}
        </button>
      </div>
    </div>
  );
}

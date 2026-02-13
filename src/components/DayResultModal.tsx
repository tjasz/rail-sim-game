import type { DayResult } from '../models';

interface DayResultModalProps {
  result: DayResult;
  onContinue: () => void;
}

export function DayResultModal({ result, onContinue }: DayResultModalProps) {
  return (
    <div className="modal-overlay">
      <div className="modal-content day-result-modal">
        <h2 className="success">
          {'✓ Day Complete!'}
        </h2>
        
        <div className="result-summary">
          <div className="result-stat">
            <span className="stat-label">Day {result.day}</span>
          </div>
          
          <div className="result-grid">            
            <div className="result-stat">
              <span className="stat-label">Budget Earned</span>
              <span className="stat-value success">${result.budgetEarned.toLocaleString()}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Trains Earned</span>
              <span className="stat-value success">{result.enginesEarned}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Lines Earned</span>
              <span className="stat-value success">{result.linesEarned}</span>
            </div>
            
            <div className="result-stat">
              <span className="stat-label">Train Capacity Earned</span>
              <span className="stat-value success">+{result.trainCapacityEarned}</span>
            </div>
          </div>
        </div>
        
        <button className="btn-large btn-primary" onClick={onContinue}>
          {'Continue to Next Day'}
        </button>
      </div>
    </div>
  );
}

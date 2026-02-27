import { useState } from 'react';
import type { DayResult, RewardPackage } from '../models';

interface DayResultModalProps {
  result: DayResult;
  onContinue: (selectedPackage: RewardPackage) => void;
}

export function DayResultModal({ result, onContinue }: DayResultModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<RewardPackage | null>(null);

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
            
            {result.linesEarned > 0 && (
              <div className="result-stat">
                <span className="stat-label">Lines Earned</span>
                <span className="stat-value success">+{result.linesEarned}</span>
              </div>
            )}
          </div>
        </div>

        <h3 style={{ marginTop: '16px', marginBottom: '8px' }}>Choose your train reward:</h3>
        <div className="reward-packages">
          {result.rewardPackages.map((pkg) => (
            <button
              key={pkg.id}
              className={`reward-package${selectedPackage?.id === pkg.id ? ' selected' : ''}`}
              onClick={() => setSelectedPackage(pkg)}
            >
              <span className="pkg-label">{pkg.label}</span>
              <span className="pkg-detail">
                {pkg.enginesEarned} train{pkg.enginesEarned > 1 ? 's' : ''} · {pkg.trainCapacity} pax · {pkg.trainSpeed} spd
              </span>
            </button>
          ))}
        </div>
        
        <button
          className="btn-large btn-primary"
          disabled={!selectedPackage}
          onClick={() => selectedPackage && onContinue(selectedPackage)}
        >
          {'Continue to Next Day'}
        </button>
      </div>
    </div>
  );
}

import type { Train, Line, Station } from '../models';

interface TrainsListProps {
  trains: Map<string, Train>;
  lines: Map<string, Line>;
  stations: Map<string, Station>;
  budget: number;
  trainCost: number;
  onPurchaseTrain: () => void;
  onAssignTrainToLine: (trainId: string, lineId: string) => void;
}

export function TrainsList({ 
  trains, 
  lines, 
  stations,
  budget,
  trainCost,
  onPurchaseTrain,
  onAssignTrainToLine
}: TrainsListProps) {
  const canAffordTrain = budget >= trainCost;
  const hasLines = lines.size > 0;

  return (
    <div className="trains-list">
      <div className="trains-header">
        <h3>Trains</h3>
        <button 
          className="btn-purchase-train"
          onClick={onPurchaseTrain}
          disabled={!canAffordTrain}
          title={!canAffordTrain ? `Insufficient budget (need $${trainCost.toLocaleString()})` : `Purchase train for $${trainCost.toLocaleString()}`}
        >
          + Purchase Train (${trainCost.toLocaleString()})
        </button>
      </div>
      {trains.size === 0 ? (
        <p className="empty-state">No trains purchased yet</p>
      ) : (
        <div className="trains-container">
          {Array.from(trains.values()).map(train => {
            const line = lines.get(train.lineId);
            const currentStation = line?.stationIds[train.currentStationIndex];
            const station = currentStation ? stations.get(currentStation) : null;
            const isUnassigned = !line;
            
            return (
              <div key={train.id} className={`train-item ${isUnassigned ? 'unassigned' : ''}`}>
                <div className="train-header">
                  <span className="train-id">Train {train.id}</span>
                  {line ? (
                    <span 
                      className="train-line"
                      style={{ backgroundColor: line.color }}
                    >
                      {line.name}
                    </span>
                  ) : (
                    <span className="train-line unassigned-badge">
                      Not Assigned
                    </span>
                  )}
                </div>
                <div className="train-details">
                  <span>Passengers: {train.passengerIds.length} / {train.capacity}</span>
                  <span>Direction: {train.direction}</span>
                  {station && <span>At: {station.neighborhoodId}</span>}
                </div>
                {isUnassigned ? (
                  <div className="train-assignment">
                    {hasLines ? (
                      <>
                        <label htmlFor={`train-${train.id}-line`}>Assign to line:</label>
                        <select 
                          id={`train-${train.id}-line`}
                          className="line-selector"
                          onChange={(e) => {
                            if (e.target.value) {
                              onAssignTrainToLine(train.id, e.target.value);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">Select a line...</option>
                          {Array.from(lines.values()).map(l => (
                            <option key={l.id} value={l.id}>
                              {l.name} ({l.stationIds.length} stations)
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <p className="warning-text">Create a line first to assign this train</p>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

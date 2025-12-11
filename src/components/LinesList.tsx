import type { Line, Neighborhood, Train } from '../models';

interface LinesListProps {
  lines: Map<string, Line>;
  trains: Map<string, Train>;
  neighborhoods: Neighborhood[];
  budget: number;
  trainCost: number;
  onPurchaseTrain: () => void;
  onAssignTrainToLine: (trainId: string, lineId: string) => void;
  onRemoveTrainFromLine: (trainId: string) => void;
}

export function LinesList({ 
  lines, 
  trains,
  neighborhoods: _neighborhoods,
  budget,
  trainCost,
  onPurchaseTrain,
  onAssignTrainToLine,
  onRemoveTrainFromLine
}: LinesListProps) {
  const canAffordTrain = budget >= trainCost;
  
  // Get unassigned trains
  const unassignedTrains = Array.from(trains.values()).filter(
    train => train.lineId === 'unassigned'
  );
  
  // Helper function to get trains for a specific line
  const getTrainsForLine = (lineId: string) => {
    return Array.from(trains.values()).filter(train => train.lineId === lineId);
  };
  
  // Helper function to assign first unassigned train to a line
  const handleAddTrainToLine = (lineId: string) => {
    if (unassignedTrains.length > 0) {
      onAssignTrainToLine(unassignedTrains[0].id, lineId);
    }
  };
  
  // Helper function to remove the first train from a line
  const handleRemoveTrainFromLine = (lineId: string) => {
    const lineTrains = getTrainsForLine(lineId);
    if (lineTrains.length > 0) {
      onRemoveTrainFromLine(lineTrains[0].id);
    }
  };
  return (
    <div className="lines-list">
      <div className="lines-header">
        <h3>Metro Lines</h3>
        <button 
          className="btn-purchase-train"
          onClick={onPurchaseTrain}
          disabled={!canAffordTrain}
          title={!canAffordTrain ? `Insufficient budget (need $${trainCost.toLocaleString()})` : `Purchase train for $${trainCost.toLocaleString()}`}
        >
          + Purchase Train (${trainCost.toLocaleString()})
        </button>
      </div>
      
      {/* Unassigned Trains Row */}
      <div className="lines-container">
        <div className="line-item unassigned">
          <div 
            className="line-color" 
            style={{ backgroundColor: '#999' }}
          />
          <div className="line-info">
            <div className="line-name">No Line</div>
            <div className="line-details">
              {unassignedTrains.length} trains
            </div>
          </div>
          <div className="line-actions">
            <button 
              className="btn-train-action"
              disabled={true}
              title="Assign trains from the lines below"
            >
              -
            </button>
            <button 
              className="btn-train-action"
              disabled={true}
              title="Cannot add trains to unassigned pool"
            >
              +
            </button>
          </div>
        </div>
        
        {/* Existing Lines */}
        {lines.size === 0 ? (
          <p className="empty-state">No lines created yet</p>
        ) : (
          Array.from(lines.values()).map(line => {
            const lineTrains = getTrainsForLine(line.id);
            const hasUnassignedTrains = unassignedTrains.length > 0;
            const hasTrainsOnLine = lineTrains.length > 0;
            
            return (
              <div key={line.id} className="line-item">
                <div 
                  className="line-color" 
                  style={{ backgroundColor: line.color }}
                />
                <div className="line-info">
                  <div className="line-name">{line.name}</div>
                  <div className="line-details">
                    {line.neighborhoodIds.length} stops | {lineTrains.length} trains
                    {line.isActive ? ' ✓' : ' (inactive)'}
                  </div>
                </div>
                <div className="line-actions">
                  <button 
                    className="btn-train-action"
                    onClick={() => handleRemoveTrainFromLine(line.id)}
                    disabled={!hasTrainsOnLine}
                    title={hasTrainsOnLine ? "Remove train from line" : "No trains on this line"}
                  >
                    -
                  </button>
                  <button 
                    className="btn-train-action"
                    onClick={() => handleAddTrainToLine(line.id)}
                    disabled={!hasUnassignedTrains}
                    title={hasUnassignedTrains ? "Assign train from unassigned pool" : "No unassigned trains available"}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

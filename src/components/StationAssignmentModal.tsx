import type { Neighborhood, Line, RailNetwork } from '../models';
import { generateLineColor } from '../utils';
import './StationAssignmentModal.css';

interface StationAssignmentModalProps {
  neighborhood: Neighborhood;
  neighborhoods: Map<string, Neighborhood>;
  railNetwork: RailNetwork;
  onClose: () => void;
  onAssignLine: (neighborhoodId: string, lineId: string) => void;
  onUnassignLine: (neighborhoodId: string, lineId: string) => void;
  onCreateNewLine: (neighborhoodId: string, lineName: string, lineColor: string) => void;
}

export function StationAssignmentModal({
  neighborhood,
  neighborhoods,
  railNetwork,
  onClose,
  onAssignLine,
  onUnassignLine,
  onCreateNewLine,
}: StationAssignmentModalProps) {
  // Get currently assigned lines
  const lineIds = neighborhood.lineIds ?? [];
  const assignedLines = lineIds
    .map(lineId => railNetwork.lines.get(lineId))
    .filter(line => line !== undefined) as Line[];

  // Find assignable lines: lines that already exist
  const assignableLines: Array<{ line: Line; connectedNeighborhoods: Neighborhood[] }> = [];
  
  for (const line of railNetwork.lines.values()) {
    // Skip if already assigned
    if (lineIds.includes(line.id)) continue;
    
    // Get all neighborhoods on this line
    const lineNeighborhoods: Neighborhood[] = line.neighborhoodIds
      .map(neighborhoodId => neighborhoods.get(neighborhoodId))
      .filter(s => s !== undefined) as Neighborhood[];
    
    if (lineNeighborhoods.length > 0) {
      assignableLines.push({ line, connectedNeighborhoods: lineNeighborhoods });
    }
  }

  const handleAssignLine = (lineId: string) => {
    // Simply assign to the end of the line (no track pathfinding needed)
    onAssignLine(neighborhood.id, lineId);
  };


  const handleCreateNewLine = () => {
    const existingColors = Array.from(railNetwork.lines.values()).map(line => line.color);
    const newColor = generateLineColor(existingColors);

    onCreateNewLine(neighborhood.id, `${railNetwork.lines.size + 1}`, newColor);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content station-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Station: {neighborhood.id || `(${neighborhood.position.x}, ${neighborhood.position.y})`}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Currently Assigned Lines */}
          <section className="modal-section">
            <h3>Assigned Lines ({assignedLines.length})</h3>
            {assignedLines.length === 0 ? (
              <p className="empty-message">No lines assigned to this station</p>
            ) : (
              <div className="lines-list">
                {assignedLines.map(line => (
                  <div key={line.id} className="line-item">
                    <div className="line-info">
                      <div 
                        className="line-color-badge" 
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="line-name">{line.name}</span>
                      <span className="line-stations-count">
                        {line.neighborhoodIds.length} stops
                      </span>
                    </div>
                    <button 
                      className="btn-unassign"
                      onClick={() => onUnassignLine(neighborhood.id, line.id)}
                    >
                      Unassign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Assignable Lines */}
          <section className="modal-section">
            <h3>Available Lines to Assign ({assignableLines.length})</h3>
            {assignableLines.length === 0 ? (
              <p className="empty-message">No lines can be assigned (no connected neighborhoods)</p>
            ) : (
              <div className="lines-list">
                {assignableLines.map(({ line, connectedNeighborhoods }) => (
                  <div key={line.id} className="line-item">
                    <div className="line-info">
                      <div 
                        className="line-color-badge" 
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="line-name">{line.name}</span>
                      <span className="line-stations-count">
                        {connectedNeighborhoods.length} connected
                      </span>
                    </div>
                    <button 
                      className="btn-assign"
                      onClick={() => handleAssignLine(line.id)}
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Create New Line */}
          <section className="modal-section">
            <h3>Create New Line</h3>
              <button 
                className="btn-primary"
                onClick={() => handleCreateNewLine()}
              >
                + Create New Line
              </button>
          </section>
        </div>
      </div>
    </div>
  );
}

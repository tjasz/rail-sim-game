import { useState } from 'react';
import type { Station, Line, RailNetwork } from '../models';
import { findShortestTrackPath, areStationsConnected, generateLineColor } from '../utils';
import './StationAssignmentModal.css';

interface StationAssignmentModalProps {
  station: Station;
  railNetwork: RailNetwork;
  onClose: () => void;
  onAssignLine: (stationId: string, lineId: string, trackIds: string[]) => void;
  onUnassignLine: (stationId: string, lineId: string) => void;
  onCreateNewLine: (stationId: string, lineName: string, lineColor: string) => void;
}

export function StationAssignmentModal({
  station,
  railNetwork,
  onClose,
  onAssignLine,
  onUnassignLine,
  onCreateNewLine,
}: StationAssignmentModalProps) {
  const [newLineName, setNewLineName] = useState('');
  const [isCreatingLine, setIsCreatingLine] = useState(false);

  // Get currently assigned lines
  const assignedLines = station.lineIds
    .map(lineId => railNetwork.lines.get(lineId))
    .filter(line => line !== undefined) as Line[];

  // Find assignable lines: lines that have at least one station connected to this station
  const assignableLines: Array<{ line: Line; connectedStations: Station[] }> = [];
  
  for (const line of railNetwork.lines.values()) {
    // Skip if already assigned
    if (station.lineIds.includes(line.id)) continue;
    
    // Check if any station on this line is connected to our station
    const connectedStations = line.stationIds
      .map(stationId => railNetwork.stations.get(stationId))
      .filter(s => s !== undefined)
      .filter(s => areStationsConnected(station, s!, railNetwork.tracks)) as Station[];
    
    if (connectedStations.length > 0) {
      assignableLines.push({ line, connectedStations });
    }
  }

  const handleAssignLine = (lineId: string) => {
    const line = railNetwork.lines.get(lineId);
    if (!line) return;

    // Find the closest station on this line
    let closestStation: Station | null = null;
    let shortestPath: string[] | null = null;

    for (const stationId of line.stationIds) {
      const otherStation = railNetwork.stations.get(stationId);
      if (!otherStation) continue;

      const path = findShortestTrackPath(station, otherStation, railNetwork.tracks);
      if (path && (shortestPath === null || path.length < shortestPath.length)) {
        closestStation = otherStation;
        shortestPath = path;
      }
    }

    if (closestStation && shortestPath) {
      onAssignLine(station.id, lineId, shortestPath);
    }
  };

  const handleCreateNewLine = () => {
    if (!newLineName.trim()) return;

    const existingColors = Array.from(railNetwork.lines.values()).map(line => line.color);
    const newColor = generateLineColor(existingColors);

    onCreateNewLine(station.id, newLineName.trim(), newColor);
    setNewLineName('');
    setIsCreatingLine(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content station-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Station: {station.neighborhoodId || `(${station.position.x}, ${station.position.y})`}</h2>
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
                        {line.stationIds.length} stations
                      </span>
                    </div>
                    <button 
                      className="btn-unassign"
                      onClick={() => onUnassignLine(station.id, line.id)}
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
              <p className="empty-message">No lines can be assigned (no connected stations)</p>
            ) : (
              <div className="lines-list">
                {assignableLines.map(({ line, connectedStations }) => (
                  <div key={line.id} className="line-item">
                    <div className="line-info">
                      <div 
                        className="line-color-badge" 
                        style={{ backgroundColor: line.color }}
                      />
                      <span className="line-name">{line.name}</span>
                      <span className="line-stations-count">
                        {connectedStations.length} connected station{connectedStations.length !== 1 ? 's' : ''}
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
            {!isCreatingLine ? (
              <button 
                className="btn-primary"
                onClick={() => setIsCreatingLine(true)}
              >
                + Create New Line
              </button>
            ) : (
              <div className="create-line-form">
                <input
                  type="text"
                  className="line-name-input"
                  placeholder="Enter line name..."
                  value={newLineName}
                  onChange={(e) => setNewLineName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNewLine();
                    }
                  }}
                  autoFocus
                />
                <div className="create-line-buttons">
                  <button 
                    className="btn-primary"
                    onClick={handleCreateNewLine}
                    disabled={!newLineName.trim()}
                  >
                    Create
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setIsCreatingLine(false);
                      setNewLineName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

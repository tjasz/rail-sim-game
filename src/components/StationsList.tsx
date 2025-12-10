import type { Neighborhood, Line } from '../models';

interface StationsListProps {
  neighborhoods: Neighborhood[];
  lines: Map<string, Line>;
}

export function StationsList({ neighborhoods, lines }: StationsListProps) {
  // Filter to only neighborhoods that have lines (stations)
  const stations = neighborhoods.filter(n => (n.lineIds ?? []).length > 0);
  
  return (
    <div className="stations-list">
      <h3>Stations ({stations.length})</h3>
      {stations.length === 0 ? (
        <p className="empty-state">No stations built yet</p>
      ) : (
        <div className="stations-container">
          {stations.map(neighborhood => {
            const lineIds = neighborhood.lineIds ?? [];
            const waitingCitizens = neighborhood.waitingCitizens ?? new Map();
            const totalWaiting = Array.from(waitingCitizens.values())
              .reduce((sum, arr) => sum + arr.length, 0);
            
            return (
              <div key={neighborhood.id} className="station-item">
                <div className="station-header">
                  <span className="station-name">{neighborhood.id}</span>
                  <span className="station-location">
                    ({neighborhood.position.x}, {neighborhood.position.y})
                  </span>
                </div>
                <div className="station-details">
                  <span>Lines: {lineIds.length}</span>
                  <span>Waiting: {totalWaiting}</span>
                </div>
                {lineIds.length > 0 && (
                  <div className="station-lines">
                    {lineIds.map(lineId => {
                      const line = lines.get(lineId);
                      return line ? (
                        <span
                          key={lineId}
                          className="line-badge"
                          style={{ backgroundColor: line.color }}
                        >
                          {line.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

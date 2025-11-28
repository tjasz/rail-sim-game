import type { Station, Line } from '../models';

interface StationsListProps {
  stations: Map<string, Station>;
  lines: Map<string, Line>;
}

export function StationsList({ stations, lines }: StationsListProps) {
  return (
    <div className="stations-list">
      <h3>Stations ({stations.size})</h3>
      {stations.size === 0 ? (
        <p className="empty-state">No stations built yet</p>
      ) : (
        <div className="stations-container">
          {Array.from(stations.values()).map(station => {
            const totalWaiting = Array.from(station.waitingCitizens.values())
              .reduce((sum, arr) => sum + arr.length, 0);
            
            return (
              <div key={station.id} className="station-item">
                <div className="station-header">
                  <span className="station-name">{station.neighborhoodId}</span>
                  <span className="station-location">
                    ({station.position.x}, {station.position.y})
                  </span>
                </div>
                <div className="station-details">
                  <span>Lines: {station.lineIds.length}</span>
                  <span>Waiting: {totalWaiting}</span>
                </div>
                {station.lineIds.length > 0 && (
                  <div className="station-lines">
                    {station.lineIds.map(lineId => {
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

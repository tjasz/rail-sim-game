import type { Line, Station } from '../models';

interface LinesListProps {
  lines: Map<string, Line>;
  stations: Map<string, Station>;
}

export function LinesList({ lines, stations }: LinesListProps) {
  return (
    <div className="lines-list">
      <h3>Metro Lines</h3>
      {lines.size === 0 ? (
        <p className="empty-state">No lines created yet</p>
      ) : (
        <div className="lines-container">
          {Array.from(lines.values()).map(line => {
            const stationNames = line.stationIds
              .map(id => {
                const station = stations.get(id);
                return station ? `Station ${station.neighborhoodId}` : 'Unknown';
              })
              .join(' → ');
            
            return (
              <div key={line.id} className="line-item">
                <div 
                  className="line-color" 
                  style={{ backgroundColor: line.color }}
                />
                <div className="line-info">
                  <div className="line-name">{line.name}</div>
                  <div className="line-details">
                    {line.stationIds.length} stations | {line.trainIds.length} trains
                    {line.isActive ? ' ✓' : ' (inactive)'}
                  </div>
                  <div className="line-route">{stationNames}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

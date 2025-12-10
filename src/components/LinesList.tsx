import type { Line, Neighborhood } from '../models';

interface LinesListProps {
  lines: Map<string, Line>;
  neighborhoods: Neighborhood[];
}

export function LinesList({ lines, neighborhoods }: LinesListProps) {
  return (
    <div className="lines-list">
      <h3>Metro Lines</h3>
      {lines.size === 0 ? (
        <p className="empty-state">No lines created yet</p>
      ) : (
        <div className="lines-container">
          {Array.from(lines.values()).map(line => {
            const neighborhoodNames = line.neighborhoodIds
              .map(id => {
                const neighborhood = neighborhoods.find(n => n.id === id);
                return neighborhood ? `${neighborhood.name} Station` : 'Unknown';
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
                    {line.neighborhoodIds.length} stops | {line.trainIds.length} trains
                    {line.isActive ? ' ✓' : ' (inactive)'}
                  </div>
                  <div className="line-route">{neighborhoodNames}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

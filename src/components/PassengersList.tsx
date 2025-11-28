import type { Citizen, Neighborhood } from '../models';

interface PassengersListProps {
  citizens: Map<string, Citizen>;
  neighborhoods: Neighborhood[];
  maxDisplay?: number;
}

export function PassengersList({ citizens, neighborhoods, maxDisplay = 20 }: PassengersListProps) {
  const citizenArray = Array.from(citizens.values());
  const displayedCitizens = citizenArray.slice(0, maxDisplay);
  
  // Create neighborhood name map
  const neighborhoodNames = new Map<string, string>();
  neighborhoods.forEach(n => neighborhoodNames.set(n.id, n.name));
  
  // Count citizens by state
  const stateCounts = new Map<string, number>();
  citizenArray.forEach(c => {
    stateCounts.set(c.state, (stateCounts.get(c.state) || 0) + 1);
  });
  
  return (
    <div className="passengers-list">
      <h3>Passengers ({citizens.size})</h3>
      
      <div className="passenger-summary">
        <div className="summary-item">
          <span className="happy">Happy: {citizenArray.filter(c => c.isHappy).length}</span>
        </div>
        <div className="summary-item">
          <span className="unhappy">Unhappy: {citizenArray.filter(c => !c.isHappy).length}</span>
        </div>
      </div>
      
      <div className="state-summary">
        {Array.from(stateCounts.entries()).map(([state, count]) => (
          <div key={state} className="state-count">
            <span className="state-label">{state}</span>
            <span className="state-value">{count}</span>
          </div>
        ))}
      </div>
      
      {displayedCitizens.length > 0 && (
        <div className="passengers-container">
          {displayedCitizens.map(citizen => (
            <div 
              key={citizen.id} 
              className={`passenger-item ${citizen.isHappy ? 'happy' : 'unhappy'}`}
            >
              <div className="passenger-route">
                {neighborhoodNames.get(citizen.originNeighborhoodId) || 'Unknown'} →{' '}
                {neighborhoodNames.get(citizen.destinationNeighborhoodId) || 'Unknown'}
              </div>
              <div className="passenger-state">{citizen.state}</div>
            </div>
          ))}
          {citizens.size > maxDisplay && (
            <div className="more-indicator">
              ... and {citizens.size - maxDisplay} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}

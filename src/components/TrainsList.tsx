import type { Train, Line, Station } from '../models';

interface TrainsListProps {
  trains: Map<string, Train>;
  lines: Map<string, Line>;
  stations: Map<string, Station>;
}

export function TrainsList({ trains, lines, stations }: TrainsListProps) {
  return (
    <div className="trains-list">
      <h3>Trains</h3>
      {trains.size === 0 ? (
        <p className="empty-state">No trains purchased yet</p>
      ) : (
        <div className="trains-container">
          {Array.from(trains.values()).map(train => {
            const line = lines.get(train.lineId);
            const currentStation = line?.stationIds[train.currentStationIndex];
            const station = currentStation ? stations.get(currentStation) : null;
            
            return (
              <div key={train.id} className="train-item" onContextMenu={() => console.log(train)}>
                <div className="train-header">
                  <span className="train-id">Train {train.id}</span>
                  {line && (
                    <span 
                      className="train-line"
                      style={{ backgroundColor: line.color }}
                    >
                      {line.name}
                    </span>
                  )}
                </div>
                <div className="train-details">
                  <span>Passengers: {train.passengerIds.length} / {train.capacity}</span>
                  <span>Direction: {train.direction}</span>
                  {station && <span>At: {station.neighborhoodId}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

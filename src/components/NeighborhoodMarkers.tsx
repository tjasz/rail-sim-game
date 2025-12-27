import type { Citizen, CityConfig, Line, Neighborhood } from '../models';
import { NeighborhoodMarker } from './NeighborhoodMarker';

interface NeighborhoodMarkersProps {
  config: CityConfig;
  neighborhoods: Neighborhood[];
  activeNeighborhoodCount: number;
  lines: Map<string, Line>;
  citizens: Map<string, Citizen>;
}

export function NeighborhoodMarkers({ 
  config,
  neighborhoods,
  activeNeighborhoodCount,
  lines,
  citizens,
}: NeighborhoodMarkersProps) {
  return (
    <>
      {neighborhoods.slice(0,activeNeighborhoodCount+5).map((neighborhood, index) => {
        return (
          <NeighborhoodMarker
            key={neighborhood.id} 
            row={config.gridHeight - neighborhood.position.y}
            col={neighborhood.position.x}
            neighborhood={neighborhood}
            neighborhoodIndex={index}
            activeNeighborhoodCount={activeNeighborhoodCount}
            cellSize={1}
            stationCrowdingTimeLimit={config.stationCrowdingTimeLimit}
            lines={lines}
            neighborhoods={new Map(neighborhoods.map(n => [n.id, n]))}
            citizens={citizens}
          />
        );
      })}
    </>
  );
}

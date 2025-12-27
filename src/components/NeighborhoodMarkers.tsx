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
        // Calculate opacity based on activation status
        // Active neighborhoods: opacity 1
        // Next neighborhood: opacity 0.5
        // 2nd next: opacity 0.25
        // 3rd next: opacity 0.125, etc.
        let opacity = 1;
        if (index >= activeNeighborhoodCount) {
          const stepsFromActive = index - activeNeighborhoodCount + 1;
          opacity = Math.pow(0.5, stepsFromActive);
        }

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

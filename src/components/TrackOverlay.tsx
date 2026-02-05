import type { Line, CityConfig, Neighborhood } from '../models';

interface TrackOverlayProps {
  config: CityConfig;
  neighborhoods: Neighborhood[];
  lines: Map<string, Line>;
}

export function TrackOverlay({ config, neighborhoods, lines }: TrackOverlayProps) {
  // Create a map of neighborhoods for quick lookup
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  
  // Create a map of line colors
  const lineColorMap = new Map<string, string>();
  lines.forEach((line, id) => {
    lineColorMap.set(id, line.color);
  });
  
  return (
    <>
      {Array.from(lines.values()).map(line => {
        // Draw lines between consecutive stations
        return line.neighborhoodIds.map((neighborhoodId, idx) => {
          if (idx === 0) return null; // Skip first station (no line before it)
          
          const fromNeighborhood = neighborhoodMap.get(line.neighborhoodIds[idx - 1]);
          const toNeighborhood = neighborhoodMap.get(neighborhoodId);
          
          if (!fromNeighborhood || !toNeighborhood) return null;
          
          // Station positions in grid coordinates [x, y]
          const fromPos: [number, number] = [fromNeighborhood.position.x + 0.5, config.gridHeight - fromNeighborhood.position.y + 0.5];
          const toPos: [number, number] = [toNeighborhood.position.x + 0.5, config.gridHeight - toNeighborhood.position.y + 0.5];
          
          return (
            <line
              key={`${line.id}-${idx}`}
              x1={fromPos[0]}
              y1={fromPos[1]}
              x2={toPos[0]}
              y2={toPos[1]}
              stroke={line.color}
              strokeWidth={0.06}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        });
      })}
    </>
  );
}

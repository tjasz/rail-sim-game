import type { CityConfig, Neighborhood, Station, Citizen, Line } from '../models';
import { CitizenMarker } from './CitizenMarker';
import { GridCell } from './GridCell';
import { NeighborhoodMarker } from './NeighborhoodMarker';
import { StationMarker } from './StationMarker';

interface CityGridProps {
  config: CityConfig;
  neighborhoods: Neighborhood[];
  stations: Map<string, Station>;
  citizens: Map<string, Citizen>;
  lines: Map<string, Line>;
  activeNeighborhoodCount: number;
  cellSize?: number;
  onCellClick?: (x: number, y: number) => void;
  onStationClick?: (stationId: string) => void;
}

export function CityGrid({ 
  config, 
  neighborhoods, 
  stations, 
  citizens,
  lines,
  activeNeighborhoodCount,
  cellSize = 60,
  onCellClick,
  onStationClick 
}: CityGridProps) {
  const width = config.gridWidth * cellSize;
  const height = config.gridHeight * cellSize;
  
  // Create a map of positions to neighborhoods with their indices
  const neighborhoodMap = new Map<string, { neighborhood: Neighborhood; index: number }>();
  neighborhoods.forEach((n, index) => {
    neighborhoodMap.set(`${n.position.x},${n.position.y}`, { neighborhood: n, index });
  });
  
  // Create a map of positions to stations
  const stationMap = new Map<string, Station>();
  stations.forEach(s => {
    stationMap.set(`${s.position.x},${s.position.y}`, s);
  });
  
  return (
    <div className="city-grid-container">
      <svg 
        width={width} 
        height={height} 
        className="city-grid"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Draw grid cells */}
        {Array.from({ length: config.gridWidth }).map((_, x) =>
          Array.from({ length: config.gridHeight }).map((_, y) => {
            const isWater = config.tiles[x][y] === 'w';
            const neighborhoodData = neighborhoodMap.get(`${x},${y}`);
            const station = stationMap.get(`${x},${y}`);
            
            return (
              <g 
                key={`${x}-${y}`}
                onClick={() => onCellClick?.(x, y)}
                style={{ cursor: onCellClick ? 'pointer' : 'default' }}
              >
                {/* Cell background */}
                <GridCell row={y} col={x} isWater={isWater} cellSize={cellSize} />
                
                {neighborhoodData && (
                  <NeighborhoodMarker
                    row={y}
                    col={x}
                    neighborhood={neighborhoodData.neighborhood}
                    neighborhoodIndex={neighborhoodData.index}
                    activeNeighborhoodCount={activeNeighborhoodCount}
                    cellSize={cellSize}
                    />
                )}
                
                {/* Station indicator */}
                {station && (
                  <StationMarker
                    row={y}
                    col={x}
                    station={station}
                    lines={lines}
                    cellSize={cellSize}
                    onStationClick={onStationClick}
                  />
                )}
              </g>
            );
          })
        )}
        
        {/* Draw citizens */}
        {Array.from(citizens.values()).map(citizen => (
          <CitizenMarker key={citizen.id} citizen={citizen} neighborhoods={neighborhoods} cellSize={cellSize} />
        ))}
      </svg>
    </div>
  );
}

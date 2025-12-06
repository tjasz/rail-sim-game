import type { CityConfig, Neighborhood, Citizen } from '../models';
import { CitizenMarker } from './CitizenMarker';
import { GridCell } from './GridCell';

interface CityGridProps {
  config: CityConfig;
  neighborhoods: Neighborhood[]; // Still needed for CitizenMarker
  citizens: Map<string, Citizen>;
  cellSize?: number;
  onCellClick?: (x: number, y: number) => void;
}

export function CityGrid({ 
  config, 
  neighborhoods,
  citizens,
  cellSize = 60,
  onCellClick
}: CityGridProps) {
  const width = config.gridWidth * cellSize;
  const height = config.gridHeight * cellSize;
  
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
            
            return (
              <g 
                key={`${x}-${y}`}
                onClick={() => onCellClick?.(x, y)}
                style={{ cursor: onCellClick ? 'pointer' : 'default' }}
              >
                {/* Cell background */}
                <GridCell row={y} col={x} isWater={isWater} cellSize={cellSize} />
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

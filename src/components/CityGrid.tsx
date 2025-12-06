import type { CityConfig } from '../models';
import { GridCell } from './GridCell';

interface CityGridProps {
  config: CityConfig;
  cellSize?: number;
  onCellClick?: (x: number, y: number) => void;
}

export function CityGrid({ 
  config, 
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
      </svg>
    </div>
  );
}

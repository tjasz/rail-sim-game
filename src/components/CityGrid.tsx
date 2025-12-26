import type { CityConfig } from '../models';
import { GridCell } from './GridCell';

interface CityGridProps {
  config: CityConfig;
}

export function CityGrid({ config }: CityGridProps) {
  const cellSize = 1; // Each cell is 1 unit in Simple CRS
  
  return (
    <>
        {/* Draw grid cells */}
        {Array.from({ length: config.gridWidth }).map((_, x) =>
          Array.from({ length: config.gridHeight }).map((_, y) => {
            const isWater = config.tiles[x][y] === 'w';
            
            return (
              <g key={`${x}-${y}`}>
                {/* Cell background */}
                <GridCell row={config.gridHeight - y} col={x} isWater={isWater} cellSize={cellSize} />
              </g>
            );
          })
        )}
    </>
  );
}

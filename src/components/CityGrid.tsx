import type { TileType } from '../models';
import { GridCell } from './GridCell';

interface CityGridProps {
  gridWidth: number;
  gridHeight: number;
  tiles: TileType[][]; // [x][y] - 'l' for land or 'w' for water
}

export function CityGrid({ gridWidth, gridHeight, tiles }: CityGridProps) {
  const cellSize = 1; // Each cell is 1 unit in Simple CRS
  
  return (
    <>
        {/* Draw grid cells */}
        {Array.from({ length: gridWidth }).map((_, x) =>
          Array.from({ length: gridHeight }).map((_, y) => {
            const isWater = tiles[x][y] === 'w';
            
            return (
              <g key={`${x}-${y}`}>
                {/* Cell background */}
                <GridCell row={gridHeight - y} col={x} isWater={isWater} cellSize={cellSize} />
              </g>
            );
          })
        )}
    </>
  );
}

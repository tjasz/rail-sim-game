import { SVGOverlay } from 'react-leaflet';
import type { CityConfig } from '../models';
import { GridCell } from './GridCell';

interface CityGridProps {
  config: CityConfig;
}

export function CityGrid({ config }: CityGridProps) {
  const cellSize = 1; // Each cell is 1 unit in Simple CRS
  const width = config.gridWidth * cellSize;
  const height = config.gridHeight * cellSize;
  
  // Define bounds for the SVG overlay
  const bounds: [[number, number], [number, number]] = [
    [0, 0], // Southwest corner
    [config.gridHeight, config.gridWidth] // Northeast corner
  ];
  
  return (
    <SVGOverlay bounds={bounds} attributes={{ className: 'city-grid-overlay' }}>
      <svg 
        viewBox={`0 0 ${width} ${height}`}
        style={{ pointerEvents: 'none' }}
      >
        {/* Draw grid cells */}
        {Array.from({ length: config.gridWidth }).map((_, x) =>
          Array.from({ length: config.gridHeight }).map((_, y) => {
            const isWater = config.tiles[x][y] === 'w';
            
            return (
              <g key={`${x}-${y}`}>
                {/* Cell background */}
                <GridCell row={y} col={x} isWater={isWater} cellSize={cellSize} />
              </g>
            );
          })
        )}
      </svg>
    </SVGOverlay>
  );
}

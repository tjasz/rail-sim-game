import { SVGOverlay } from 'react-leaflet';
import type { CityConfig } from '../models';
import type { ReactNode } from 'react';

interface LeafletSvgOverlayProps {
  config: CityConfig;
  children: ReactNode;
}

export function LeafletSvgOverlay({ config, children }: LeafletSvgOverlayProps) {
  const cellSize = 1; // Each cell is 1 unit in Simple CRS
  const width = (config.gridWidth + 1) * cellSize;
  const height = (config.gridHeight + 1) * cellSize;
  
  // Define bounds for the SVG overlay
  const bounds: [[number, number], [number, number]] = [
    [-0.5, -0.5], // Southwest corner
    [config.gridHeight + 0.5, config.gridWidth + 0.5] // Northeast corner
  ];
  
  return (
    <SVGOverlay bounds={bounds} attributes={{ className: 'city-grid-overlay' }}>
      <svg 
        viewBox={`0 0 ${width} ${height}`}
        style={{ pointerEvents: 'none' }}
      >
        {children}
      </svg>
    </SVGOverlay>
  );
}

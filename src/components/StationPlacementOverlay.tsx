import type { Track, Station } from '../models';

interface StationPlacementOverlayProps {
  tracks: Map<string, Track>;
  stations: Map<string, Station>;
  gridWidth: number;
  gridHeight: number;
  cellSize?: number;
}

export function StationPlacementOverlay({ 
  tracks, 
  stations,
  gridWidth, 
  gridHeight, 
  cellSize = 60 
}: StationPlacementOverlayProps) {
  const width = gridWidth * cellSize;
  const height = gridHeight * cellSize;
  
  // Get all positions where stations already exist
  const stationPositions = new Set<string>();
  stations.forEach(station => {
    stationPositions.add(`${station.position.x},${station.position.y}`);
  });
  
  // Get all positions where tracks exist (valid for station placement)
  const validPositions = new Set<string>();
  tracks.forEach(track => {
    const fromKey = `${track.from.x},${track.from.y}`;
    const toKey = `${track.to.x},${track.to.y}`;
    
    if (!stationPositions.has(fromKey)) {
      validPositions.add(fromKey);
    }
    if (!stationPositions.has(toKey)) {
      validPositions.add(toKey);
    }
  });
  
  return (
    <svg 
      width={width} 
      height={height} 
      className="station-placement-overlay"
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {Array.from(validPositions).map(posKey => {
        const [x, y] = posKey.split(',').map(Number);
        const cx = x * cellSize + cellSize / 2;
        const cy = y * cellSize + cellSize / 2;
        
        return (
          <circle
            key={posKey}
            cx={cx}
            cy={cy}
            r={8}
            fill="#3498db"
            opacity={0.4}
            stroke="#2980b9"
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}

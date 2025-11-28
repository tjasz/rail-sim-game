import type { Track, Line } from '../models';

interface TrackOverlayProps {
  tracks: Map<string, Track>;
  lines: Map<string, Line>;
  gridWidth: number;
  gridHeight: number;
  cellSize?: number;
}

export function TrackOverlay({ tracks, lines, gridWidth, gridHeight, cellSize = 60 }: TrackOverlayProps) {
  const width = gridWidth * cellSize;
  const height = gridHeight * cellSize;
  
  // Create a map of line colors
  const lineColorMap = new Map<string, string>();
  lines.forEach((line, id) => {
    lineColorMap.set(id, line.color);
  });
  
  return (
    <svg 
      width={width} 
      height={height} 
      className="track-overlay"
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {Array.from(tracks.values()).map(track => {
        const x1 = track.from.x * cellSize + cellSize / 2;
        const y1 = track.from.y * cellSize + cellSize / 2;
        const x2 = track.to.x * cellSize + cellSize / 2;
        const y2 = track.to.y * cellSize + cellSize / 2;
        
        // If track has no lines, show as dashed gray
        if (track.lineIds.length === 0) {
          return (
            <line
              key={track.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#999"
              strokeWidth="3"
              strokeDasharray="5,5"
            />
          );
        }
        
        // Draw parallel lines for each line using this track
        return track.lineIds.map((lineId, idx) => {
          const offset = (idx - (track.lineIds.length - 1) / 2) * 4;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const perpAngle = angle + Math.PI / 2;
          const offsetX = Math.cos(perpAngle) * offset;
          const offsetY = Math.sin(perpAngle) * offset;
          
          return (
            <line
              key={`${track.id}-${lineId}`}
              x1={x1 + offsetX}
              y1={y1 + offsetY}
              x2={x2 + offsetX}
              y2={y2 + offsetY}
              stroke={lineColorMap.get(lineId) || '#000'}
              strokeWidth="3"
            />
          );
        });
      })}
    </svg>
  );
}

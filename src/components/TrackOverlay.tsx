import type { Track, Line, CityConfig } from '../models';

interface TrackOverlayProps {
  config: CityConfig;
  tracks: Map<string, Track>;
  lines: Map<string, Line>;
}

export function TrackOverlay({ config, tracks, lines }: TrackOverlayProps) {
  // Create a map of line colors
  const lineColorMap = new Map<string, string>();
  lines.forEach((line, id) => {
    lineColorMap.set(id, line.color);
  });
  
  return (
    <>
      {Array.from(tracks.values()).map(track => {
        // Track positions in grid coordinates [x, y]
        const fromPos: [number, number] = [track.from.x + 0.5, config.gridHeight - track.from.y + 0.5];
        const toPos: [number, number] = [track.to.x + 0.5, config.gridHeight - track.to.y + 0.5];
        
        // If track has no lines, show as dashed gray
        if (track.lineIds.length === 0) {
          return (
            <line
              key={track.id}
              x1={fromPos[0]}
              y1={fromPos[1]}
              x2={toPos[0]}
              y2={toPos[1]}
              stroke="#999"
              strokeWidth={0.06}
              strokeDasharray="0.1, 0.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        }
        
        // Draw parallel lines for each line using this track
        // Calculate offset positions for multiple lines on same track
        return track.lineIds.map((lineId, idx) => {
          const offset = (idx - (track.lineIds.length - 1) / 2) * 0.1; // Offset in grid units
          const dx = toPos[0] - fromPos[0]; // x difference
          const dy = toPos[1] - fromPos[1]; // y difference
          const length = Math.sqrt(dx * dx + dy * dy);
          
          // Perpendicular offset
          const perpX = (-dy / length) * offset;
          const perpY = (dx / length) * offset;
          
          const offsetFromPos: [number, number] = [fromPos[0] + perpX, fromPos[1] + perpY];
          const offsetToPos: [number, number] = [toPos[0] + perpX, toPos[1] + perpY];
          
          return (
            <line
              key={`${track.id}-${lineId}`}
              x1={offsetFromPos[0]}
              y1={offsetFromPos[1]}
              x2={offsetToPos[0]}
              y2={offsetToPos[1]}
              stroke={lineColorMap.get(lineId) || '#000'}
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

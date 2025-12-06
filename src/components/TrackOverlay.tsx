import { Polyline } from 'react-leaflet';
import type { Track, Line } from '../models';

interface TrackOverlayProps {
  tracks: Map<string, Track>;
  lines: Map<string, Line>;
}

export function TrackOverlay({ tracks, lines }: TrackOverlayProps) {
  // Create a map of line colors
  const lineColorMap = new Map<string, string>();
  lines.forEach((line, id) => {
    lineColorMap.set(id, line.color);
  });
  
  return (
    <>
      {Array.from(tracks.values()).map(track => {
        // In Simple CRS, coordinates are [y, x] (row, col)
        // Add 0.5 to center on the cell
        const fromPos: [number, number] = [track.from.y, track.from.x];
        const toPos: [number, number] = [track.to.y, track.to.x];
        const positions = [fromPos, toPos];
        
        // If track has no lines, show as dashed gray
        if (track.lineIds.length === 0) {
          return (
            <Polyline
              key={track.id}
              positions={positions}
              pathOptions={{
                color: '#999',
                weight: 3,
                dashArray: '5, 5',
                lineCap: 'round',
                lineJoin: 'round',
              }}
              interactive={false}
            />
          );
        }
        
        // Draw parallel lines for each line using this track
        // Calculate offset positions for multiple lines on same track
        return track.lineIds.map((lineId, idx) => {
          const offset = (idx - (track.lineIds.length - 1) / 2) * 0.1; // Offset in grid units
          const dx = toPos[1] - fromPos[1]; // x difference
          const dy = toPos[0] - fromPos[0]; // y difference
          const length = Math.sqrt(dx * dx + dy * dy);
          
          // Perpendicular offset
          const perpX = (-dy / length) * offset;
          const perpY = (dx / length) * offset;
          
          const offsetFromPos: [number, number] = [fromPos[0] + perpY, fromPos[1] + perpX];
          const offsetToPos: [number, number] = [toPos[0] + perpY, toPos[1] + perpX];
          const offsetPositions = [offsetFromPos, offsetToPos];
          
          return (
            <Polyline
              key={`${track.id}-${lineId}`}
              positions={offsetPositions}
              pathOptions={{
                color: lineColorMap.get(lineId) || '#000',
                weight: 3,
                lineCap: 'round',
                lineJoin: 'round',
              }}
              interactive={false}
            />
          );
        });
      })}
    </>
  );
}

import { Polyline, CircleMarker } from 'react-leaflet';

interface DraftTrackOverlayProps {
  points: { x: number; y: number }[];
}

export function DraftTrackOverlay({ points }: DraftTrackOverlayProps) {
  if (points.length === 0) {
    return null;
  }
  
  // Convert points to Leaflet coordinates [y, x] and center on cells
  const leafletPositions: [number, number][] = points.map(point => [
    point.y + 0.5,
    point.x + 0.5
  ]);
  
  return (
    <>
      {/* Draw polyline through all points */}
      {points.length > 1 && (
        <Polyline
          positions={leafletPositions}
          pathOptions={{
            color: '#666',
            weight: 3,
            dashArray: '5, 5',
            lineCap: 'round',
            lineJoin: 'round',
            opacity: 0.8,
          }}
          interactive={false}
        />
      )}
      
      {/* Draw circles at each point */}
      {leafletPositions.map((position, idx) => (
        <CircleMarker
          key={`point-${idx}`}
          center={position}
          radius={idx === 0 ? 6 : 4}
          pathOptions={{
            fillColor: '#666',
            fillOpacity: 0.8,
            color: '#666',
            weight: 0,
          }}
          interactive={false}
        />
      ))}
    </>
  );
}

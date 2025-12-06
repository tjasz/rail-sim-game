import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Track, Station } from '../models';

interface StationPlacementOverlayProps {
  tracks: Map<string, Track>;
  stations: Map<string, Station>;
}

export function StationPlacementOverlay({ 
  tracks, 
  stations
}: StationPlacementOverlayProps) {
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
  
  // Create custom HTML for the placement indicator
  const placementHtml = `
    <svg width="20" height="20" style="overflow: visible;">
      <circle
        cx="10"
        cy="10"
        r="8"
        fill="#3498db"
        opacity="0.4"
        stroke="#2980b9"
        stroke-width="2"
      />
    </svg>
  `;

  const icon = new DivIcon({
    html: placementHtml,
    className: 'station-placement-indicator',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  
  return (
    <>
      {Array.from(validPositions).map(posKey => {
        const [x, y] = posKey.split(',').map(Number);
        
        // In Simple CRS, coordinates are [y, x] (row, col)
        const position: [number, number] = [y, x];
        
        return (
          <Marker 
            key={posKey} 
            position={position} 
            icon={icon}
            // Disable interaction since these are display-only indicators
            interactive={true}
          />
        );
      })}
    </>
  );
}

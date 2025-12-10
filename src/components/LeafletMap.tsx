import type { ReactNode } from 'react';
import { MapContainer } from 'react-leaflet';
import { CRS, LatLngBounds } from 'leaflet';
import './LeafletMap.css';

interface LeafletMapProps {
  gridWidth: number;
  gridHeight: number;
  children: ReactNode;
}

export function LeafletMap({ gridWidth, gridHeight, children }: LeafletMapProps) {
  // Calculate bounds in simple CRS coordinates
  // In simple CRS, coordinates map directly to pixels
  const bounds = new LatLngBounds(
    [-0.5, -0.5], // Southwest corner
    [gridHeight - 0.5, gridWidth - 0.5] // Northeast corner
  );

  // Center of the map
  const center: [number, number] = [gridHeight / 2, gridWidth / 2];

  return (
    <div className="leaflet-map-wrapper">
      <MapContainer
        center={center}
        zoom={5}
        zoomSnap={0}
        minZoom={3}
        maxZoom={9}
        crs={CRS.Simple}
        style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
        maxBounds={bounds}
        maxBoundsViscosity={0.5}
        attributionControl={false}
      >
        {children}
      </MapContainer>
    </div>
  );
}

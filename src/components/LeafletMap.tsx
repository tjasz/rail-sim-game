import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import { CRS, LatLngBounds } from 'leaflet';
import './LeafletMap.css';

interface LeafletMapProps {
  gridWidth: number;
  gridHeight: number;
  fitBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null;
  children: ReactNode;
}

function BoundsUpdater({ fitBounds }: { fitBounds?: { minX: number; minY: number; maxX: number; maxY: number } | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (fitBounds) {
      const bounds = new LatLngBounds(
        [fitBounds.minY, fitBounds.minX],
        [fitBounds.maxY, fitBounds.maxX]
      );
      map.fitBounds(bounds, { animate: true, duration: 1 });
    }
  }, [map, fitBounds]);
  
  return null;
}

export function LeafletMap({ gridWidth, gridHeight, fitBounds, children }: LeafletMapProps) {
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
        doubleClickZoom={false}
      >
        <BoundsUpdater fitBounds={fitBounds} />
        {children}
      </MapContainer>
    </div>
  );
}

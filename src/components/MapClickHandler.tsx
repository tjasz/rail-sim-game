import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
  onMapClick?: (x: number, y: number) => void;
}

export function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        // In Simple CRS, latlng.lat is y and latlng.lng is x
        // Subtract 0.5 to get the cell coordinate (since cells are centered at 0.5, 1.5, etc.)
        const x = Math.floor(e.latlng.lng);
        const y = Math.floor(e.latlng.lat);
        onMapClick(x, y);
      }
    },
  });

  // This component doesn't render anything
  return null;
}

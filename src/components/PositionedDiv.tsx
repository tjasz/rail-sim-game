import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { LatLng } from 'leaflet';

interface PositionedDivProps {
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  children: ReactNode;
}

export function PositionedDiv({ position, dimensions, children }: PositionedDivProps) {
  const map = useMap();
  const [offset, setOffset] = useState<{ left: number; top: number; width: number; height: number }>(
    { left: 0, top: 0, width: 0, height: 0 }
  );

  useEffect(() => {
    const updatePosition = () => {
      // Convert grid coordinates to LatLng (in Simple CRS, y is lat, x is lng)
      const latLng = new LatLng(position.y, position.x);
      
      // Convert LatLng to pixel coordinates within the map container
      const point = map.latLngToContainerPoint(latLng);
      const { x: width, y: height } = map.latLngToContainerPoint(new LatLng(dimensions.height + position.y, dimensions.width + position.x));
      
      setOffset({
        left: point.x,
        top: point.y,
        width: width - point.x,
        height: point.y - height,
      });
    };

    // Update position initially
    updatePosition();

    // Update position when map moves or zooms
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
    };
  }, [map, position.x, position.y]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${offset.left}px`,
        top: `${offset.top}px`,
        width: `${offset.width}px`,
        height: `${offset.height}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto',
        zIndex: 600,
      }}
    >
      {children}
    </div>
  );
}

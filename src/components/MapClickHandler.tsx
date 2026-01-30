import { useMapEvents, useMap } from 'react-leaflet';
import { useRef, useEffect } from 'react';

interface MapClickHandlerProps {
  onMapClick?: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: () => void;
  isDraggingEnabled?: boolean;
}

export function MapClickHandler({ onMapClick, onDragMove, onDragEnd, isDraggingEnabled = false }: MapClickHandlerProps) {
  const isDraggingRef = useRef(false);
  const isTouchRef = useRef(false);
  const map = useMap();
  
  // Handle touch events
  useEffect(() => {
    if (!isDraggingEnabled || !onDragMove) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - enable dragging
        isTouchRef.current = true;
        isDraggingRef.current = true;
        
        const touch = e.touches[0];
        const point = map.containerPointToLatLng([touch.clientX, touch.clientY]);
        const x = Math.round(point.lng);
        const y = Math.round(point.lat);
        onDragMove(x, y);
      } else if (e.touches.length >= 2) {
        // Multi-touch - disable dragging (for pinch/zoom)
        isDraggingRef.current = false;
        isTouchRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length === 1) {
        const touch = e.touches[0];
        const point = map.containerPointToLatLng([touch.clientX, touch.clientY]);
        const x = Math.round(point.lng);
        const y = Math.round(point.lat);
        onDragMove(x, y);
      } else if (e.touches.length >= 2) {
        // Multi-touch detected during drag - stop dragging
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          onDragEnd?.();
        }
      }
    };

    const handleTouchEnd = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onDragEnd?.();
      }
      // Keep isTouchRef true briefly to prevent click event from firing
      setTimeout(() => {
        isTouchRef.current = false;
      }, 100);
    };

    const handleTouchCancel = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onDragEnd?.();
      }
      isTouchRef.current = false;
    };

    const container = map.getContainer();
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [map, isDraggingEnabled, onDragMove, onDragEnd]);
  
  useMapEvents({
    click: (e) => {
      console.log('MapClickHandler: click', e);
      if (onMapClick && !isTouchRef.current) {
        // In Simple CRS, latlng.lat is y and latlng.lng is x
        const x = Math.round(e.latlng.lng);
        const y = Math.round(e.latlng.lat);
        onMapClick(x, y);
      }
      isTouchRef.current = false;
    },
    mousedown: (e) => {
      if (isDraggingEnabled && onDragMove && !e.originalEvent.ctrlKey && !e.originalEvent.metaKey) {
        isDraggingRef.current = true;
        const x = Math.round(e.latlng.lng);
        const y = Math.round(e.latlng.lat);
        onDragMove(x, y);
      }
    },
    mousemove: (e) => {
      if (isDraggingRef.current && onDragMove) {
        const x = Math.round(e.latlng.lng);
        const y = Math.round(e.latlng.lat);
        onDragMove(x, y);
      }
    },
    mouseup: () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onDragEnd?.();
      }
    },
  });

  // This component doesn't render anything
  return null;
}

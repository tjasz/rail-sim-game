import { useState, useCallback } from 'react';
import type { Line, CityConfig, Neighborhood } from '../models';

interface TrackOverlayProps {
  config: CityConfig;
  neighborhoods: Neighborhood[];
  lines: Map<string, Line>;
  onInsertStation?: (lineId: string, insertAfterIndex: number, neighborhoodId: string) => void;
}

export function TrackOverlay({ config, neighborhoods, lines, onInsertStation }: TrackOverlayProps) {
  const [draggingSegment, setDraggingSegment] = useState<{ lineId: string; segmentIndex: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Create a map of neighborhoods for quick lookup
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  
  // Create a map of line colors
  const lineColorMap = new Map<string, string>();
  lines.forEach((line, id) => {
    lineColorMap.set(id, line.color);
  });

  const handleSegmentMouseDown = useCallback((e: React.MouseEvent, lineId: string, segmentIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSegment({ lineId, segmentIndex });
  }, []);

  const handleSegmentTouchStart = useCallback((e: React.TouchEvent, lineId: string, segmentIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSegment({ lineId, segmentIndex });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGGElement>) => {
    if (!draggingSegment) return;
    
    // Get the SVG element
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    
    // Get the SVG point for coordinate transformation
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    // Transform to SVG coordinates
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    setDragPosition({ x: svgP.x, y: svgP.y });
  }, [draggingSegment]);

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGGElement>) => {
    if (!draggingSegment || e.touches.length === 0) return;
    
    // Get the SVG element
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    
    // Get the SVG point for coordinate transformation
    const touch = e.touches[0];
    const pt = svg.createSVGPoint();
    pt.x = touch.clientX;
    pt.y = touch.clientY;
    
    // Transform to SVG coordinates
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    setDragPosition({ x: svgP.x, y: svgP.y });
  }, [draggingSegment]);

  const handleMouseUp = useCallback(() => {
    if (!draggingSegment || !dragPosition || !onInsertStation) {
      setDraggingSegment(null);
      setDragPosition(null);
      return;
    }

    // Find the neighborhood closest to the drag position
    let closestNeighborhood: Neighborhood | null = null;
    let minDistance = Infinity;

    neighborhoods.forEach(n => {
      // Convert neighborhood position to SVG coordinates
      const nx = n.position.x + 0.5;
      const ny = config.gridHeight - n.position.y + 0.5;
      const distance = Math.sqrt(Math.pow(nx - dragPosition.x, 2) + Math.pow(ny - dragPosition.y, 2));
      
      if (distance < minDistance) {
        minDistance = distance;
        closestNeighborhood = n;
      }
    });

    // Only insert if we're close enough to a neighborhood (within 1 grid unit)
    if (closestNeighborhood !== null && minDistance < 1.0) {
      const line = lines.get(draggingSegment.lineId);
      const neighborhood: Neighborhood = closestNeighborhood;
      // Check if neighborhood is not already on this line
      if (line && !line.neighborhoodIds.includes(neighborhood.id)) {
        onInsertStation(draggingSegment.lineId, draggingSegment.segmentIndex, neighborhood.id);
      }
    }

    setDraggingSegment(null);
    setDragPosition(null);
  }, [draggingSegment, dragPosition, onInsertStation, neighborhoods, config.gridHeight, lines]);

  const handleTouchEnd = useCallback(() => {
    if (!draggingSegment || !dragPosition || !onInsertStation) {
      setDraggingSegment(null);
      setDragPosition(null);
      return;
    }

    // Find the neighborhood closest to the drag position
    let closestNeighborhood: Neighborhood | null = null;
    let minDistance = Infinity;

    neighborhoods.forEach(n => {
      // Convert neighborhood position to SVG coordinates
      const nx = n.position.x + 0.5;
      const ny = config.gridHeight - n.position.y + 0.5;
      const distance = Math.sqrt(Math.pow(nx - dragPosition.x, 2) + Math.pow(ny - dragPosition.y, 2));
      
      if (distance < minDistance) {
        minDistance = distance;
        closestNeighborhood = n;
      }
    });

    // Only insert if we're close enough to a neighborhood (within 1 grid unit)
    if (closestNeighborhood !== null && minDistance < 1.0) {
      const line = lines.get(draggingSegment.lineId);
      const neighborhood: Neighborhood = closestNeighborhood;
      // Check if neighborhood is not already on this line
      if (line && !line.neighborhoodIds.includes(neighborhood.id)) {
        onInsertStation(draggingSegment.lineId, draggingSegment.segmentIndex, neighborhood.id);
      }
    }

    setDraggingSegment(null);
    setDragPosition(null);
  }, [draggingSegment, dragPosition, onInsertStation, neighborhoods, config.gridHeight, lines]);
  
  return (
    <g
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ pointerEvents: draggingSegment ? 'all' : 'none' } as any}
    >
      {Array.from(lines.values()).map(line => {
        // Draw lines between consecutive stations
        return line.neighborhoodIds.map((neighborhoodId, idx) => {
          if (idx === 0) return null; // Skip first station (no line before it)
          
          const fromNeighborhood = neighborhoodMap.get(line.neighborhoodIds[idx - 1]);
          const toNeighborhood = neighborhoodMap.get(neighborhoodId);
          
          if (!fromNeighborhood || !toNeighborhood) return null;
          
          // Station positions in grid coordinates [x, y]
          const fromPos: [number, number] = [fromNeighborhood.position.x + 0.5, config.gridHeight - fromNeighborhood.position.y + 0.5];
          const toPos: [number, number] = [toNeighborhood.position.x + 0.5, config.gridHeight - toNeighborhood.position.y + 0.5];
          
          const isDragging = draggingSegment?.lineId === line.id && draggingSegment?.segmentIndex === idx - 1;
          
          return (
            <g key={`${line.id}-${idx}`}>
              {/* Visible line */}
              <line
                x1={fromPos[0]}
                y1={fromPos[1]}
                x2={toPos[0]}
                y2={toPos[1]}
                stroke={line.color}
                strokeWidth={0.06}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ 
                  pointerEvents: 'none',
                  opacity: isDragging ? 0.5 : 1 
                }}
              />
              {/* Invisible wider line for easier interaction */}
              <line
                x1={fromPos[0]}
                y1={fromPos[1]}
                x2={toPos[0]}
                y2={toPos[1]}
                stroke="transparent"
                strokeWidth={0.3}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ 
                  pointerEvents: onInsertStation ? 'stroke' : 'none',
                  cursor: 'grab' 
                }}
                onMouseDown={(e) => handleSegmentMouseDown(e, line.id, idx - 1)}
                onTouchStart={(e) => handleSegmentTouchStart(e, line.id, idx - 1)}
              />
            </g>
          );
        });
      })}
      
      {/* Show drag indicator */}
      {draggingSegment && dragPosition && (
        <circle
          cx={dragPosition.x}
          cy={dragPosition.y}
          r={0.2}
          fill="white"
          stroke="#666"
          strokeWidth={0.04}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
}

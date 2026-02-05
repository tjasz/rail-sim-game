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
      {Array.from(lines.values()).map((line, lineIndex) => {
        if (line.neighborhoodIds.length === 0) return null;
        
        // Get first and last neighborhoods for T-markers
        const firstNeighborhood = neighborhoodMap.get(line.neighborhoodIds[0]);
        const lastNeighborhood = neighborhoodMap.get(line.neighborhoodIds[line.neighborhoodIds.length - 1]);
        
        if (!firstNeighborhood || !lastNeighborhood) return null;
        
        // Calculate positions
        const firstPosBase: [number, number] = [firstNeighborhood.position.x + 0.5, config.gridHeight - firstNeighborhood.position.y + 0.5];
        const lastPosBase: [number, number] = [lastNeighborhood.position.x + 0.5, config.gridHeight - lastNeighborhood.position.y + 0.5];
        
        // For start T-marker: direction from second station to first (or default if only one station)
        let startDx = 0, startDy = -1;
        if (line.neighborhoodIds.length > 1) {
          const secondNeighborhood = neighborhoodMap.get(line.neighborhoodIds[1]);
          if (secondNeighborhood) {
            const secondPos: [number, number] = [secondNeighborhood.position.x + 0.5, config.gridHeight - secondNeighborhood.position.y + 0.5];
            startDx = firstPosBase[0] - secondPos[0];
            startDy = firstPosBase[1] - secondPos[1];
            const startLength = Math.sqrt(startDx * startDx + startDy * startDy);
            if (startLength > 0) {
              startDx /= startLength;
              startDy /= startLength;
            }
          }
        }
        
        // For end T-marker: direction from second-to-last to last (or default if only one station)
        let endDx = 0, endDy = 1;
        if (line.neighborhoodIds.length > 1) {
          const secondLastNeighborhood = neighborhoodMap.get(line.neighborhoodIds[line.neighborhoodIds.length - 2]);
          if (secondLastNeighborhood) {
            const secondLastPos: [number, number] = [secondLastNeighborhood.position.x + 0.5, config.gridHeight - secondLastNeighborhood.position.y + 0.5];
            endDx = lastPosBase[0] - secondLastPos[0];
            endDy = lastPosBase[1] - secondLastPos[1];
            const endLength = Math.sqrt(endDx * endDx + endDy * endDy);
            if (endLength > 0) {
              endDx /= endLength;
              endDy /= endLength;
            }
          }
        }
        
        // Calculate perpendicular for T-bar (90 degree rotation)
        const startPerpX = -startDy;
        const startPerpY = startDx;
        const endPerpX = -endDy;
        const endPerpY = endDx;
        
        // Offset for parallel lines
        const offsetAmount = (lineIndex - (lines.size - 1) / 2) * 0.08;
        const startPerpOffsetX = (line.neighborhoodIds.length > 1 ? -startDy : 1) * offsetAmount;
        const startPerpOffsetY = (line.neighborhoodIds.length > 1 ? startDx : 0) * offsetAmount;
        const endPerpOffsetX = (line.neighborhoodIds.length > 1 ? -endDy : 1) * offsetAmount;
        const endPerpOffsetY = (line.neighborhoodIds.length > 1 ? endDx : 0) * offsetAmount;
        
        // Start T-marker position (extend 0.25 units beyond first station)
        const startTCenter: [number, number] = [
          firstPosBase[0] + startDx * 0.33 + startPerpOffsetX,
          firstPosBase[1] + startDy * 0.33 + startPerpOffsetY
        ];
        
        // End T-marker position (extend 0.25 units beyond last station)
        const endTCenter: [number, number] = [
          lastPosBase[0] + endDx * 0.33 + endPerpOffsetX,
          lastPosBase[1] + endDy * 0.33 + endPerpOffsetY
        ];
        
        const isStartDragging = draggingSegment?.lineId === line.id && draggingSegment?.segmentIndex === -1;
        const isEndDragging = draggingSegment?.lineId === line.id && draggingSegment?.segmentIndex === line.neighborhoodIds.length - 1;
        
        return (
          <g key={`line-${line.id}`}>
            {/* Start T-marker (insert before index 0) */}
            <g key={`${line.id}-start-t`}>
              {/* Stem of T */}
              <line
                x1={firstPosBase[0] + startPerpOffsetX}
                y1={firstPosBase[1] + startPerpOffsetY}
                x2={startTCenter[0]}
                y2={startTCenter[1]}
                stroke={line.color}
                strokeWidth={0.06}
                strokeLinecap="round"
                style={{ 
                  pointerEvents: 'none',
                  opacity: isStartDragging ? 0.5 : 1 
                }}
              />
              {/* Bar of T */}
              <line
                x1={startTCenter[0] - startPerpX * 0.15}
                y1={startTCenter[1] - startPerpY * 0.15}
                x2={startTCenter[0] + startPerpX * 0.15}
                y2={startTCenter[1] + startPerpY * 0.15}
                stroke={line.color}
                strokeWidth={0.06}
                strokeLinecap="round"
                style={{ 
                  pointerEvents: 'none',
                  opacity: isStartDragging ? 0.5 : 1 
                }}
              />
              {/* Invisible wider area for interaction */}
              <circle
                cx={startTCenter[0]}
                cy={startTCenter[1]}
                r={0.2}
                fill="transparent"
                style={{ 
                  pointerEvents: onInsertStation ? 'all' : 'none',
                  cursor: 'grab' 
                }}
                onMouseDown={(e) => handleSegmentMouseDown(e, line.id, -1)}
                onTouchStart={(e) => handleSegmentTouchStart(e, line.id, -1)}
              />
            </g>
            
            {/* Line segments between stations */}
            {line.neighborhoodIds.map((neighborhoodId, idx) => {
              if (idx === 0) return null;
              
              const fromNeighborhood = neighborhoodMap.get(line.neighborhoodIds[idx - 1]);
              const toNeighborhood = neighborhoodMap.get(neighborhoodId);
              
              if (!fromNeighborhood || !toNeighborhood) return null;
              
              const fromPosBase: [number, number] = [fromNeighborhood.position.x + 0.5, config.gridHeight - fromNeighborhood.position.y + 0.5];
              const toPosBase: [number, number] = [toNeighborhood.position.x + 0.5, config.gridHeight - toNeighborhood.position.y + 0.5];
              
              const dx = toPosBase[0] - fromPosBase[0];
              const dy = toPosBase[1] - fromPosBase[1];
              const length = Math.sqrt(dx * dx + dy * dy);
              
              const perpX = length > 0 ? -dy / length : 0;
              const perpY = length > 0 ? dx / length : 0;
              
              const fromPos: [number, number] = [
                fromPosBase[0] + perpX * offsetAmount,
                fromPosBase[1] + perpY * offsetAmount
              ];
              const toPos: [number, number] = [
                toPosBase[0] + perpX * offsetAmount,
                toPosBase[1] + perpY * offsetAmount
              ];
              
              const isDragging = draggingSegment?.lineId === line.id && draggingSegment?.segmentIndex === idx - 1;
              
              return (
                <g key={`${line.id}-${idx}`}>
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
            })}
            
            {/* End T-marker (insert after last index) */}
            <g key={`${line.id}-end-t`}>
              {/* Stem of T */}
              <line
                x1={lastPosBase[0] + endPerpOffsetX}
                y1={lastPosBase[1] + endPerpOffsetY}
                x2={endTCenter[0]}
                y2={endTCenter[1]}
                stroke={line.color}
                strokeWidth={0.06}
                strokeLinecap="round"
                style={{ 
                  pointerEvents: 'none',
                  opacity: isEndDragging ? 0.5 : 1 
                }}
              />
              {/* Bar of T */}
              <line
                x1={endTCenter[0] - endPerpX * 0.15}
                y1={endTCenter[1] - endPerpY * 0.15}
                x2={endTCenter[0] + endPerpX * 0.15}
                y2={endTCenter[1] + endPerpY * 0.15}
                stroke={line.color}
                strokeWidth={0.06}
                strokeLinecap="round"
                style={{ 
                  pointerEvents: 'none',
                  opacity: isEndDragging ? 0.5 : 1 
                }}
              />
              {/* Invisible wider area for interaction */}
              <circle
                cx={endTCenter[0]}
                cy={endTCenter[1]}
                r={0.2}
                fill="transparent"
                style={{ 
                  pointerEvents: onInsertStation ? 'all' : 'none',
                  cursor: 'grab' 
                }}
                onMouseDown={(e) => handleSegmentMouseDown(e, line.id, line.neighborhoodIds.length - 1)}
                onTouchStart={(e) => handleSegmentTouchStart(e, line.id, line.neighborhoodIds.length - 1)}
              />
            </g>
          </g>
        );
      })}
      
      {/* Show drag indicator */}
      {draggingSegment && dragPosition && (() => {
        const draggedLine = lines.get(draggingSegment.lineId);
        const lineColor = draggedLine?.color || '#666';
        return (
          <circle
            cx={dragPosition.x}
            cy={dragPosition.y}
            r={0.2}
            fill="white"
            stroke={lineColor}
            strokeWidth={0.04}
            style={{ pointerEvents: 'none' }}
          />
        );
      })()}
    </g>
  );
}

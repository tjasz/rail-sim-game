import { useState, useCallback, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { Train, Line, Citizen, Neighborhood, CityConfig } from '../models';
import { renderCitizenIcon } from './CitizenMarkers';
import { PositionedDiv } from './PositionedDiv';

const RIDER_SIZE = [0.15, 0.15]; // [width, height] in grid units
const RIDER_MARGIN = 0.02; // margin between riders in grid units
const DROP_DISTANCE_THRESHOLD = 2; // max grid units from a line to count as a drop target

/** Minimum distance from point (px,py) to line segment (ax,ay)-(bx,by) */
function pointToSegmentDistance(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

interface DragState {
  trainId: string;
  offsetX: number;
  offsetY: number;
  targetLineId: string | null;
}

interface TrainMarkersProps {
  config: CityConfig;
  trains: Map<string, Train>;
  lines: Map<string, Line>;
  citizens: Map<string, Citizen>;
  neighborhoods: Map<string, Neighborhood>;
  onReassignTrain?: (trainId: string, lineId: string) => void;
}

export function TrainMarkers({ trains, lines, citizens, neighborhoods, onReassignTrain }: TrainMarkersProps) {
  const map = useMap();
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStartRef = useRef<{ trainId: string; startX: number; startY: number } | null>(null);

  /** Convert client (screen) coordinates to grid coordinates via Leaflet */
  const clientToGrid = useCallback((clientX: number, clientY: number) => {
    const rect = map.getContainer().getBoundingClientRect();
    const latLng = map.containerPointToLatLng([clientX - rect.left, clientY - rect.top]);
    return { x: latLng.lng, y: latLng.lat };
  }, [map]);

  /** Find the nearest line (by track segments) to a grid position, excluding a given line */
  const findNearestLine = useCallback(
    (gridX: number, gridY: number, excludeLineId?: string): string | null => {
      let bestId: string | null = null;
      let bestDist = Infinity;

      lines.forEach((line, lineId) => {
        if (lineId === excludeLineId) return;
        if (line.neighborhoodIds.length < 2) return;

        for (let i = 0; i < line.neighborhoodIds.length - 1; i++) {
          const n1 = neighborhoods.get(line.neighborhoodIds[i]);
          const n2 = neighborhoods.get(line.neighborhoodIds[i + 1]);
          if (!n1 || !n2) continue;

          const d = pointToSegmentDistance(
            gridX, gridY,
            n1.position.x, n1.position.y,
            n2.position.x, n2.position.y,
          );
          if (d < bestDist) {
            bestDist = d;
            bestId = lineId;
          }
        }
      });

      return bestDist < DROP_DISTANCE_THRESHOLD ? bestId : null;
    },
    [lines, neighborhoods],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent, trainId: string) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = { trainId, startX: e.clientX, startY: e.clientY };
    setDragState({ trainId, offsetX: 0, offsetY: 0, targetLineId: null });
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;

    const offsetX = e.clientX - start.startX;
    const offsetY = e.clientY - start.startY;
    const grid = clientToGrid(e.clientX, e.clientY);
    const train = trains.get(start.trainId);
    const exclude = train && train.lineId !== 'unassigned' ? train.lineId : undefined;

    setDragState({
      trainId: start.trainId,
      offsetX,
      offsetY,
      targetLineId: findNearestLine(grid.x, grid.y, exclude),
    });
  }, [clientToGrid, trains, findNearestLine]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;

    const grid = clientToGrid(e.clientX, e.clientY);
    const train = trains.get(start.trainId);
    const exclude = train && train.lineId !== 'unassigned' ? train.lineId : undefined;
    const targetLineId = findNearestLine(grid.x, grid.y, exclude);

    if (targetLineId && onReassignTrain) {
      onReassignTrain(start.trainId, targetLineId);
    }

    dragStartRef.current = null;
    setDragState(null);
  }, [clientToGrid, trains, findNearestLine, onReassignTrain]);

  return (
    <>
      {Array.from(trains.values()).map(train => {
        const riderCols = (train.capacity % 2 === 0 && train.capacity > 3) ? 2 : 1; // if capacity is odd, use 1 column to avoid empty space
        const width = RIDER_SIZE[0] * riderCols + (riderCols + 1) * RIDER_MARGIN;
        const rider_rows = Math.ceil(train.capacity / riderCols);
        const height = RIDER_SIZE[1] * rider_rows + (rider_rows + 1) * RIDER_MARGIN;

        const line = lines.get(train.lineId);
        if (!line || !line.isActive) return null;
        
        // Get rotation angle (default to 0 if heading is not set)
        const rotation = train.heading ?? 0;

        const isDragging = dragState?.trainId === train.id;
        const targetLine = isDragging && dragState.targetLineId
          ? lines.get(dragState.targetLineId)
          : null;
        
        return (
          <PositionedDiv
            key={train.id}
            position={{ x: train.position.x, y: train.position.y }}
            dimensions={{ width, height }}
          >
            <div
              onPointerDown={(e) => handlePointerDown(e, train.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                width: '100%',
                height: '100%',
                cursor: isDragging ? 'grabbing' : 'grab',
                transform: isDragging
                  ? `translate(${dragState.offsetX}px, ${dragState.offsetY}px)`
                  : undefined,
                opacity: isDragging ? 0.85 : 1,
                zIndex: isDragging ? 1000 : undefined,
                touchAction: 'none',
                willChange: isDragging ? 'transform' : undefined,
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox={`${-width/2} ${-height/2} ${width} ${height}`}
                style={{ 
                  transform: `rotate(${90-rotation}deg)`,
                  overflow: 'visible'
                }}
              >
                {/* Highlight outline showing target line */}
                {targetLine && (
                  <rect
                    x={-width / 2 - 0.03}
                    y={-height / 2 - 0.03}
                    width={width + 0.06}
                    height={height + 0.06}
                    rx={0.03}
                    fill="none"
                    stroke={targetLine.color}
                    strokeWidth={0.03}
                    strokeDasharray="0.05 0.03"
                  />
                )}
                {/* Train body — previews target line color while dragging */}
                <path
                  d={`M ${-width/2} ${-height/2 + 0.04} L 0 ${-height/2} L ${width/2} ${-height/2 + 0.04} L ${width/2} ${height/2} L ${-width/2} ${height/2} Z`}
                  fill={targetLine ? targetLine.color : line.color}
                  stroke="none"
                  strokeWidth={0}
                />
                {/* Passengers */}
                {train.passengerIds.map((passengerId, idx) => {
                  const row = Math.floor(idx / riderCols);
                  const col = idx % riderCols;
                  const x = -width/2 + RIDER_MARGIN + col * (RIDER_SIZE[0] + RIDER_MARGIN);
                  const y = -height/2 + RIDER_MARGIN + row * (RIDER_SIZE[1] + RIDER_MARGIN);
                  const citizen = citizens.get(passengerId);
                  if (!citizen) return null;
                  return (
                    <g key={passengerId}>
                      {renderCitizenIcon([x, y], RIDER_SIZE[0], citizen, neighborhoods)}
                    </g>
                  );
                })}
              </svg>
            </div>
          </PositionedDiv>
        );
      })}
    </>
  );
}

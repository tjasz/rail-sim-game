import { useSelection } from '../contexts/SelectionContext';
import type { Line, Station } from '../models';

const STATION_MARKER_RADIUS = 10; // in pixels

interface StationMarkerProps {
  row: number;
  col: number;
  station: Station;
  lines: Map<string, Line>;
  cellSize: number;
  onStationClick?: (stationId: string) => void;
}

export function StationMarker({ row, col, station, lines, cellSize, onStationClick }: StationMarkerProps) {
  const { setSelectedObject } = useSelection();

  const waitingPassengersCount = Array.from(station.waitingCitizens.values()).reduce((sum, list) => sum + list.length, 0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent cell click from firing
    
    // If there's a station click handler, use it (for assignment modal)
    if (onStationClick) {
      onStationClick(station.id);
    } else {
      // Otherwise use the selection context (for inspector)
      setSelectedObject(station);
    }
  };

  return (
  <g
    onClick={handleClick}
    onContextMenu={(e) => { e.preventDefault(); console.log(station); }}
  >
    {station.lineIds.map((lineId, idx) => (
      <circle
        key={lineId}
        cx={col * cellSize + cellSize / 2}
        cy={row * cellSize + cellSize / 2}
        r={STATION_MARKER_RADIUS + idx * 2}
        fill="#6668"
        stroke={lines.get(lineId)?.color || '#888'}
        strokeWidth="2"
      />
    ))}
    {station.lineIds.length === 0 && (
      <circle
        cx={col * cellSize + cellSize / 2}
        cy={row * cellSize + cellSize / 2}
        r={STATION_MARKER_RADIUS}
        fill="#6668"
        stroke="#888"
        strokeWidth="2"
        strokeDasharray="4,4"
      />
    )}

    {/* Waiting passenger count badge */}
    {station && waitingPassengersCount > 0 && (
      <g>
        <circle
          cx={col * cellSize + cellSize - 12}
          cy={row * cellSize + 12}
          r="10"
          fill="#ff6b6b"
          stroke="#fff"
          strokeWidth="1"
        />
        <text
          x={col * cellSize + cellSize - 12}
          y={row * cellSize + 16}
          textAnchor="middle"
          fontSize="10"
          fill="#fff"
          fontWeight="bold"
        >
          {waitingPassengersCount}
        </text>
      </g>
    )}
  </g>
  );
}

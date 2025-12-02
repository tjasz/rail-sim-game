import { useSelection } from '../contexts/SelectionContext';
import type { Line, Station } from '../models';

const STATION_MARKER_RADIUS = 10; // in pixels

interface StationMarkerProps {
  row: number;
  col: number;
  station: Station;
  lines: Map<string, Line>;
  cellSize: number;
}

export function StationMarker({ row, col, station, lines, cellSize }: StationMarkerProps) {
  const { setSelectedObject } = useSelection();

  const waitingPassengersCount = Array.from(station.waitingCitizens.values()).reduce((sum, list) => sum + list.length, 0);

  const handleClick = () => {
    setSelectedObject(station);
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
        fill="none"
        stroke={lines.get(lineId)?.color || '#888'}
        strokeWidth="2"
      />
    ))}

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

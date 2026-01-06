
import type { Citizen, Line, Neighborhood } from '../models';
import { useSelection } from '../contexts/SelectionContext';
import { iconPaths } from '../iconPaths';
import { renderCitizenIcon } from './CitizenMarkers';

const NEIGHBORHOOD_ICON_SIZE = 0.5; // in pixels
const RIDER_SIZE = [0.2, 0.2]; // [width, height] in pixels
const RIDER_COLS = 5;
const RIDER_MARGIN = 0;

interface NeighborhoodMarkerProps {
  row: number;
  col: number;
  neighborhood: Neighborhood;
  neighborhoodIndex: number;
  activeNeighborhoodCount: number;
  cellSize: number;
  stationCrowdingTimeLimit: number;
  lines: Map<string, Line>;
  neighborhoods: Map<string, Neighborhood>;
  citizens: Map<string, Citizen>;
}

export function NeighborhoodMarker({ 
  row, 
  col, 
  neighborhood, 
  neighborhoodIndex,
  activeNeighborhoodCount,
  cellSize,
  stationCrowdingTimeLimit,
  lines,
  neighborhoods,
  citizens,
}: NeighborhoodMarkerProps) {
  const { setSelectedObject } = useSelection();
  
  const handleClick = () => {
    setSelectedObject(neighborhood);
  };

  const waitingPassengers = Array.from((neighborhood.waitingCitizens ?? new Map()).values()).reduce(
    (sum, list) => [...sum, ...list], 
    []
  );

  // Calculate opacity based on activation status
  // Active neighborhoods: opacity 1
  // Next neighborhood: opacity 0.5
  // 2nd next: opacity 0.25
  // 3rd next: opacity 0.125, etc.
  let opacity = 1;
  if (neighborhoodIndex >= activeNeighborhoodCount) {
    const stepsFromActive = neighborhoodIndex - activeNeighborhoodCount + 1;
    opacity = Math.pow(0.5, stepsFromActive);
  }

  const crowdingTime = neighborhood.crowdingTime || 0;
  const crowdingRatio = Math.min(crowdingTime / stationCrowdingTimeLimit, 1);

  // Calculate gradient offset (0% = top, 100% = bottom)
  // When crowdingRatio = 0, transition is at 100% (no fill)
  // When crowdingRatio = 1, transition is at 0% (full fill)
  const transitionPoint = (1 - crowdingRatio) * 100;

  const lineIds = neighborhood.lineIds ?? [];

  const center = [(col + 0.5) * cellSize, (row + 0.5) * cellSize];

  return (
  <g
    onClick={handleClick}
    onContextMenu={(e) => { e.preventDefault(); console.log(neighborhood); }}
  >
    <path
      transform={`translate(${center[0] - NEIGHBORHOOD_ICON_SIZE / 2}, ${center[1] - NEIGHBORHOOD_ICON_SIZE / 2}) scale(${NEIGHBORHOOD_ICON_SIZE / 15})`}
      fill={neighborhood.color}
      opacity={opacity}
      d={iconPaths[neighborhood.icon] ?? neighborhood.icon}
    >
      {crowdingTime > 0 && (
        <animateMotion
          dur="1s"
          repeatCount="indefinite"
          path="m0 0 h-0.025 h.075 h-0.15 h0.2 h-0.2 h0.2 h-0.2 h0.15 h-0.075 z" />
      )}
    </path>
    {crowdingTime > 0 && <defs>
      <linearGradient id={`crowding-gradient-${neighborhood.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#6662', stopOpacity: 1 }} />
        <stop offset={`${transitionPoint}%`} style={{ stopColor: '#6662', stopOpacity: 1 }} />
        <stop offset={`${transitionPoint}%`} style={{ stopColor: '#666c', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: '#666c', stopOpacity: 1 }} />
      </linearGradient>
    </defs>}
    {neighborhoodIndex < activeNeighborhoodCount && lineIds.length === 0
      ? <circle
        cx={center[0]}
        cy={center[1]}
        r={NEIGHBORHOOD_ICON_SIZE / 2 + 0.05}
        fill={crowdingTime > 0 ? `url(#crowding-gradient-${neighborhood.id})` : '#6662'}
        stroke="#000"
        strokeWidth={0.05}
        strokeDasharray="0.04, 0.04"
        opacity={opacity}
      />
      : lineIds.map((lineId: string, idx: number) => {
        const lineColor = lines.get(lineId)?.color || '#888';
        const fillValue = idx > 0 ? 'none' : crowdingTime > 0 ? `url(#crowding-gradient-${neighborhood.id})` : '#6662';
        return <circle
          key={lineId}
          cx={center[0]}
          cy={center[1]}
          r={NEIGHBORHOOD_ICON_SIZE / 2 + (idx + 1) * 0.05}
          fill={fillValue}
          stroke={lineColor}
          strokeWidth={0.05}
          opacity={opacity}
        />
      })
    }
    {waitingPassengers.map((citizenId: string, idx: number) => {
      const row = Math.floor(idx / RIDER_COLS);
      const col = idx % RIDER_COLS - (RIDER_COLS/2);
      const x = center[0] + RIDER_MARGIN + col * (RIDER_SIZE[0] + RIDER_MARGIN);
      const y = center[1] + NEIGHBORHOOD_ICON_SIZE / 2 + RIDER_MARGIN + row * (RIDER_SIZE[1] + RIDER_MARGIN);
      return renderCitizenIcon([x,y], RIDER_SIZE[0], citizens.get(citizenId)!, neighborhoods);
    })}
  </g>)
}

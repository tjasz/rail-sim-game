
import type { Line, Neighborhood } from '../models';
import { useSelection } from '../contexts/SelectionContext';
import { iconPaths } from '../iconPaths';

const NEIGHBORHOOD_ICON_SIZE = 0.5; // in pixels

interface NeighborhoodMarkerProps {
  row: number;
  col: number;
  neighborhood: Neighborhood;
  neighborhoodIndex: number;
  activeNeighborhoodCount: number;
  cellSize: number;
  stationCrowdingTimeLimit: number;
  lines: Map<string, Line>;
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
}: NeighborhoodMarkerProps) {
  const { setSelectedObject } = useSelection();
  
  const handleClick = () => {
    setSelectedObject(neighborhood);
  };

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

  return (
  <g
    onClick={handleClick}
    onContextMenu={(e) => { e.preventDefault(); console.log(neighborhood); }}
  >
    <path
      transform={`translate(${(col+0.5) * cellSize - NEIGHBORHOOD_ICON_SIZE / 2}, ${(row+0.5) * cellSize - NEIGHBORHOOD_ICON_SIZE / 2}) scale(${NEIGHBORHOOD_ICON_SIZE / 15})`}
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
      cx={(col+0.5) * cellSize}
      cy={(row+0.5) * cellSize}
      r={NEIGHBORHOOD_ICON_SIZE / 2}
      fill={crowdingTime > 0 ? `url(#crowding-gradient-${neighborhood.id})` : '#6662'}
      stroke="#000"
      strokeWidth={0.02}
      strokeDasharray="0.04, 0.04"
      opacity={opacity}
    />
    : lineIds.map((lineId: string, idx: number) => {
      const lineColor = lines.get(lineId)?.color || '#888';
      const fillValue = idx > 0 ? 'none' : crowdingTime > 0 ? `url(#crowding-gradient-${neighborhood.id})` : '#6662';
      return <circle
        key={lineId}
        cx={(col+0.5) * cellSize}
        cy={(row+0.5) * cellSize}
        r={NEIGHBORHOOD_ICON_SIZE / 2 + idx * 0.05}
        fill={fillValue}
        stroke={lineColor}
        strokeWidth={0.02}
        opacity={opacity}
      />
    })
    }
  </g>)
}

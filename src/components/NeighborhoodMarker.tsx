
import type { Neighborhood } from '../models';
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
}

export function NeighborhoodMarker({ 
  row, 
  col, 
  neighborhood, 
  neighborhoodIndex,
  activeNeighborhoodCount,
  cellSize 
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
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="translate"
          by="1 0"
          dur="2s"
          repeatCount="indefinite" />
      )}
    </path>
  </g>)
}


import type { Neighborhood } from '../models';
import { useSelection } from '../contexts/SelectionContext';
import { iconPaths } from '../iconPaths';

const NEIGHBORHOOD_ICON_SIZE = 20; // in pixels

interface NeighborhoodMarkerProps {
  row: number;
  col: number;
  neighborhood: Neighborhood;
  cellSize: number;
}

export function NeighborhoodMarker({ row, col, neighborhood, cellSize }: NeighborhoodMarkerProps) {
  const { setSelectedObject } = useSelection();
  
  const handleClick = () => {
    setSelectedObject(neighborhood);
  };

  return (
  <g
    onClick={handleClick}
    onContextMenu={(e) => { e.preventDefault(); console.log(neighborhood); }}
  >
    <path
      transform={`translate(${(col+0.5) * cellSize - NEIGHBORHOOD_ICON_SIZE / 2}, ${(row+0.5) * cellSize - NEIGHBORHOOD_ICON_SIZE / 2}) scale(${NEIGHBORHOOD_ICON_SIZE / 15})`}
      fill={neighborhood.color}
      opacity="1"
      d={iconPaths[neighborhood.icon]}
      />
    <text
      x={col * cellSize + cellSize / 2}
      y={(row+1) * cellSize - 5}
      textAnchor="middle"
      fontSize="6"
      fill="#000"
      fontWeight="bold"
    >
      {neighborhood.name}
    </text>
  </g>)
}

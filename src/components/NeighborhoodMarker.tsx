
import type { Neighborhood } from '../models';
import { useSelection } from '../contexts/SelectionContext';
import { iconPaths } from '../iconPaths';

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
  <g>
    <path
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); console.log(neighborhood); }}
      transform={`translate(${col * cellSize}, ${row * cellSize}) scale(${cellSize / 15})`}
      fill={neighborhood.color}
      opacity="0.4"
      d={iconPaths[neighborhood.icon]}
      />
    <text
      x={col * cellSize + cellSize / 2}
      y={(row+1) * cellSize - 5}
      textAnchor="middle"
      fontSize="10"
      fill="#000"
      fontWeight="bold"
    >
      {neighborhood.name}
    </text>
  </g>)
}

import { useSelection } from '../contexts/SelectionContext';

interface GridCellProps {
  row: number;
  col: number;
  isWater: boolean;
  cellSize: number;

}

export function GridCell({ row, col, isWater, cellSize }: GridCellProps) {
  const { setSelectedObject } = useSelection();
  
  const handleClick = () => {
    setSelectedObject({ row, col, isWater });
  };

  return (<rect
            onClick={handleClick}
            onContextMenu={(e) => { e.preventDefault(); console.log({ row, col, isWater }); }}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill={isWater ? 'paleturquoise' : 'linen'}
            stroke="none"
            strokeWidth="0"
          />)
}

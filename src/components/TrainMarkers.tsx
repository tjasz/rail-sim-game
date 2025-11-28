import type { Train, Line } from '../models';

interface TrainMarkersProps {
  trains: Map<string, Train>;
  lines: Map<string, Line>;
  gridWidth: number;
  gridHeight: number;
  cellSize?: number;
}

export function TrainMarkers({ 
  trains, 
  lines, 
  gridWidth, 
  gridHeight, 
  cellSize = 60 
}: TrainMarkersProps) {
  const width = gridWidth * cellSize;
  const height = gridHeight * cellSize;
  
  return (
    <svg 
      width={width} 
      height={height} 
      className="train-markers"
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {Array.from(trains.values()).map(train => {
        const line = lines.get(train.lineId);
        if (!line || !line.isActive) return null;
        
        // Use train's current position
        const x = train.position.x * cellSize + cellSize / 2;
        const y = train.position.y * cellSize + cellSize / 2;
        
        return (
          <g key={train.id}>
            {/* Train body */}
            <rect
              x={x - 8}
              y={y - 6}
              width={16}
              height={12}
              fill={line.color}
              stroke="#000"
              strokeWidth="1.5"
              rx="2"
            />
            {/* Train window */}
            <rect
              x={x - 5}
              y={y - 3}
              width={10}
              height={6}
              fill="rgba(255, 255, 255, 0.5)"
              rx="1"
            />
            {/* Direction indicator */}
            <polygon
              points={
                train.direction === 'forward'
                  ? `${x + 8},${y} ${x + 12},${y - 4} ${x + 12},${y + 4}`
                  : `${x - 8},${y} ${x - 12},${y - 4} ${x - 12},${y + 4}`
              }
              fill="#fff"
            />
            {/* Passenger count badge */}
            {train.passengerIds.length > 0 && (
              <>
                <circle
                  cx={x + 8}
                  cy={y - 8}
                  r="6"
                  fill="#ff6b6b"
                  stroke="#fff"
                  strokeWidth="1"
                />
                <text
                  x={x + 8}
                  y={y - 6}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#fff"
                  fontWeight="bold"
                >
                  {train.passengerIds.length}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

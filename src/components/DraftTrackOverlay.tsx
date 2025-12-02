interface DraftTrackOverlayProps {
  points: { x: number; y: number }[];
  gridWidth: number;
  gridHeight: number;
  cellSize?: number;
}

export function DraftTrackOverlay({ 
  points, 
  gridWidth, 
  gridHeight, 
  cellSize = 60 
}: DraftTrackOverlayProps) {
  const width = gridWidth * cellSize;
  const height = gridHeight * cellSize;
  
  if (points.length === 0) {
    return null;
  }
  
  return (
    <svg 
      width={width} 
      height={height} 
      className="draft-track-overlay"
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {/* Draw lines between consecutive points */}
      {points.map((point, idx) => {
        if (idx === 0) {
          // Draw a circle for the first point
          return (
            <circle
              key={`start-${idx}`}
              cx={point.x * cellSize + cellSize / 2}
              cy={point.y * cellSize + cellSize / 2}
              r={6}
              fill="#666"
              opacity={0.8}
            />
          );
        }
        
        const prevPoint = points[idx - 1];
        const x1 = prevPoint.x * cellSize + cellSize / 2;
        const y1 = prevPoint.y * cellSize + cellSize / 2;
        const x2 = point.x * cellSize + cellSize / 2;
        const y2 = point.y * cellSize + cellSize / 2;
        
        return (
          <g key={`segment-${idx}`}>
            {/* Draft track line */}
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#666"
              strokeWidth="3"
              strokeDasharray="5,5"
              strokeLinecap='round'
              strokeLinejoin='round'
              opacity={0.8}
            />
            {/* Circle at each point */}
            <circle
              cx={x2}
              cy={y2}
              r={4}
              fill="#666"
              opacity={0.8}
            />
          </g>
        );
      })}
    </svg>
  );
}

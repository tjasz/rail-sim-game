import type { CityConfig, Neighborhood, Station, Citizen } from '../models';

interface CityGridProps {
  config: CityConfig;
  neighborhoods: Neighborhood[];
  stations: Map<string, Station>;
  citizens: Map<string, Citizen>;
  cellSize?: number;
}

export function CityGrid({ 
  config, 
  neighborhoods, 
  stations, 
  citizens,
  cellSize = 60 
}: CityGridProps) {
  const width = config.gridWidth * cellSize;
  const height = config.gridHeight * cellSize;
  
  // Create a map of positions to neighborhoods
  const neighborhoodMap = new Map<string, Neighborhood>();
  neighborhoods.forEach(n => {
    neighborhoodMap.set(`${n.position.x},${n.position.y}`, n);
  });
  
  // Create a map of positions to stations
  const stationMap = new Map<string, Station>();
  stations.forEach(s => {
    stationMap.set(`${s.position.x},${s.position.y}`, s);
  });
  
  return (
    <div className="city-grid-container">
      <svg 
        width={width} 
        height={height} 
        className="city-grid"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Draw grid cells */}
        {Array.from({ length: config.gridWidth }).map((_, x) =>
          Array.from({ length: config.gridHeight }).map((_, y) => {
            const isWater = config.tiles[x][y] === 'water';
            const neighborhood = neighborhoodMap.get(`${x},${y}`);
            const station = stationMap.get(`${x},${y}`);
            
            return (
              <g key={`${x}-${y}`}>
                {/* Cell background */}
                <rect
                  x={x * cellSize}
                  y={y * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={isWater ? 'paleturquoise' : 'linen'}
                  stroke="none"
                  strokeWidth="0"
                />
                
                {/* Neighborhood */}
                {neighborhood && (
                  <rect
                    x={x * cellSize + 5}
                    y={y * cellSize + 5}
                    width={cellSize - 10}
                    height={cellSize - 10}
                    fill={neighborhood.color}
                    opacity="0.8"
                    rx="3"
                  />
                )}
                
                {/* Station indicator */}
                {station && station.lineIds.length > 0 && (
                  <g>
                    {station.lineIds.map((lineId, idx) => (
                      <circle
                        key={lineId}
                        cx={x * cellSize + cellSize / 2}
                        cy={y * cellSize + cellSize / 2}
                        r={15 + idx * 3}
                        fill="none"
                        stroke="#000"
                        strokeWidth="2"
                      />
                    ))}
                  </g>
                )}

                {/* Waiting passenger count badge */}
                {station && Array.from(station.waitingCitizens.values()).reduce((sum, list) => sum + list.length, 0) > 0 && (
                  <g>
                    <circle
                      cx={x * cellSize + cellSize - 12}
                      cy={y * cellSize + 12}
                      r="10"
                      fill="#ff6b6b"
                      stroke="#fff"
                      strokeWidth="1"
                    />
                    <text
                      x={x * cellSize + cellSize - 12}
                      y={y * cellSize + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#fff"
                      fontWeight="bold"
                    >
                      {Array.from(station.waitingCitizens.values()).reduce((sum, list) => sum + list.length, 0)}
                    </text>
                  </g>
                )}
                
                {/* Neighborhood name */}
                {neighborhood && (
                  <text
                    x={x * cellSize + cellSize / 2}
                    y={y * cellSize + cellSize / 2 + 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#000"
                    fontWeight="bold"
                  >
                    {neighborhood.name}
                  </text>
                )}
              </g>
            );
          })
        )}
        
        {/* Draw citizens */}
        {Array.from(citizens.values()).map(citizen => {
          // Color based on state
          let fill = '#666';
          if (citizen.state === 'waiting-at-origin') fill = '#999';
          else if (citizen.state === 'walking-to-station') fill = '#3498db';
          else if (citizen.state === 'waiting-at-station') fill = '#f39c12';
          else if (citizen.state === 'riding-train') fill = '#9b59b6';
          else if (citizen.state === 'walking-to-destination') fill = '#2ecc71';
          else if (!citizen.isHappy) fill = '#e74c3c';
          
          return (
            <circle
              onContextMenu={() => console.log(citizen)}
              key={citizen.id}
              cx={citizen.currentPosition.x * cellSize + cellSize / 2}
              cy={citizen.currentPosition.y * cellSize + cellSize / 2}
              r={3}
              fill={fill}
              opacity="0.8"
            />
          );
        })}
      </svg>
    </div>
  );
}

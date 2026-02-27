import type { Train, Line, Citizen, Neighborhood, CityConfig } from '../models';
import { renderCitizenIcon } from './CitizenMarkers';
import { PositionedDiv } from './PositionedDiv';

const RIDER_SIZE = [0.15, 0.15]; // [width, height] in grid units
const RIDER_MARGIN = 0.02; // margin between riders in grid units

interface TrainMarkersProps {
  config: CityConfig;
  trains: Map<string, Train>;
  lines: Map<string, Line>;
  citizens: Map<string, Citizen>;
  neighborhoods: Map<string, Neighborhood>;
}

export function TrainMarkers({ trains, lines, citizens, neighborhoods }: TrainMarkersProps) {
  
  return (
    <>
      {Array.from(trains.values()).map(train => {
        const riderCols = (train.capacity % 2 === 0 && train.capacity > 3) ? 2 : 1; // if capacity is odd, use 1 column to avoid empty space
        const width = RIDER_SIZE[0] * riderCols + (riderCols + 1) * RIDER_MARGIN;
        const rider_rows = Math.ceil(train.capacity / riderCols);
        const height = RIDER_SIZE[1] * rider_rows + (rider_rows + 1) * RIDER_MARGIN;

        const line = lines.get(train.lineId);
        if (!line || !line.isActive) return null;
        
        // Get rotation angle (default to 0 if heading is not set)
        const rotation = train.heading ?? 0;
        
        return (
          <PositionedDiv
            key={train.id}
            position={{ x: train.position.x, y: train.position.y }}
            dimensions={{ width, height }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`${-width/2} ${-height/2} ${width} ${height}`}
              style={{ 
                transform: `rotate(${90-rotation}deg)`,
                overflow: 'visible'
              }}
            >
              {/* Train body */}
              <path
                d={`M ${-width/2} ${-height/2 + 0.04} L 0 ${-height/2} L ${width/2} ${-height/2 + 0.04} L ${width/2} ${height/2} L ${-width/2} ${height/2} Z`}
                fill={line.color}
                stroke="none"
                strokeWidth={0}
              />
              {/* Passengers */}
              {train.passengerIds.map((passengerId, idx) => {
                const row = Math.floor(idx / riderCols);
                const col = idx % riderCols;
                const x = -width/2 + RIDER_MARGIN + col * (RIDER_SIZE[0] + RIDER_MARGIN);
                const y = -height/2 + RIDER_MARGIN + row * (RIDER_SIZE[1] + RIDER_MARGIN);
                const citizen = citizens.get(passengerId);
                if (!citizen) return null;
                return (
                  <g key={passengerId}>
                    {renderCitizenIcon([x, y], RIDER_SIZE[0], citizen, neighborhoods)}
                  </g>
                );
              })}
            </svg>
          </PositionedDiv>
        );
      })}
    </>
  );
}

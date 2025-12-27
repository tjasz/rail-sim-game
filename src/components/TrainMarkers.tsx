import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Train, Line, Citizen, Neighborhood } from '../models';
import { renderCitizenIconAsText } from './CitizenMarkers';

const RIDER_SIZE = [10, 10]; // [width, height] in pixels
const RIDER_MARGIN = 1; // margin between riders in pixels
const RIDER_COLS = 2;

interface TrainMarkersProps {
  trains: Map<string, Train>;
  lines: Map<string, Line>;
  citizens: Map<string, Citizen>;
  neighborhoods: Map<string, Neighborhood>;
}

export function TrainMarkers({ trains, lines, citizens, neighborhoods }: TrainMarkersProps) {
  const width = RIDER_SIZE[0] * RIDER_COLS + (RIDER_COLS + 1) * RIDER_MARGIN;
  return (
    <>
      {Array.from(trains.values()).map(train => {
        const rider_rows = Math.ceil(train.capacity / RIDER_COLS);
        const height = RIDER_SIZE[1] * rider_rows + (rider_rows + 1) * RIDER_MARGIN;

        const line = lines.get(train.lineId);
        if (!line || !line.isActive) return null;
        
        // Get rotation angle (default to 0 if heading is not set)
        const rotation = train.heading ?? 0;
        
        // Create custom HTML for the train marker
        const trainHtml = `
          <div style="position: relative; width: ${width}px; height: ${height}px; transform: rotate(${90-rotation}deg); transform-origin: center;">
            <svg width="${width}" height="${height}" style="overflow: visible;">
              <!-- Train body -->
              <path
                d="M 0 2 L ${width/2} 0 L ${width} 2 L ${width} ${height} L 0 ${height} Z"
                fill="${line.color}"
                stroke="none"
                stroke-width="0"
              />
              ${train.passengerIds.map((_, idx) => {
                const row = Math.floor(idx / RIDER_COLS);
                const col = idx % RIDER_COLS;
                const x = RIDER_MARGIN + col * (RIDER_SIZE[0] + RIDER_MARGIN);
                const y = RIDER_MARGIN + row * (RIDER_SIZE[1] + RIDER_MARGIN);
                return renderCitizenIconAsText([x,y], RIDER_SIZE[0], citizens.get(train.passengerIds[idx])!, neighborhoods);
              }).join('')}
            </svg>
          </div>
        `;
        
        const icon = new DivIcon({
          html: trainHtml,
          className: 'train-marker',
          iconSize: [width, height],
          iconAnchor: [width/2, height/2],
        });
        
        // In Simple CRS, coordinates are [y, x] (row, col)
        const position: [number, number] = [train.position.y, train.position.x];
        
        return (
          <Marker 
            key={train.id} 
            position={position}
            icon={icon}
            // Disable interaction since trains are display-only
            interactive={false}
          />
        );
      })}
    </>
  );
}

import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Train, Line } from '../models';

const RIDER_SIZE = [10, 12]; // [width, height] in pixels
const RIDER_MARGIN = 2; // margin between riders in pixels
const RIDER_ROWS = 4;
const RIDER_COLS = 2;

interface TrainMarkersProps {
  trains: Map<string, Train>;
  lines: Map<string, Line>;
}

export function TrainMarkers({ trains, lines }: TrainMarkersProps) {
  const width = RIDER_SIZE[0] * RIDER_COLS + (RIDER_COLS + 1) * RIDER_MARGIN;
  const height = RIDER_SIZE[1] * RIDER_ROWS + (RIDER_ROWS + 1) * RIDER_MARGIN;
  return (
    <>
      {Array.from(trains.values()).map(train => {
        const line = lines.get(train.lineId);
        if (!line || !line.isActive) return null;
        
        // Create custom HTML for the train marker
        const trainHtml = `
          <div style="position: relative; width: ${width}px; height: ${height}px;">
            <svg width="${width}" height="${height}" style="overflow: visible;">
              <!-- Train body -->
              <rect
                width="${width}"
                height="${height}"
                fill="${line.color}"
                stroke="none"
                stroke-width="0"
                rx="2"
              />
              ${train.passengerIds.map((_, idx) => {
                const row = Math.floor(idx / RIDER_COLS);
                const col = idx % RIDER_COLS;
                const x = RIDER_MARGIN + col * (RIDER_SIZE[0] + RIDER_MARGIN);
                const y = RIDER_MARGIN + row * (RIDER_SIZE[1] + RIDER_MARGIN);
                return `
                  <rect
                    x="${x}"
                    y="${y}"
                    width="${RIDER_SIZE[0]}"
                    height="${RIDER_SIZE[1]}"
                    fill="black"
                  />
                `;
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

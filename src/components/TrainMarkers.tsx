import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Train, Line } from '../models';

interface TrainMarkersProps {
  trains: Map<string, Train>;
  lines: Map<string, Line>;
}

export function TrainMarkers({ trains, lines }: TrainMarkersProps) {
  return (
    <>
      {Array.from(trains.values()).map(train => {
        const line = lines.get(train.lineId);
        if (!line || !line.isActive) return null;
        
        // Create custom HTML for the train marker
        const trainHtml = `
          <div style="position: relative; width: 32px; height: 24px;">
            <svg width="32" height="24" style="overflow: visible;">
              <!-- Train body -->
              <rect
                x="8"
                y="6"
                width="16"
                height="12"
                fill="${line.color}"
                stroke="#000"
                stroke-width="1.5"
                rx="2"
              />
              <!-- Train window -->
              <rect
                x="11"
                y="9"
                width="10"
                height="6"
                fill="rgba(255, 255, 255, 0.5)"
                rx="1"
              />
              <!-- Direction indicator -->
              <polygon
                points="${train.direction === 'forward'
                  ? '24,12 28,8 28,16'
                  : '8,12 4,8 4,16'}"
                fill="#fff"
              />
            </svg>
            ${train.passengerIds.length > 0 ? `
              <div style="position: absolute; top: -2px; right: 0; 
                          background: #ff6b6b; border: 1px solid #fff; 
                          border-radius: 50%; width: 16px; height: 16px; 
                          display: flex; align-items: center; justify-content: center;
                          font-size: 9px; font-weight: bold; color: #fff;">
                ${train.passengerIds.length}
              </div>
            ` : ''}
          </div>
        `;
        
        const icon = new DivIcon({
          html: trainHtml,
          className: 'train-marker',
          iconSize: [32, 24],
          iconAnchor: [16, 12],
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

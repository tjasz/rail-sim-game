import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { iconPaths } from '../iconPaths';
import { useSelection } from '../contexts/SelectionContext';
import type { Citizen, Neighborhood } from '../models';

const CITIZEN_ICON_SIZE = 10; // in pixels

interface CitizenMarkersProps {
  citizens: Map<string, Citizen>;
  neighborhoods: Neighborhood[];
}

export function CitizenMarkers({ citizens, neighborhoods }: CitizenMarkersProps) {
  const { setSelectedObject } = useSelection();

  return (
    <>
      {Array.from(citizens.values()).map(citizen => {
        // Only render walking citizens
        if (!citizen.state.includes('walking')) {
          return null;
        }
        
        let fill = '#666';
        if (citizen.state === 'waiting-at-origin') fill = 'none';
        else if (citizen.state === 'walking-to-station') fill = '#3498db';
        else if (citizen.state === 'waiting-at-station') fill = '#f39c12';
        else if (citizen.state === 'riding-train') fill = '#9b59b6';
        else if (citizen.state === 'walking-to-destination') fill = '#2ecc71';
        else if (citizen.state === 'at-destination') fill = 'none';
        else if (citizen.state === 'completed') fill = 'none';
        else if (!citizen.isHappy) fill = '#e74c3c';

        const destinationNeighborhoodIcon = neighborhoods.find(
          n => n.id === citizen.destinationNeighborhoodId
        )?.icon ?? 'circle';

        // Create custom HTML for the citizen marker
        const citizenHtml = `
          <svg width="${CITIZEN_ICON_SIZE}" height="${CITIZEN_ICON_SIZE}" style="overflow: visible;">
            <path
              transform="scale(${CITIZEN_ICON_SIZE / 15})"
              fill="${fill}"
              opacity="0.8"
              d="${iconPaths[destinationNeighborhoodIcon]}"
            />
          </svg>
        `;

        const icon = new DivIcon({
          html: citizenHtml,
          className: 'citizen-marker',
          iconSize: [CITIZEN_ICON_SIZE, CITIZEN_ICON_SIZE],
          iconAnchor: [CITIZEN_ICON_SIZE / 2, CITIZEN_ICON_SIZE / 2],
        });

        // In Simple CRS, coordinates are [y, x] (row, col)
        const position: [number, number] = [
          citizen.currentPosition.y,
          citizen.currentPosition.x
        ];

        return (
          <Marker 
            key={citizen.id} 
            position={position} 
            icon={icon}
            eventHandlers={{
              click: () => {
                setSelectedObject(citizen);
              },
              contextmenu: (e) => {
                e.originalEvent.preventDefault();
                console.log(citizen);
              }
            }}
          />
        );
      })}
    </>
  );
}

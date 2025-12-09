import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { iconPaths } from '../iconPaths';
import { useSelection } from '../contexts/SelectionContext';
import type { Citizen, Neighborhood } from '../models';

const CITIZEN_ICON_SIZE = 10; // in pixels

interface CitizenMarkersProps {
  citizens: Map<string, Citizen>;
  neighborhoods: Neighborhood[];
  simulationTime: number; // minutes elapsed in current day
}

export function CitizenMarkers({ citizens, neighborhoods, simulationTime }: CitizenMarkersProps) {
  const { setSelectedObject } = useSelection();

  return (
    <>
      {Array.from(citizens.values()).map(citizen => {
        // Only render walking citizens
        if (!citizen.state.includes('walking')) {
          return null;
        }

        // Create custom HTML for the citizen marker
        const citizenHtml = `
          <svg width="${CITIZEN_ICON_SIZE}" height="${CITIZEN_ICON_SIZE+3}" style="overflow: visible;">
            ${renderCitizenIcon([0,0], CITIZEN_ICON_SIZE, citizen, neighborhoods, simulationTime)}
          </svg>`;

        const icon = new DivIcon({
          html: citizenHtml,
          className: 'citizen-marker',
          iconSize: [CITIZEN_ICON_SIZE, CITIZEN_ICON_SIZE+3],
          iconAnchor: [CITIZEN_ICON_SIZE / 2, (CITIZEN_ICON_SIZE + 3) / 2],
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

export const renderCitizenIcon = (position: [number, number], size: number, citizen: Citizen, neighborhoods: Neighborhood[], simulationTime: number) => {
  const currentTripTime = simulationTime - citizen.tripStartTime;
  const happiness = Math.max(0, Math.min(1, (citizen.route!.walkingOnlyTime! - currentTripTime) / citizen.route!.walkingOnlyTime!));
  const fill = "black";
  const destinationNeighborhoodIcon = neighborhoods.find(
    n => n.id === citizen.destinationNeighborhoodId
  )?.icon ?? 'circle';
  return `
    <g transform="translate(${position[0]}, ${position[1]}) scale(${size / 15})">
      <path
        fill="${fill}"
        opacity="0.8"
        d="${iconPaths[destinationNeighborhoodIcon] ?? destinationNeighborhoodIcon}"
      />
      <path
        fill="${fill}"
        opacity="0.8"
        d="M0 16 H${Math.floor(happiness * 15)} v2 H0 Z"
      />
    </g>
  `;
}
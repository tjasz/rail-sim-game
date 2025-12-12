import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Neighborhood } from '../models';
import { iconPaths } from '../iconPaths';

const NEIGHBORHOOD_ICON_SIZE = 20; // in pixels

interface NeighborhoodMarkersProps {
  neighborhoods: Neighborhood[];
  activeNeighborhoodCount: number;
}

export function NeighborhoodMarkers({ 
  neighborhoods,
  activeNeighborhoodCount
}: NeighborhoodMarkersProps) {
  return (
    <>
      {neighborhoods.slice(0,activeNeighborhoodCount+5).map((neighborhood, index) => {
        // Calculate opacity based on activation status
        // Active neighborhoods: opacity 1
        // Next neighborhood: opacity 0.5
        // 2nd next: opacity 0.25
        // 3rd next: opacity 0.125, etc.
        let opacity = 1;
        if (index >= activeNeighborhoodCount) {
          const stepsFromActive = index - activeNeighborhoodCount + 1;
          opacity = Math.pow(0.5, stepsFromActive);
        }

        // Create custom HTML for the neighborhood marker
        const neighborhoodHtml = `
          <div style="position: relative; width: ${NEIGHBORHOOD_ICON_SIZE}px; height: ${NEIGHBORHOOD_ICON_SIZE + 12}px; display: flex; flex-direction: column; align-items: center;">
            <svg width="${NEIGHBORHOOD_ICON_SIZE}" height="${NEIGHBORHOOD_ICON_SIZE}" style="overflow: visible;">
              <path
                transform="scale(${NEIGHBORHOOD_ICON_SIZE / 15})"
                fill="${neighborhood.color}"
                opacity="${opacity}"
                d="${iconPaths[neighborhood.icon] ?? neighborhood.icon}"
              />
            </svg>
          </div>
        `;

        const icon = new DivIcon({
          html: neighborhoodHtml,
          className: 'neighborhood-marker',
          iconSize: [NEIGHBORHOOD_ICON_SIZE, NEIGHBORHOOD_ICON_SIZE],
          iconAnchor: [NEIGHBORHOOD_ICON_SIZE / 2, (NEIGHBORHOOD_ICON_SIZE) / 2],
        });

        // In Simple CRS, coordinates are [y, x] (row, col)
        const position: [number, number] = [neighborhood.position.y, neighborhood.position.x];

        return (
          <Marker 
            key={neighborhood.id} 
            position={position} 
            icon={icon}
          />
        );
      })}
    </>
  );
}

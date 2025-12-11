import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Line, Citizen, Neighborhood } from '../models';
import { useSelection } from '../contexts/SelectionContext';
import { renderCitizenIcon } from './CitizenMarkers';

const STATION_MARKER_RADIUS = 20; // in pixels
const RIDER_SIZE = [10, 10]; // [width, height] in pixels
const RIDER_COLS = 5;
const RIDER_MARGIN = 0;

interface StationMarkersProps {
  neighborhoods: Neighborhood[];
  lines: Map<string, Line>;
  citizens: Map<string, Citizen>;
  drawingLineId?: string | null;
  onStationClick?: (neighborhoodId: string) => void;
  onStationClickForDraw?: (neighborhoodId: string, lineId: string, trackIds: string[]) => void;
  tracks?: Map<string, import('../models').Track>;
}

export function StationMarkers({ 
  neighborhoods,
  lines,
  citizens,
  drawingLineId,
  onStationClick,
  onStationClickForDraw,
  tracks
}: StationMarkersProps) {
  const { setSelectedObject } = useSelection();

  const stations = neighborhoods;

  return (
    <>
      {stations.map(neighborhood => {
        const waitingPassengers = Array.from((neighborhood.waitingCitizens ?? new Map()).values()).reduce(
          (sum, list) => [...sum, ...list], 
          []
        );

        // Build SVG for station marker with concentric circles for each line
        const lineIds = neighborhood.lineIds ?? [];
        let circlesHtml = '';
        if (lineIds.length === 0) {
          // Station with no lines - dashed circle
          circlesHtml = `
            <circle
              cx="${0}"
              cy="${0}"
              r="${STATION_MARKER_RADIUS}"
              fill="#6668"
              stroke="#888"
              stroke-width="2"
              stroke-dasharray="4,4"
            />
          `;
        } else {
          // Station with lines - concentric circles
          circlesHtml = lineIds.map((lineId: string, idx: number) => {
            const lineColor = lines.get(lineId)?.color || '#888';
            return `
              <circle
                cx="${0}"
                cy="${0}"
                r="${STATION_MARKER_RADIUS + idx * 2}"
                fill="${idx > 0 ? 'none' : '#6668'}"
                stroke="${lineColor}"
                stroke-width="2"
              />
            `;
          }).join('');
        }

        // Calculate SVG size based on number of lines
        const maxRadius = STATION_MARKER_RADIUS + Math.max(0, lineIds.length - 1) * 2;
        const svgSize = maxRadius * 2;

        // Create custom HTML for the station marker
        const stationHtml = `
          <div>
            <svg viewBox="${-maxRadius} ${-maxRadius} ${svgSize + RIDER_SIZE[0] * RIDER_COLS} ${svgSize}" style="overflow: visible;">
              ${circlesHtml}
              ${waitingPassengers.map((citizenId: string, idx: number) => {
                const row = Math.floor(idx / RIDER_COLS);
                const col = idx % RIDER_COLS;
                const x = maxRadius*Math.sqrt(3)/2 + RIDER_MARGIN + col * (RIDER_SIZE[0] + RIDER_MARGIN);
                const y = maxRadius/2 + RIDER_MARGIN + row * (RIDER_SIZE[1] + RIDER_MARGIN);
                return renderCitizenIcon([x,y], RIDER_SIZE[0], citizens.get(citizenId)!, neighborhoods);
              }).join('')}
            </svg>
          </div>
        `;

        const icon = new DivIcon({
          html: stationHtml,
          className: 'station-marker',
          iconSize: [svgSize + RIDER_SIZE[0] * RIDER_COLS, svgSize],
          iconAnchor: [maxRadius, maxRadius],
        });

        // In Simple CRS, coordinates are [y, x] (row, col)
        const position: [number, number] = [neighborhood.position.y, neighborhood.position.x];

        return (
          <Marker 
            key={neighborhood.id} 
            position={position} 
            icon={icon}
            eventHandlers={{
              click: (e) => {
                // Stop propagation to prevent cell click
                e.originalEvent.stopPropagation();
                
                // If in draw mode, handle station assignment to line
                if (drawingLineId && onStationClickForDraw && tracks) {
                  // Find tracks that connect this neighborhood to any neighborhood already on the line
                  const line = lines.get(drawingLineId);
                  if (!line) return;
                  
                  // Check if neighborhood is already on this line
                  if (line.neighborhoodIds.includes(neighborhood.id)) {
                    console.warn('Station is already on this line');
                    return;
                  }
                  
                  // Find connecting tracks
                  const connectingTracks: string[] = [];
                  tracks.forEach((track, trackId) => {
                    // Check if track connects to this neighborhood
                    const connectsToNeighborhood = 
                      (track.from.x === neighborhood.position.x && track.from.y === neighborhood.position.y) ||
                      (track.to.x === neighborhood.position.x && track.to.y === neighborhood.position.y);
                    
                    if (!connectsToNeighborhood) return;
                    
                    // Check if the other end connects to a neighborhood on the line
                    const otherEnd = 
                      track.from.x === neighborhood.position.x && track.from.y === neighborhood.position.y
                        ? track.to
                        : track.from;
                    
                    const connectedNeighborhood = neighborhoods.find(
                      n => n.position.x === otherEnd.x && n.position.y === otherEnd.y
                    );
                    
                    if (connectedNeighborhood && line.neighborhoodIds.includes(connectedNeighborhood.id)) {
                      connectingTracks.push(trackId);
                    }
                  });
                  
                  if (connectingTracks.length === 0) {
                    console.warn('No tracks connect this station to the line');
                    return;
                  }
                  
                  onStationClickForDraw(neighborhood.id, drawingLineId, connectingTracks);
                }
                // If there's a station click handler, use it (for assignment modal)
                else if (onStationClick) {
                  onStationClick(neighborhood.id);
                } else {
                  // Otherwise use the selection context (for inspector)
                  setSelectedObject(neighborhood);
                }
              },
              contextmenu: (e) => {
                e.originalEvent.preventDefault();
                console.log(neighborhood);
              }
            }}
          />
        );
      })}
    </>
  );
}

import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Line, Citizen, Neighborhood } from '../models';
import { useSelection } from '../contexts/SelectionContext';
import { renderCitizenIcon } from './CitizenMarkers';
import { findShortestTrackPath } from '../utils';

const STATION_MARKER_RADIUS = 12; // in pixels
const RIDER_SIZE = [10, 10]; // [width, height] in pixels
const RIDER_COLS = 5;
const RIDER_MARGIN = 0;

interface StationMarkersProps {
  neighborhoods: Map<string, Neighborhood>;
  lines: Map<string, Line>;
  citizens: Map<string, Citizen>;
  drawingLineId?: string | null;
  onStationClick?: (neighborhoodId: string) => void;
  onStationClickForDraw?: (neighborhoodId: string, lineId: string, trackIds: string[]) => void;
  tracks?: Map<string, import('../models').Track>;
  stationCrowdingTimeLimit: number;
}

export function StationMarkers({ 
  neighborhoods,
  lines,
  citizens,
  drawingLineId,
  onStationClick,
  onStationClickForDraw,
  tracks,
  stationCrowdingTimeLimit,
}: StationMarkersProps) {
  const { setSelectedObject } = useSelection();

  const stations = Array.from(neighborhoods.values());

  return (
    <>
      {stations.map(neighborhood => {
        const waitingPassengers = Array.from((neighborhood.waitingCitizens ?? new Map()).values()).reduce(
          (sum, list) => [...sum, ...list], 
          []
        );

        // Calculate crowding gradient
        const crowdingTime = neighborhood.crowdingTime || 0;
        const crowdingRatio = Math.min(crowdingTime / stationCrowdingTimeLimit, 1);
        
        // Calculate gradient offset (0% = top, 100% = bottom)
        // When crowdingRatio = 0, transition is at 100% (no fill)
        // When crowdingRatio = 1, transition is at 0% (full fill)
        const transitionPoint = (1 - crowdingRatio) * 100;
        
        // Create unique gradient ID for this station
        const gradientId = `crowding-gradient-${neighborhood.id}`;
        const gradient = `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#6664;stop-opacity:1" />
          <stop offset="${transitionPoint}%" style="stop-color:#6664;stop-opacity:1" />
          <stop offset="${transitionPoint}%" style="stop-color:#6668;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6668;stop-opacity:1" />
        </linearGradient>`;
        
        // Build SVG for station marker with concentric circles for each line
        const lineIds = neighborhood.lineIds ?? [];
        let circlesHtml = '';
        if (lineIds.length === 0) {
          // Station with no lines - dashed circle with crowding gradient
          circlesHtml = `
            <defs>
              ${gradient}
            </defs>
            <circle
              cx="${0}"
              cy="${0}"
              r="${STATION_MARKER_RADIUS}"
              fill="url(#${gradientId})"
              stroke="#888"
              stroke-width="2"
              stroke-dasharray="4,4"
            />
          `;
        } else {
          // Station with lines - concentric circles with crowding gradient on innermost
          circlesHtml = lineIds.map((lineId: string, idx: number) => {
            const lineColor = lines.get(lineId)?.color || '#888';
            const fillValue = idx > 0 ? 'none' : `url(#${gradientId})`;
            return `
              ${idx === 0 ? `
              <defs>
                ${gradient}
              </defs>
              ` : ''}
              <circle
                cx="${0}"
                cy="${0}"
                r="${STATION_MARKER_RADIUS + idx * 2}"
                fill="${fillValue}"
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
          <div ${crowdingTime > 0 ? 'class="crowded"' : ''}>
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

                  if (line.neighborhoodIds.length === 0) {
                    onStationClickForDraw(neighborhood.id, drawingLineId, []);
                    return;
                  }
                  
                  // Find the closest station on this line
                  let closestStation: Neighborhood | null = null;
                  let shortestPath: string[] | null = null;
              
                  for (const stationId of line.neighborhoodIds) {
                    const otherStation = neighborhoods.get(stationId);
                    if (!otherStation) continue;
              
                    const path = findShortestTrackPath(neighborhood, otherStation, tracks);
                    if (path && (shortestPath === null || path.length < shortestPath.length)) {
                      closestStation = otherStation;
                      shortestPath = path;
                    }
                  }
              
                  if (closestStation && shortestPath) {
                    onStationClickForDraw(neighborhood.id, drawingLineId, shortestPath);
                  }
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

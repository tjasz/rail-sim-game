import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Station, Line, Citizen, Neighborhood } from '../models';
import { useSelection } from '../contexts/SelectionContext';
import { renderCitizenIcon } from './CitizenMarkers';

const STATION_MARKER_RADIUS = 20; // in pixels
const RIDER_SIZE = [10, 13]; // [width, height] in pixels
const RIDER_COLS = 5;
const RIDER_MARGIN = 0;

interface StationMarkersProps {
  stations: Map<string, Station>;
  lines: Map<string, Line>;
  citizens: Map<string, Citizen>;
  neighborhoods: Neighborhood[];
  simulationTime: number; // total minutes elapsed since game start
  onStationClick?: (stationId: string) => void;
}

export function StationMarkers({ 
  stations, 
  lines,
  citizens,
  neighborhoods,
  simulationTime,
  onStationClick 
}: StationMarkersProps) {
  const { setSelectedObject } = useSelection();

  return (
    <>
      {Array.from(stations.values()).map(station => {
        const waitingPassengers = Array.from(station.waitingCitizens.values()).reduce(
          (sum, list) => [...sum, ...list], 
          []
        );

        // Build SVG for station marker with concentric circles for each line
        let circlesHtml = '';
        if (station.lineIds.length === 0) {
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
          circlesHtml = station.lineIds.map((lineId, idx) => {
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
        const maxRadius = STATION_MARKER_RADIUS + Math.max(0, station.lineIds.length - 1) * 2;
        const svgSize = maxRadius * 2;

        // Create custom HTML for the station marker
        const stationHtml = `
          <div>
            <svg viewBox="${-maxRadius} ${-maxRadius} ${svgSize + RIDER_SIZE[0] * RIDER_COLS} ${svgSize}" style="overflow: visible;">
              ${circlesHtml}
              ${waitingPassengers.map((citizenId, idx) => {
                const row = 0;
                const col = idx;
                const x = maxRadius*Math.sqrt(3)/2 + RIDER_MARGIN + col * (RIDER_SIZE[0] + RIDER_MARGIN);
                const y = maxRadius/2 + RIDER_MARGIN + row * (RIDER_SIZE[1] + RIDER_MARGIN);
                return renderCitizenIcon([x,y], RIDER_SIZE[0], citizens.get(citizenId)!, neighborhoods, simulationTime);
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
        const position: [number, number] = [station.position.y, station.position.x];

        return (
          <Marker 
            key={station.id} 
            position={position} 
            icon={icon}
            eventHandlers={{
              click: (e) => {
                // Stop propagation to prevent cell click
                e.originalEvent.stopPropagation();
                
                // If there's a station click handler, use it (for assignment modal)
                if (onStationClick) {
                  onStationClick(station.id);
                } else {
                  // Otherwise use the selection context (for inspector)
                  setSelectedObject(station);
                }
              },
              contextmenu: (e) => {
                e.originalEvent.preventDefault();
                console.log(station);
              }
            }}
          />
        );
      })}
    </>
  );
}

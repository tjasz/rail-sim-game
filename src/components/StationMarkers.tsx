import { Marker } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import type { Station, Line } from '../models';
import { useSelection } from '../contexts/SelectionContext';

const STATION_MARKER_RADIUS = 10; // in pixels

interface StationMarkersProps {
  stations: Map<string, Station>;
  lines: Map<string, Line>;
  onStationClick?: (stationId: string) => void;
}

export function StationMarkers({ 
  stations, 
  lines,
  onStationClick 
}: StationMarkersProps) {
  const { setSelectedObject } = useSelection();

  return (
    <>
      {Array.from(stations.values()).map(station => {
        const waitingPassengersCount = Array.from(station.waitingCitizens.values()).reduce(
          (sum, list) => sum + list.length, 
          0
        );

        // Build SVG for station marker with concentric circles for each line
        let circlesHtml = '';
        if (station.lineIds.length === 0) {
          // Station with no lines - dashed circle
          circlesHtml = `
            <circle
              cx="${STATION_MARKER_RADIUS * 2}"
              cy="${STATION_MARKER_RADIUS * 2}"
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
                cx="${STATION_MARKER_RADIUS * 2}"
                cy="${STATION_MARKER_RADIUS * 2}"
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
        const svgSize = maxRadius * 2 + 4; // +4 for stroke width

        // Create custom HTML for the station marker
        const stationHtml = `
          <div style="position: relative; width: ${svgSize}px; height: ${svgSize}px;">
            <svg width="${svgSize}" height="${svgSize}" style="overflow: visible;">
              ${circlesHtml}
            </svg>
            ${waitingPassengersCount > 0 ? `
              <div style="
                position: absolute;
                top: -4px;
                right: -4px;
                background: #ff6b6b;
                border: 1px solid #fff;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: bold;
                color: #fff;
              ">
                ${waitingPassengersCount}
              </div>
            ` : ''}
          </div>
        `;

        const icon = new DivIcon({
          html: stationHtml,
          className: 'station-marker',
          iconSize: [svgSize, svgSize],
          iconAnchor: [svgSize / 2, svgSize / 2],
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

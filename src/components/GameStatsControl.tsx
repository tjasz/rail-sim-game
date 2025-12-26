import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './GameStatsControl.css';

interface GameStatsControlProps {
  budget: number;
  totalCitizensTransported: number;
}

export function GameStatsControl({
  budget,
  totalCitizensTransported,
}: GameStatsControlProps) {
  const map = useMap();
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    // Create custom control
    const GameStatsControlClass = L.Control.extend({
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-game-stats-control leaflet-bar');
        
        // Prevent map interactions when clicking on control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      },
    });

    const control = new GameStatsControlClass({ position: 'topleft' });
    control.addTo(map);
    controlRef.current = control;

    return () => {
      if (controlRef.current) {
        map.removeControl(controlRef.current);
      }
    };
  }, [map]);

  // Update control content when props change
  useEffect(() => {
    if (!controlRef.current) return;

    const container = controlRef.current.getContainer();
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Add transported citizens display
    const transportedDiv = L.DomUtil.create('div', 'stat-row', container);
    transportedDiv.innerHTML = `
      <span class="stat-value">${totalCitizensTransported.toLocaleString()}</span>
    `;

    // Add budget display
    const budgetDiv = L.DomUtil.create('div', 'stat-row', container);
    budgetDiv.innerHTML = `
      <span class="stat-value">$${budget.toLocaleString()}</span>
    `;
  }, [budget, totalCitizensTransported]);

  return null;
}

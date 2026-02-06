import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './PurchaseTrainControl.css';
import { iconPaths } from '../iconPaths';

interface PurchaseTrainControlProps {
  unassignedTrainCount: number;
}

export function PurchaseTrainControl({
  unassignedTrainCount,
}: PurchaseTrainControlProps) {
  const map = useMap();
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    // Create custom control
    const PurchaseTrainControlClass = L.Control.extend({
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-purchase-train-control leaflet-bar');
        
        // Prevent map interactions when clicking on control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      },
    });

    const control = new PurchaseTrainControlClass({ position: 'topleft' });
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

    // Create display for unassigned train count
    const displayDiv = L.DomUtil.create('div', 'unassigned-trains-display', container);
    displayDiv.innerHTML = `
      <svg viewBox="0 0 15 15" width="20" height="20"><path d="${iconPaths['temaki-train']}"/></svg>
      <span class="train-count">${unassignedTrainCount}</span>
    `;
    displayDiv.title = `Unassigned trains: ${unassignedTrainCount}`;
  }, [unassignedTrainCount]);

  return null;
}

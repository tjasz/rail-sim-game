import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './BuildTrackControl.css';
import { iconPaths } from '../iconPaths';

interface BuildTrackControlProps {
  isBuilding: boolean;
  points: { x: number; y: number }[];
  totalDistance: number;
  totalCost: number;
  budget: number;
  onStartBuilding: () => void;
  onConfirmTrack: () => void;
  onCancelTrack: () => void;
}

export function BuildTrackControl({
  isBuilding,
  points,
  totalDistance,
  totalCost,
  budget,
  onStartBuilding,
  onConfirmTrack,
  onCancelTrack,
}: BuildTrackControlProps) {
  const map = useMap();
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    // Create custom control
    const BuildTrackControlClass = L.Control.extend({
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-build-track-control leaflet-bar');
        
        // Prevent map interactions when clicking on control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      },
    });

    const control = new BuildTrackControlClass({ position: 'topleft' });
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

    if (!isBuilding) {
      // Show single "RR" button with track icon
      const rrBtn = L.DomUtil.create('button', 'build-track-btn rr-btn', container);
      rrBtn.innerHTML = `<svg viewBox="0 0 15 15" width="20" height="20"><path d="${iconPaths['temaki-railway_track_partial']}"/></svg>`;
      rrBtn.title = 'Build Track';
      rrBtn.onclick = (e) => {
        e.stopPropagation();
        onStartBuilding();
      };
    } else {
      // Show info and action buttons
      const infoDiv = L.DomUtil.create('div', 'build-track-info', container);
      infoDiv.innerHTML = `
        <div class="info-row">Points: ${points.length}</div>
        <div class="info-row">Distance: ${totalDistance.toFixed(2)}</div>
        <div class="info-row">Cost: $${Math.round(totalCost).toLocaleString()}</div>
        <div class="info-row">Budget: $${Math.round(budget).toLocaleString()}</div>
      `;

      const btnContainer = L.DomUtil.create('div', 'build-track-buttons', container);

      // Confirm button
      const confirmBtn = L.DomUtil.create('button', 'build-track-btn confirm-btn', btnContainer);
      confirmBtn.innerHTML = '✓';
      confirmBtn.title = 'Confirm Track';
      const canConfirm = points.length >= 2 && totalCost <= budget;
      if (!canConfirm) {
        confirmBtn.disabled = true;
        confirmBtn.classList.add('disabled');
      }
      confirmBtn.onclick = (e) => {
        e.stopPropagation();
        if (canConfirm) {
          onConfirmTrack();
        }
      };

      // Cancel button
      const cancelBtn = L.DomUtil.create('button', 'build-track-btn cancel-btn', btnContainer);
      cancelBtn.innerHTML = '✗';
      cancelBtn.title = 'Cancel Track';
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        onCancelTrack();
      };
    }
  }, [isBuilding, points, totalDistance, totalCost, budget, onStartBuilding, onConfirmTrack, onCancelTrack]);

  return null;
}

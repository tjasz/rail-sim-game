import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './PurchaseTrainControl.css';
import { iconPaths } from '../iconPaths';

interface PurchaseTrainControlProps {
  budget: number;
  trainCost: number;
  onPurchaseTrain: () => void;
}

export function PurchaseTrainControl({
  budget,
  trainCost,
  onPurchaseTrain,
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

    const canAfford = budget >= trainCost;

    // Create purchase train button
    const purchaseBtn = L.DomUtil.create('button', 'purchase-train-btn', container);
    purchaseBtn.innerHTML = `<svg viewBox="0 0 15 15" width="20" height="20"><path d="${iconPaths['temaki-train']}"/></svg>`;
    purchaseBtn.title = canAfford 
      ? `Purchase train for $${trainCost.toLocaleString()}` 
      : `Insufficient budget (need $${trainCost.toLocaleString()})`;
    purchaseBtn.disabled = !canAfford;
    purchaseBtn.onclick = (e) => {
      e.stopPropagation();
      if (canAfford) {
        onPurchaseTrain();
      }
    };
  }, [budget, trainCost, onPurchaseTrain]);

  return null;
}

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Line, Train } from '../models';
import './LinesControl.css';

interface LinesControlProps {
  lines: Map<string, Line>;
  trains: Map<string, Train>;
  drawingLineId: string | null;
  onAssignTrainToLine: (trainId: string, lineId: string) => void;
  onRemoveTrainFromLine: (trainId: string) => void;
  onStartDrawLine: (lineId: string) => void;
  onStopDrawLine: () => void;
  onDrawNewLine: () => void;
}

export function LinesControl({
  lines,
  trains,
  drawingLineId,
  onAssignTrainToLine,
  onRemoveTrainFromLine,
  onStartDrawLine,
  onStopDrawLine,
  onDrawNewLine,
}: LinesControlProps) {
  const map = useMap();
  const controlRef = useRef<L.Control | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  useEffect(() => {
    // Create custom control
    const LinesControlClass = L.Control.extend({
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-lines-control leaflet-bar');
        
        // Prevent map interactions when clicking on control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      },
    });

    const control = new LinesControlClass({ position: 'bottomleft' });
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

    // Get unassigned trains
    const unassignedTrains = Array.from(trains.values()).filter(
      train => train.lineId === 'unassigned'
    );

    // Helper function to get trains for a specific line
    const getTrainsForLine = (lineId: string) => {
      return Array.from(trains.values()).filter(train => train.lineId === lineId);
    };

    // Helper function to assign first unassigned train to a line
    const handleAddTrainToLine = (lineId: string) => {
      if (unassignedTrains.length > 0) {
        onAssignTrainToLine(unassignedTrains[0].id, lineId);
      }
    };

    // Helper function to remove the first train from a line
    const handleRemoveTrainFromLine = (lineId: string) => {
      const lineTrains = getTrainsForLine(lineId);
      if (lineTrains.length > 0) {
        onRemoveTrainFromLine(lineTrains[0].id);
      }
    };

    const handleLineClick = (lineId: string) => {
      setSelectedLineId(prevId => prevId === lineId ? null : lineId);
    };

    const handleAddNewLine = () => {
      onDrawNewLine();
      // Get the newly created line ID (it will be the last one added)
      setTimeout(() => {
        const linesArray = Array.from(lines.values());
        if (linesArray.length > 0) {
          const newLine = linesArray[linesArray.length - 1];
          setSelectedLineId(newLine.id);
        }
      }, 100);
    };

    // Create details row (top row) if a line is selected
    if (selectedLineId) {
      const selectedLine = lines.get(selectedLineId);
      if (selectedLine) {
        const detailsRow = L.DomUtil.create('div', 'lines-details-row', container);
        
        const lineTrains = getTrainsForLine(selectedLineId);
        const hasUnassignedTrains = unassignedTrains.length > 0;
        const hasTrainsOnLine = lineTrains.length > 0;
        const isDrawingThisLine = drawingLineId === selectedLineId;

        // Close button
        const closeBtn = L.DomUtil.create('button', 'lines-close-btn', detailsRow);
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Close';
        closeBtn.onclick = (e) => {
          e.stopPropagation();
          setSelectedLineId(null);
        };

        // Stats
        const statsRow = L.DomUtil.create('div', 'lines-stats-row', detailsRow);
        const trainsStat = L.DomUtil.create('div', 'lines-stat', statsRow);
        trainsStat.innerHTML = `<span class="lines-stat-label">Trains:</span> <span class="lines-stat-value">${lineTrains.length}</span>`;
        const stopsStat = L.DomUtil.create('div', 'lines-stat', statsRow);
        stopsStat.innerHTML = `<span class="lines-stat-label">Stops:</span> <span class="lines-stat-value">${selectedLine.neighborhoodIds.length}</span>`;

        // Actions
        const actionsRow = L.DomUtil.create('div', 'lines-actions-row', detailsRow);
        
        const removeTrainBtn = L.DomUtil.create('button', 'lines-action-btn', actionsRow);
        removeTrainBtn.innerHTML = '- Train';
        removeTrainBtn.title = hasTrainsOnLine ? 'Remove train from line' : 'No trains on this line';
        removeTrainBtn.disabled = !hasTrainsOnLine || isDrawingThisLine;
        removeTrainBtn.onclick = (e) => {
          e.stopPropagation();
          handleRemoveTrainFromLine(selectedLineId);
        };

        const addTrainBtn = L.DomUtil.create('button', 'lines-action-btn', actionsRow);
        addTrainBtn.innerHTML = '+ Train';
        addTrainBtn.title = hasUnassignedTrains ? 'Assign train from unassigned pool' : 'No unassigned trains available';
        addTrainBtn.disabled = !hasUnassignedTrains || isDrawingThisLine;
        addTrainBtn.onclick = (e) => {
          e.stopPropagation();
          handleAddTrainToLine(selectedLineId);
        };

        const drawBtn = L.DomUtil.create('button', 'lines-action-btn lines-draw-btn', actionsRow);
        if (!isDrawingThisLine) {
          drawBtn.innerHTML = '✏️ Draw';
          drawBtn.title = 'Draw this line by clicking stations on the map';
          drawBtn.onclick = (e) => {
            e.stopPropagation();
            onStartDrawLine(selectedLineId);
          };
        } else {
          drawBtn.innerHTML = '✓ Confirm';
          drawBtn.title = 'Stop drawing this line';
          drawBtn.classList.add('drawing');
          drawBtn.onclick = (e) => {
            e.stopPropagation();
            onStopDrawLine();
          };
        }
      }
    }

    // Create circles row (bottom row) - always visible
    const circlesRow = L.DomUtil.create('div', 'lines-circles-row', container);

    // Add circles for each line
    Array.from(lines.values()).forEach(line => {
      const circle = L.DomUtil.create('div', 'lines-circle', circlesRow);
      circle.style.backgroundColor = line.color;
      circle.title = line.name;
      
      if (selectedLineId === line.id) {
        circle.classList.add('selected');
      }
      
      if (drawingLineId === line.id) {
        circle.classList.add('drawing');
      }

      circle.onclick = (e) => {
        e.stopPropagation();
        handleLineClick(line.id);
      };
    });

    // Add "+" circle
    const addCircle = L.DomUtil.create('div', 'lines-circle lines-add-circle', circlesRow);
    addCircle.innerHTML = '+';
    addCircle.title = 'Add new line';
    addCircle.onclick = (e) => {
      e.stopPropagation();
      handleAddNewLine();
    };

  }, [lines, trains, drawingLineId, selectedLineId, onAssignTrainToLine, onRemoveTrainFromLine, onStartDrawLine, onStopDrawLine, onDrawNewLine]);

  // Auto-select newly created line when drawing starts
  useEffect(() => {
    if (drawingLineId && drawingLineId !== selectedLineId) {
      setSelectedLineId(drawingLineId);
    }
  }, [drawingLineId, selectedLineId]);

  return null;
}

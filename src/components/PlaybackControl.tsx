import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import './PlaybackControl.css';

interface PlaybackControlProps {
  dayProgress: number;
  isSimulating: boolean;
  simulationSpeed: number;
  onStartPause: () => void;
  onSpeedChange: (speed: number) => void;
}

export function PlaybackControl({
  dayProgress,
  isSimulating,
  simulationSpeed,
  onStartPause,
  onSpeedChange,
}: PlaybackControlProps) {
  const map = useMap();
  const controlRef = useRef<L.Control | null>(null);

  useEffect(() => {
    // Create custom control
    const PlaybackControlClass = L.Control.extend({
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-playback-control leaflet-bar');
        
        // Prevent map interactions when clicking on control
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        return container;
      },
    });

    const control = new PlaybackControlClass({ position: 'topright' });
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

    // Add day progress display
    const dayProgressDiv = L.DomUtil.create('div', 'day-progress', container);
    dayProgressDiv.innerHTML = `${Math.round(dayProgress * 100).toFixed(0)}%`;

    // Create pause/play button
    const pausePlayBtn = L.DomUtil.create('button', 'playback-btn pause-play-btn', container);
    pausePlayBtn.innerHTML = isSimulating ? '⏸' : '▶';
    pausePlayBtn.title = isSimulating ? 'Pause' : 'Play';
    pausePlayBtn.onclick = (e) => {
      e.stopPropagation();
      onStartPause();
    };

    // Create speed buttons
    const speeds = [1, 2, 5];
    speeds.forEach(speed => {
      const speedBtn = L.DomUtil.create('button', 'playback-btn speed-btn', container);
      speedBtn.innerHTML = `${speed}x`;
      speedBtn.title = `${speed}x Speed`;
      if (speed === simulationSpeed && isSimulating) {
        speedBtn.classList.add('active');
      }
      if (!isSimulating) {
        speedBtn.disabled = true;
      }
      speedBtn.onclick = (e) => {
        e.stopPropagation();
        onSpeedChange(speed);
      };
    });
  }, [dayProgress, isSimulating, simulationSpeed, onStartPause, onSpeedChange]);

  return null;
}

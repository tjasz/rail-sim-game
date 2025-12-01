import type { Citizen } from '../models';

interface CitizenMarkerProps {
  citizen: Citizen;
  cellSize: number;
}

export function CitizenMarker({ citizen, cellSize }: CitizenMarkerProps) {
  let fill = '#666';
  if (citizen.state === 'waiting-at-origin') fill = '#999';
  else if (citizen.state === 'walking-to-station') fill = '#3498db';
  else if (citizen.state === 'waiting-at-station') fill = '#f39c12';
  else if (citizen.state === 'riding-train') fill = '#9b59b6';
  else if (citizen.state === 'walking-to-destination') fill = '#2ecc71';
  else if (citizen.state === 'at-destination') fill = 'none';
  else if (citizen.state === 'completed') fill = 'none';
  else if (!citizen.isHappy) fill = '#e74c3c';
  return (
    <circle
      onContextMenu={() => console.log(citizen)}
      key={citizen.id}
      cx={citizen.currentPosition.x * cellSize + cellSize / 2}
      cy={citizen.currentPosition.y * cellSize + cellSize / 2}
      r={3}
      fill={fill}
      opacity="0.8"
    />
  );
}

import { iconPaths } from '../iconPaths';
import { useSelection } from '../contexts/SelectionContext';
import type { Citizen, Neighborhood } from '../models';

const CITIZEN_ICON_SIZE = 10; // in pixels

interface CitizenMarkerProps {
  citizen: Citizen;
  neighborhoods: Neighborhood[];
  cellSize: number;
}

export function CitizenMarker({ citizen, neighborhoods, cellSize }: CitizenMarkerProps) {
  const { setSelectedObject } = useSelection();
  
  let fill = '#666';
  if (citizen.state === 'waiting-at-origin') fill = 'none';
  else if (citizen.state === 'walking-to-station') fill = '#3498db';
  else if (citizen.state === 'waiting-at-station') fill = '#f39c12';
  else if (citizen.state === 'riding-train') fill = '#9b59b6';
  else if (citizen.state === 'walking-to-destination') fill = '#2ecc71';
  else if (citizen.state === 'at-destination') fill = 'none';
  else if (citizen.state === 'completed') fill = 'none';
  else if (!citizen.isHappy) fill = '#e74c3c';

  const destinationNeighborhoodIcon = neighborhoods.find(n => n.id === citizen.destinationNeighborhoodId)?.icon ?? 'circle';

  const cx = citizen.currentPosition.x * cellSize + cellSize / 2 - CITIZEN_ICON_SIZE / 2;
  const cy = citizen.currentPosition.y * cellSize + cellSize / 2 - CITIZEN_ICON_SIZE / 2;

  const handleClick = () => {
    setSelectedObject(citizen);
  };

  return (<path
      onClick={handleClick}
      onContextMenu={(e) => { e.preventDefault(); console.log(citizen); }}
      transform={`translate(${cx}, ${cy}) scale(${CITIZEN_ICON_SIZE / 15})`}
      fill={fill}
      opacity="0.8"
      d={iconPaths[destinationNeighborhoodIcon]}
      style={{ cursor: 'pointer' }}
      />)
}

import { iconPaths } from '../iconPaths';
import type { Citizen, Neighborhood } from '../models';

export const renderCitizenIcon = (position: [number, number], size: number, citizen: Citizen, neighborhoods: Neighborhood[]) => {
  const fill = "black";
  const destinationNeighborhoodIcon = neighborhoods.find(
    n => n.id === citizen.destinationNeighborhoodId
  )?.icon ?? 'circle';
  return `
    <g transform="translate(${position[0]}, ${position[1]}) scale(${size / 15})">
      <path
        fill="${fill}"
        opacity="0.8"
        d="${iconPaths[destinationNeighborhoodIcon] ?? destinationNeighborhoodIcon}"
      />
    </g>
  `;
}
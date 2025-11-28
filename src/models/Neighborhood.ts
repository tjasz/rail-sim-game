import type { Position } from './types';

export interface Neighborhood {
  id: string;
  name: string;
  position: Position;
  icon: string; // maki or temaki icon name
  color: string;
  originDemandPercent: number; // percentage of trips starting here
  destinationDemandPercent: number; // percentage of trips ending here
}

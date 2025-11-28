import type { Position } from './types';

export interface Track {
  id: string;
  from: Position;
  to: Position;
  distance: number; // in grid squares (Euclidean distance)
  isOverWater: boolean;
  cost: number; // construction cost
  lineIds: string[]; // lines using this track
}

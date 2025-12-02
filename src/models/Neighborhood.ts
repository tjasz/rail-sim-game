import type { Position } from './types';

export type Shift = [number, number]; // [startHour, endHour]

export interface Neighborhood {
  id: string;
  name: string;
  position: Position;
  icon: string; // maki or temaki icon name
  color: string;
  residents: number; // number of residents living in this neighborhood
  proportionOfJobs: number; // proportion of jobs in the city (0-1)
  availableShifts: Shift[]; // shifts available for jobs in this neighborhood
  proportionOfRecreationalDemand: number; // proportion of non-work demand (0-1)
}

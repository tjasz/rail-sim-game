import type { Position } from './types';

export type Shift = [number, number]; // [startHour, endHour]

export interface Neighborhood {
  id: string;
  name: string;
  position: Position;
  icon: string; // maki or temaki icon name
  color: string;
  residents: number; // number of residents living in this neighborhood
  proportionOfJobs: number; // jobs will be proportionate to this number, normalized across active neighborhoods
  availableShifts: Shift[]; // shifts available for jobs in this neighborhood
  recreationalDemandCoefficient: number; // recreational demand will be proportionate to this times the sum of jobs and residents
  lineIds?: string[]; // lines that stop at this neighborhood's station (optional, defaults to [])
  waitingCitizens?: Map<string, string[]>; // lineId -> array of citizenIds waiting for that line (optional, defaults to new Map())
  crowdingTime?: number; // minutes the station has been crowded (optional, defaults to 0)
}

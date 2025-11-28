import type { Position } from './types';

export interface Station {
  id: string;
  neighborhoodId: string;
  position: Position;
  lineIds: string[]; // lines that stop at this station
  waitingCitizens: Map<string, string[]>; // lineId -> array of citizenIds waiting for that line
}

import type { Position } from './types';

export type TrainDirection = 'forward' | 'backward';

export interface Train {
  id: string;
  lineId: string;
  currentNeighborhoodIndex: number; // index in the line's neighborhoodIds array
  direction: TrainDirection; // forward = increasing index, backward = decreasing index
  position: { x: number; y: number }; // current position on the grid
  passengerIds: string[]; // citizenIds currently on this train
  capacity: number; // maximum passengers
  speed: number; // grid squares per minute
  heading?: number; // direction of travel in degrees (0 = east, 90 = south, 180 = west, 270 = north)
  nextNeighborhoodArrivalTime?: number; // simulation time in minutes
  currentPath?: Position[]; // waypoints to follow to reach next neighborhood
  currentPathIndex?: number; // current position in the path
}

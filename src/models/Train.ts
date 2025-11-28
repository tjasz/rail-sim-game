export type TrainDirection = 'forward' | 'backward';

export interface Train {
  id: string;
  lineId: string;
  currentStationIndex: number; // index in the line's stationIds array
  direction: TrainDirection; // forward = increasing index, backward = decreasing index
  position: { x: number; y: number }; // current position on the grid
  passengerIds: string[]; // citizenIds currently on this train
  capacity: number; // maximum passengers
  speed: number; // grid squares per minute
  nextStationArrivalTime?: number; // simulation time in minutes
}

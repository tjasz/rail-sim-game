import type { Position } from './types';
import type { Shift } from './Neighborhood';

export type CitizenState = 
  | 'waiting-at-origin' 
  | 'walking-to-station' 
  | 'waiting-at-station' 
  | 'riding-train' 
  | 'walking-to-destination' 
  | 'at-destination'
  | 'returning-home'
  | 'completed';

export interface DailyTrip {
  originNeighborhoodId: string;
  destinationNeighborhoodId: string;
  departureTime: number; // hour of day (0-23)
  purpose: 'to-work' | 'from-work' | 'recreation' | 'to-home';
}

export interface Citizen {
  id: string;
  homeNeighborhoodId: string;
  workNeighborhoodId: string;
  shift: Shift; // [startHour, endHour]
  dailySchedule: DailyTrip[]; // planned trips for the day
  
  // Current trip state
  currentTripIndex: number; // which trip in the schedule they're on
  originNeighborhoodId: string;
  destinationNeighborhoodId: string;
  state: CitizenState;
  currentPosition: Position;
  isHappy: boolean; // true if trip time is acceptable
  tripStartTime: number; // simulation time in minutes
  tripEndTime?: number; // simulation time in minutes
  currentTrainId?: string; // if riding a train
  currentStationId?: string; // if at a station
  route?: CitizenRoute; // planned route
}

export interface CitizenRoute {
  segments: RouteSegment[];
  totalEstimatedTime: number; // in minutes
  walkingOnlyTime: number; // time if they walked the whole way
}

export type RouteSegment = WalkSegment | WaitSegment | RideSegment;

export interface WalkSegment {
  type: 'walk';
  from: Position;
  to: Position;
  distance: number; // in grid squares
  estimatedTime: number; // in minutes
}

export interface WaitSegment {
  type: 'wait';
  stationId: string;
  lineId: string;
  estimatedTime: number; // in minutes
}

export interface RideSegment {
  type: 'ride';
  lineId: string;
  lineDirection: 'forward' | 'backward';
  fromStationId: string;
  toStationId: string;
  distance: number; // in grid squares (along tracks)
  estimatedTime: number; // in minutes
}

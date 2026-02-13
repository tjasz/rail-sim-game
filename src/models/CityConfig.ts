import type { TileType } from './types';
import type { Neighborhood } from './Neighborhood';

export interface CityConfig {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  tiles: TileType[][]; // [x][y] - 'l' for land or 'w' for water
  water: string[]; // list of water SVG paths
  neighborhoods: Neighborhood[];
  
  totalTripsStartedAtTime: (elapsedMinutes: number) => number; // function that computes the total number of trips started at a given time
  activeNeighborhoodsAtTime : (elapsedMinutes: number) => number; // function that computes number of active neighborhoods at a given time
  
  // Economic settings
  initialBudget: number;
  initialEngines: number; // number of trains to start with
  initialLines: number; // number of lines to start with
  initialTrainCapacity: number; // initial capacity of trains
  reward: (dayCompleted: number) => { budgetEarned: number; enginesEarned: number; linesEarned: number; trainCapacityEarned: number }; // function that computes rewards for completing a day (0-indexed)
  
  // Transit settings
  trainSpeed: number; // grid squares per minute
  timePerStationStop: number; // minutes
  
  // Station capacity and crowding
  stationCapacity: number; // max waiting passengers before station is crowded
  stationCrowdingTimeLimit: number; // minutes a station can be crowded before game over
  
  // Construction costs
  costPerStation: number;
  costPerTrackMileLand: number;
  costPerTrackMileWater: number;
  costPerTrain: number;
}

export interface CityState {
  config: CityConfig;
  currentDay: number;
  budget: number;
}

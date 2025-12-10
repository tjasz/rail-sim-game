import type { TileType } from './types';
import type { Neighborhood } from './Neighborhood';

export interface CityConfig {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  tiles: TileType[][]; // [x][y] - 'l' for land or 'w' for water
  neighborhoods: Neighborhood[];
  
  totalTripsStartedAtTime: (elapsedMinutes: number) => number; // function that computes the total number of trips started at a given time
  activeNeighborhoodsAtTime : (elapsedMinutes: number) => number; // function that computes number of active neighborhoods at a given time
  
  // Economic settings
  initialBudget: number;
  budgetBaseline: number; // fixed amount per day
  budgetBonusPerHappyCitizen: number;
  
  // Transit settings
  walkingSpeed: number; // grid squares per minute
  trainSpeed: number; // grid squares per minute
  timePerStationStop: number; // minutes
  
  // Construction costs
  costPerStation: number;
  costPerTrackMileLand: number;
  costPerTrackMileWater: number;
  costPerTrain: number;
  trainCapacity: number;
}

export interface CityState {
  config: CityConfig;
  currentDay: number;
  budget: number;
}

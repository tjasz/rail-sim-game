import type { TileType } from './types';
import type { Neighborhood } from './Neighborhood';

export interface CityConfig {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  tiles: TileType[][]; // [x][y] - 'l' for land or 'w' for water
  neighborhoods: Neighborhood[];
  
  // Population settings
  initialPopulation: number;
  populationOnDay: (day: number) => number; // function that computes population on a given day (starting with day 0)
  
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
  population: number;
  budget: number;
}

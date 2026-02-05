import type { CityState } from './CityConfig';
import type { RailNetwork } from './RailNetwork';
import type { TripMatrix } from './TripMatrix';
import type { Citizen } from './Citizen';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'game-over' | 'victory';

export interface GameState {
  status: GameStatus;
  city: CityState;
  railNetwork: RailNetwork;
  currentTripMatrix?: TripMatrix;
  citizens: Map<string, Citizen>;
  
  // Day simulation
  isSimulating: boolean;
  simulationTime: number; // total minutes elapsed since game start
  simulationSpeed: number; // multiplier for simulation speed
  
  // Neighborhood activation
  activeNeighborhoodCount: number; // number of neighborhoods currently active
  
  // Trip generation
  totalTripsStarted: number;
  
  // Statistics
  stats: GameStats;
}

export interface GameStats {
  totalCitizensTransported: number;
  
  // Financial
  totalMoneySpent: number;
  totalMoneyEarned: number;
  
  // Network stats
  totalStationsBuilt: number;
  totalTrainsPurchased: number;
}

export interface DayResult {
  day: number;
  budgetEarned: number;
}

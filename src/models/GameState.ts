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
  nextTripGenerationTime: number; // simulation time in minutes when next trip should be generated
  tripGenerationInterval: number; // minutes between trip generations
  tripsGeneratedToday: number; // count of trips generated in current day
  
  // Statistics
  stats: GameStats;
}

export interface GameStats {
  totalDaysPlayed: number;
  totalCitizensTransported: number;
  totalHappyCitizens: number;
  totalUnhappyCitizens: number;
  currentDayHappyCitizens: number;
  currentDayUnhappyCitizens: number;
  happinessRate: number; // percentage (0-100)
  
  // Financial
  totalMoneySpent: number;
  totalMoneyEarned: number;
  
  // Network stats
  totalStationsBuilt: number;
  totalTrackMilesBuilt: number;
  totalTrainsPurchased: number;
}

export interface DayResult {
  day: number;
  totalCitizens: number;
  happyCitizens: number;
  unhappyCitizens: number;
  happinessRate: number;
  budgetEarned: number;
  passed: boolean; // true if > 50% happy
}

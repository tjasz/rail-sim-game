import { Game } from './Game';
import type { GameState } from './models';
import { initializeDay } from './utils';
import './App.css';

// Base game configuration (without citizens - they'll be generated)
const baseGameState: GameState = {
  status: 'playing',
  city: {
    config: {
      id: 'seattle',
      name: 'Seattle',
      gridWidth: 20,
      gridHeight: 20,
      tiles: [
        ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'l', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w'],
        ['w', 'w', 'w', 'w', 'w', 'w', 'w', 'l', 'l', 'w', 'w', 'w', 'w', 'l', 'w', 'w', 'w', 'w', 'w', 'w'],
        ['l', 'w', 'w', 'w', 'l', 'l', 'l', 'l', 'l', 'l', 'w', 'w', 'l', 'l', 'l', 'l', 'l', 'l', 'w', 'w'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'w', 'w', 'w', 'l', 'l', 'l', 'l', 'l', 'l', 'w'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'w', 'l', 'l', 'l', 'l', 'w', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'w', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'w', 'l', 'l', 'w', 'w', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'w', 'w', 'w', 'w', 'w', 'l', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'w', 'w', 'w', 'w', 'l', 'l', 'w', 'l', 'l', 'w', 'w', 'w', 'w', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'w', 'w', 'l', 'l', 'l', 'w', 'w', 'l', 'l', 'l', 'w', 'w', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'w', 'w', 'w', 'w', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'w', 'w', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'w', 'w', 'w', 'w', 'w', 'w', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
        ['l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l'],
      ],
      neighborhoods: [
        {
          id: 'downtown',
          name: 'Downtown',
          position: { x: 2, y: 0 },
          icon: 'temaki-briefcase',
          color: '#e74c3c',
          residents: 5,
          proportionOfJobs: 0.60, // 60% of city jobs
          availableShifts: [[8, 17], [9, 18]], // Retail hours
          proportionOfRecreationalDemand: 0.2, // 20% of recreational trips
          activationOrder: 1, // Active from day 0
        },
        {
          id: 'commercial-a',
          name: 'Commercial A',
          position: { x: 0, y: 1 },
          icon: 'shop',
          color: '#3498db',
          residents: 10,
          proportionOfJobs: 0.15, // 15% of city jobs
          availableShifts: [[9, 21], [10, 22]], // Retail hours
          proportionOfRecreationalDemand: 0.4, // 40% of recreational trips
          activationOrder: 2, // Active from day 0
        },
        {
          id: 'commercial-b',
          name: 'Commercial B',
          position: { x: 9, y: 2 },
          icon: 'shop',
          color: '#3498db',
          residents: 8,
          proportionOfJobs: 0.15, // 15% of city jobs
          availableShifts: [[9, 21], [10, 22]], // Retail hours
          proportionOfRecreationalDemand: 0.3, // 30% of recreational trips
          activationOrder: 4, // Active from day 1
        },
        {
          id: 'residential-1',
          name: 'Residential 1',
          position: { x: 4, y: 1 },
          icon: 'home',
          color: '#2ecc71',
          residents: 30,
          proportionOfJobs: 0.05, // 5% of city jobs (small businesses)
          availableShifts: [[8, 17]], // Standard hours
          proportionOfRecreationalDemand: 0.0, // No recreational demand
          activationOrder: 3, // Active from day 0
        },
        {
          id: 'residential-2',
          name: 'Residential 2',
          position: { x: 0, y: 4 },
          icon: 'home',
          color: '#f39c12',
          residents: 25,
          proportionOfJobs: 0.05, // 5% of city jobs
          availableShifts: [[8, 17]],
          proportionOfRecreationalDemand: 0.0,
          activationOrder: 5, // Active from day 2
        },
        {
          id: 'residential-3',
          name: 'Residential 3',
          position: { x: 4, y: 4 },
          icon: 'home',
          color: '#9b59b6',
          residents: 20,
          proportionOfJobs: 0.05, // 5% of city jobs
          availableShifts: [[8, 17]],
          proportionOfRecreationalDemand: 0.0,
          activationOrder: 6, // Active from day 3
        },
        {
          id: 'residential-4',
          name: 'Residential 4',
          position: { x: 7, y: 3 },
          icon: 'home',
          color: '#9b59b6',
          residents: 22,
          proportionOfJobs: 0.05, // 5% of city jobs
          availableShifts: [[8, 17]],
          proportionOfRecreationalDemand: 0.0,
          activationOrder: 7, // Active from day 4
        },
      ],
      
      initialPopulation: 100,
      populationGrowthRate: 0.05,
      initialBudget: 10000,
      budgetBaseline: 1000,
      budgetBonusPerHappyCitizen: 10,
      walkingSpeed: 0.05,
      trainSpeed: 0.15,
      timePerStationStop: 1,
      costPerStation: 1000,
      costPerTrackMileLand: 500,
      costPerTrackMileWater: 1000,
      costPerTrain: 2000,
      trainCapacity: 50,
    },
    currentMonth: 1,
    currentDay: 0,
    population: 45, // Initial: downtown (5) + commercial-a (10) + residential-1 (30) on day 0
    budget: 8500,
  },
  railNetwork: {
    stations: new Map([
      [
        'station-1',
        {
          id: 'station-1',
          neighborhoodId: 'commercial-a',
          position: { x: 0, y: 1 },
          lineIds: ['line-1'],
          waitingCitizens: new Map([['line-1', ['citizen-1', 'citizen-2']]]),
        },
      ],
      [
        'station-2',
        {
          id: 'station-2',
          neighborhoodId: 'downtown',
          position: { x: 2, y: 0 },
          lineIds: ['line-1', 'line-2'],
          waitingCitizens: new Map(),
        },
      ],
      [
        'station-3',
        {
          id: 'station-3',
          neighborhoodId: 'residential-1',
          position: { x: 4, y: 1 },
          lineIds: ['line-1'],
          waitingCitizens: new Map(),
        },
      ],
      [
        'station-4',
        {
          id: 'station-4',
          neighborhoodId: 'commercial-b',
          position: { x: 9, y: 2 },
          lineIds: ['line-1'],
          waitingCitizens: new Map(),
        },
      ],
      [
        'station-5',
        {
          id: 'station-5',
          neighborhoodId: 'south',
          position: { x: 2, y: 4 },
          lineIds: ['line-2'],
          waitingCitizens: new Map(),
        },
      ],
    ]),
    tracks: new Map([
      [
        'track-1',
        {
          id: 'track-1',
          from: { x: 0, y: 1 },
          to: { x: 1, y: 0 },
          distance: 1.414,
          isOverWater: false,
          cost: 1414,
          lineIds: ['line-1'],
        },
      ],
      [
        'track-2',
        {
          id: 'track-2',
          from: { x: 1, y: 0 },
          to: { x: 2, y: 0 },
          distance: 1,
          isOverWater: false,
          cost: 1414,
          lineIds: ['line-1'],
        },
      ],
      [
        'track-2b',
        {
          id: 'track-2',
          from: { x: 2, y: 0 },
          to: { x: 3, y: 0 },
          distance: 1,
          isOverWater: false,
          cost: 1414,
          lineIds: ['line-1'],
        },
      ],
      [
        'track-3',
        {
          id: 'track-3',
          from: { x: 3, y: 0 },
          to: { x: 4, y: 1 },
          distance: 1.414,
          isOverWater: false,
          cost: 1414,
          lineIds: ['line-1'],
        },
      ],
      [
        'track-3b',
        {
          id: 'track-3b',
          from: { x: 4, y: 1 },
          to: { x: 5, y: 2 },
          distance: 1.414,
          isOverWater: false,
          cost: 1414,
          lineIds: ['line-1'],
        },
      ],
      [
        'track-4',
        {
          id: 'track-4',
          from: { x: 5, y: 2 },
          to: { x: 9, y: 2 },
          distance: 4,
          isOverWater: false,
          cost: 1414,
          lineIds: ['line-1'],
        },
      ],
      [
        'track-5',
        {
          id: 'track-5',
          from: { x: 2, y: 0 },
          to: { x: 2, y: 4 },
          distance: 4,
          isOverWater: true,
          cost: 4000,
          lineIds: ['line-2'],
        },
      ],
    ]),
    lines: new Map([
      [
        'line-1',
        {
          id: 'line-1',
          name: 'Red Line',
          color: '#e74c3c',
          stationIds: ['station-1', 'station-2', 'station-3', 'station-4'],
          trainIds: ['train-1', 'train-2'],
          isActive: true,
        },
      ],
      [
        'line-2',
        {
          id: 'line-2',
          name: 'Green Line',
          color: '#27ae60',
          stationIds: ['station-2', 'station-5'],
          trainIds: ['train-3'],
          isActive: true,
        },
      ],
    ]),
    trains: new Map([
      [
        'train-1',
        {
          id: 'train-1',
          lineId: 'line-1',
          currentStationIndex: 0,
          direction: 'forward',
          position: { x: 0, y: 0 }, // Will be set by initializeDay
          passengerIds: [],
          capacity: 10,
          speed: 0.15,
          nextStationArrivalTime: 0,
        },
      ],
      [
        'train-2',
        {
          id: 'train-2',
          lineId: 'line-1',
          currentStationIndex: 3,
          direction: 'backward',
          position: { x: 0, y: 0 }, // Will be set by initializeDay
          passengerIds: [],
          capacity: 10,
          speed: 0.15,
          nextStationArrivalTime: 0,
        },
      ],
      [
        'train-3',
        {
          id: 'train-3',
          lineId: 'line-2',
          currentStationIndex: 1,
          direction: 'backward',
          position: { x: 0, y: 0 }, // Will be set by initializeDay
          passengerIds: [],
          capacity: 10,
          speed: 0.15,
          nextStationArrivalTime: 0,
        },
      ],
    ]),
  },
  currentTripMatrix: undefined, // Will be populated by initializeDay
  citizens: new Map(), // Will be populated by initializeDay
  isSimulating: false,
  simulationTime: 0,
  simulationSpeed: 1,
  stats: {
    totalDaysPlayed: 0,
    totalCitizensTransported: 0,
    totalHappyCitizens: 0,
    totalUnhappyCitizens: 0,
    currentDayHappyCitizens: 0,
    currentDayUnhappyCitizens: 0,
    happinessRate: 0,
    totalMoneySpent: 0,
    totalMoneyEarned: 0,
    totalStationsBuilt: 2,
    totalTrackMilesBuilt: 2.24,
    totalTrainsPurchased: 1,
  },
};

function App() {
  // Initialize the first day with citizens and positioned trains
  const { tripMatrix, citizens, updatedNetwork } = initializeDay(
    baseGameState.city.config,
    baseGameState.city.currentDay,
    baseGameState.railNetwork,
  );
  
  const gameState = {
    ...baseGameState,
    currentTripMatrix: tripMatrix,
    citizens,
    railNetwork: updatedNetwork,
  };

  return <Game gameState={gameState} />;
}

export default App;

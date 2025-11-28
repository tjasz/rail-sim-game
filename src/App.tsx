import { Game } from './Game';
import type { GameState } from './models';
import { initializeDay } from './utils';
import './App.css';

// Base game configuration (without citizens - they'll be generated)
const baseGameState: GameState = {
  status: 'playing',
  city: {
    config: {
      id: 'demo-city',
      name: 'Demo City',
      gridWidth: 5,
      gridHeight: 5,
      tiles: [
        ['land', 'land', 'land', 'land', 'land'],
        ['land', 'land', 'water', 'land', 'land'],
        ['land', 'water', 'water', 'water', 'land'],
        ['land', 'land', 'water', 'land', 'land'],
        ['land', 'land', 'land', 'land', 'land'],
      ],
      neighborhoods: [
        {
          id: 'downtown',
          name: 'Downtown',
          position: { x: 2, y: 0 },
          icon: 'building',
          color: '#e74c3c',
          originDemandPercent: 0,
          destinationDemandPercent: 40,
        },
        {
          id: 'commercial-a',
          name: 'Commercial A',
          position: { x: 0, y: 1 },
          icon: 'shop',
          color: '#3498db',
          originDemandPercent: 10,
          destinationDemandPercent: 20,
        },
        {
          id: 'residential-1',
          name: 'Residential 1',
          position: { x: 4, y: 1 },
          icon: 'home',
          color: '#2ecc71',
          originDemandPercent: 40,
          destinationDemandPercent: 5,
        },
        {
          id: 'residential-2',
          name: 'Residential 2',
          position: { x: 0, y: 4 },
          icon: 'home',
          color: '#f39c12',
          originDemandPercent: 30,
          destinationDemandPercent: 5,
        },
        {
          id: 'residential-3',
          name: 'Residential 3',
          position: { x: 4, y: 4 },
          icon: 'home',
          color: '#9b59b6',
          originDemandPercent: 20,
          destinationDemandPercent: 25,
        },
      ],
      initialPopulation: 100,
      populationGrowthRate: 0.05,
      initialBudget: 10000,
      budgetBaseline: 1000,
      budgetBonusPerHappyCitizen: 10,
      walkingSpeed: 2,
      trainSpeed: 10,
      timePerStationStop: 1,
      costPerStation: 1000,
      costPerTrackMileLand: 500,
      costPerTrackMileWater: 1000,
      costPerTrain: 2000,
      trainCapacity: 50,
    },
    currentMonth: 1,
    currentDay: 3,
    population: 100,
    budget: 8500,
  },
  railNetwork: {
    stations: new Map([
      [
        'station-1',
        {
          id: 'station-1',
          neighborhoodId: 'downtown',
          position: { x: 2, y: 0 },
          lineIds: ['line-1'],
          waitingCitizens: new Map([['line-1', ['citizen-1', 'citizen-2']]]),
        },
      ],
      [
        'station-2',
        {
          id: 'station-2',
          neighborhoodId: 'residential-1',
          position: { x: 4, y: 1 },
          lineIds: ['line-1'],
          waitingCitizens: new Map(),
        },
      ],
      [
        'station-3',
        {
          id: 'station-3',
          neighborhoodId: 'residential-3',
          position: { x: 4, y: 4 },
          lineIds: ['line-1'],
          waitingCitizens: new Map(),
        },
      ],
    ]),
    tracks: new Map([
      [
        'track-1',
        {
          id: 'track-1',
          from: { x: 2, y: 0 },
          to: { x: 4, y: 1 },
          distance: 2.24,
          isOverWater: false,
          cost: 1120,
          lineIds: ['line-1'],
        },
      ],
      [
        'track-2',
        {
          id: 'track-2',
          from: { x: 4, y: 1 },
          to: { x: 4, y: 4 },
          distance: 3.0,
          isOverWater: false,
          cost: 1500,
          lineIds: ['line-1'],
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
          stationIds: ['station-1', 'station-2', 'station-3'],
          trainIds: ['train-1'],
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
          capacity: 50,
          speed: 10,
          nextStationArrivalTime: 0,
        },
      ],
    ]),
  },
  currentTripMatrix: undefined,
  citizens: new Map(), // Will be populated by initializeDay
  isSimulating: false,
  simulationTime: 480, // 8:00 AM
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
    baseGameState.city.population,
    baseGameState.city.currentDay,
    baseGameState.railNetwork,
    480 // 8:00 AM
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

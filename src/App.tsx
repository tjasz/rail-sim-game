import { Game } from './Game';
import type { GameState } from './models';
import './App.css';

// Mock game state for demonstration
const initialGameState: GameState = {
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
          originDemandPercent: 0,
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
          destinationDemandPercent: 5,
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
    ]),
    lines: new Map([
      [
        'line-1',
        {
          id: 'line-1',
          name: 'Red Line',
          color: '#e74c3c',
          stationIds: ['station-1', 'station-2'],
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
          passengerIds: ['citizen-3', 'citizen-4'],
          capacity: 50,
          speed: 10,
          nextStationArrivalTime: 125,
        },
      ],
    ]),
  },
  currentTripMatrix: undefined,
  citizens: new Map([
    [
      'citizen-1',
      {
        id: 'citizen-1',
        originNeighborhoodId: 'residential-1',
        destinationNeighborhoodId: 'downtown',
        state: 'waiting-at-station',
        currentPosition: { x: 4, y: 1 },
        isHappy: true,
        tripStartTime: 100,
        currentStationId: 'station-2',
      },
    ],
    [
      'citizen-2',
      {
        id: 'citizen-2',
        originNeighborhoodId: 'residential-2',
        destinationNeighborhoodId: 'downtown',
        state: 'walking-to-station',
        currentPosition: { x: 1, y: 3 },
        isHappy: true,
        tripStartTime: 95,
      },
    ],
    [
      'citizen-3',
      {
        id: 'citizen-3',
        originNeighborhoodId: 'residential-1',
        destinationNeighborhoodId: 'commercial-a',
        state: 'riding-train',
        currentPosition: { x: 2, y: 0 },
        isHappy: true,
        tripStartTime: 80,
        currentTrainId: 'train-1',
      },
    ],
  ]),
  isSimulating: false,
  simulationTime: 480, // Start at 8:00 AM
  simulationSpeed: 1,
  stats: {
    totalDaysPlayed: 2,
    totalCitizensTransported: 156,
    totalHappyCitizens: 134,
    totalUnhappyCitizens: 22,
    currentDayHappyCitizens: 2,
    currentDayUnhappyCitizens: 1,
    happinessRate: 66.7,
    totalMoneySpent: 4500,
    totalMoneyEarned: 3000,
    totalStationsBuilt: 2,
    totalTrackMilesBuilt: 2.24,
    totalTrainsPurchased: 1,
  },
};

function App() {
  return <Game gameState={initialGameState} />;
}

export default App;

import { describe, it, expect } from '@jest/globals';
import type { CityConfig, RailNetwork, Line } from '../models';
import { buildCityGraph } from './pathfinding';

// Import the test data structure from App.tsx
const testCityConfig: CityConfig = {
  id: 'demo-city',
  name: 'Demo City',
  gridWidth: 10,
  gridHeight: 5,
  tiles: [
    ['l', 'l', 'w', 'l', 'l'],
    ['l', 'l', 'w', 'l', 'l'],
    ['l', 'w', 'w', 'w', 'l'],
    ['l', 'l', 'w', 'l', 'l'],
    ['l', 'l', 'l', 'l', 'l'],
    ['l', 'l', 'l', 'l', 'l'],
    ['l', 'l', 'l', 'l', 'l'],
    ['l', 'l', 'l', 'l', 'l'],
    ['l', 'l', 'l', 'l', 'l'],
    ['l', 'l', 'l', 'l', 'l'],
  ],
  neighborhoods: [
    {
      id: 'downtown',
      name: 'Downtown',
      position: { x: 2, y: 0 },
      icon: 'building',
      color: '#e74c3c',
      residents: 5,
      proportionOfJobs: 0.5,
      availableShifts: [[8, 17]],
      recreationalDemandCoefficient: 1,
    },
    {
      id: 'commercial-a',
      name: 'Commercial A',
      position: { x: 0, y: 1 },
      icon: 'shop',
      color: '#3498db',
      residents: 10,
      proportionOfJobs: 0.15,
      availableShifts: [[9, 21]],
      recreationalDemandCoefficient: 1,
    },
    {
      id: 'commercial-b',
      name: 'Commercial B',
      position: { x: 9, y: 2 },
      icon: 'shop',
      color: '#3498db',
      residents: 8,
      proportionOfJobs: 0.15,
      availableShifts: [[9, 21]],
      recreationalDemandCoefficient: 1,
    },
    {
      id: 'residential-1',
      name: 'Residential 1',
      position: { x: 4, y: 1 },
      icon: 'home',
      color: '#2ecc71',
      residents: 30,
      proportionOfJobs: 0.05,
      availableShifts: [[8, 17]],
      recreationalDemandCoefficient: 1,
    },
    {
      id: 'residential-2',
      name: 'Residential 2',
      position: { x: 0, y: 4 },
      icon: 'home',
      color: '#f39c12',
      residents: 25,
      proportionOfJobs: 0.05,
      availableShifts: [[8, 17]],
      recreationalDemandCoefficient: 1,
    },
    {
      id: 'residential-3',
      name: 'Residential 3',
      position: { x: 4, y: 4 },
      icon: 'home',
      color: '#9b59b6',
      residents: 20,
      proportionOfJobs: 0.05,
      availableShifts: [[8, 17]],
      recreationalDemandCoefficient: 1,
    },
    {
      id: 'residential-4',
      name: 'Residential 4',
      position: { x: 7, y: 3 },
      icon: 'home',
      color: '#9b59b6',
      residents: 22,
      proportionOfJobs: 0.05,
      availableShifts: [[8, 17]],
      recreationalDemandCoefficient: 1,
    },
  ],
  // Total number of trips grows quadratically, so that trips per day grows linearly
  totalTripsStartedAtTime: (elapsedMinutes: number) => {
    // 50 trips at the first 300 minutes
    // 200 trips at 600 minutes
    // 450 trips at 900 minutes
    // 800 trips at 1200 minutes
    return elapsedMinutes * elapsedMinutes / 90000 * 50;
  },
  activeNeighborhoodsAtTime : (elapsedMinutes: number) => Math.min(3 + Math.floor(elapsedMinutes / 300), 400),
  initialBudget: 10000,
  budgetBaseline: 1000,
  trainSpeed: 0.15,
  timePerStationStop: 1,
  costPerStation: 1000,
  costPerTrackMileLand: 500,
  costPerTrackMileWater: 1000,
  costPerTrain: 2000,
  trainCapacity: 50,
};

const testRailNetwork: RailNetwork = {
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
  lines: new Map<string, Line>([
    [
      'line-1',
      {
        id: 'line-1',
        name: 'Red Line',
        color: '#e74c3c',
        neighborhoodIds: ['commercial-a', 'downtown', 'residential-1', 'commercial-b'],
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
        neighborhoodIds: ['downtown', 'south'],
        trainIds: ['train-3'],
        isActive: true,
      },
    ],
  ]),
  trains: new Map(),
};

describe('buildCityGraph', () => {
  const trainSpeed = 0.15;
  const stopTimePerStation = 1;

  describe('Graph Construction', () => {

    it('should create nodes for stations even if on w tiles', () => {
      const graph = buildCityGraph(
        testRailNetwork,
        testCityConfig.neighborhoods,
        trainSpeed,
        stopTimePerStation
      );

      // Position (2, 0) is w but has station-2
      // The function still creates a node for stations on w (for train connectivity)
      const edges = graph.get('2,0');
      expect(edges).toBeDefined();
      
      // But verify that pure w tiles without stations have no nodes
      // Position (2, 2) is w and has no station
      const pureWaterEdges = graph.get('2,2');
      expect(pureWaterEdges).toBeUndefined();
    });
  });
});

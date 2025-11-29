import { describe, it, expect } from '@jest/globals';
import type { CityConfig, RailNetwork, Station, Line } from '../models';
import { buildCityGraph } from './pathfinding';

// Import the test data structure from App.tsx
const testCityConfig: CityConfig = {
  id: 'demo-city',
  name: 'Demo City',
  gridWidth: 10,
  gridHeight: 5,
  tiles: [
    ['land', 'land', 'water', 'land', 'land'],
    ['land', 'land', 'water', 'land', 'land'],
    ['land', 'water', 'water', 'water', 'land'],
    ['land', 'land', 'water', 'land', 'land'],
    ['land', 'land', 'land', 'land', 'land'],
    ['land', 'land', 'land', 'land', 'land'],
    ['land', 'land', 'land', 'land', 'land'],
    ['land', 'land', 'land', 'land', 'land'],
    ['land', 'land', 'land', 'land', 'land'],
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
      id: 'commercial-b',
      name: 'Commercial B',
      position: { x: 9, y: 2 },
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
    {
      id: 'residential-4',
      name: 'Residential 4',
      position: { x: 7, y: 3 },
      icon: 'home',
      color: '#9b59b6',
      originDemandPercent: 10,
      destinationDemandPercent: 5,
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
};

const testRailNetwork: RailNetwork = {
  stations: new Map<string, Station>([
    [
      'station-1',
      {
        id: 'station-1',
        neighborhoodId: 'commercial-a',
        position: { x: 0, y: 1 },
        lineIds: ['line-1'],
        waitingCitizens: new Map(),
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
        to: { x: 3, y: 0 },
        distance: 2,
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
        to: { x: 5, y: 2 },
        distance: 2.828,
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
  trains: new Map(),
};

describe('buildCityGraph', () => {
  const walkingSpeed = 0.05;
  const trainSpeed = 0.15;
  const stopTimePerStation = 1;

  describe('Graph Construction', () => {
    it('should create a graph with nodes for all land tiles', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Count expected land tiles
      let expectedLandTiles = 0;
      for (let x = 0; x < testCityConfig.gridWidth; x++) {
        for (let y = 0; y < testCityConfig.gridHeight; y++) {
          if (testCityConfig.tiles[x][y] === 'land') {
            expectedLandTiles++;
          }
        }
      }

      // Graph should have at least as many nodes as land tiles
      expect(graph.size).toBeGreaterThanOrEqual(expectedLandTiles);
    });

    it('should create walking edges between adjacent land tiles', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Test a land tile at (0, 0)
      const edges = graph.get('0,0');
      expect(edges).toBeDefined();
      expect(edges!.length).toBeGreaterThan(0);

      // Should have walking edges to adjacent land tiles
      const hasWalkingEdges = edges!.some(edge => !edge.stationId);
      expect(hasWalkingEdges).toBe(true);
    });

    it('should not create walking edges to water tiles', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Position (1, 1) is land and adjacent to water at (2, 1)
      const edges = graph.get('1,1');
      expect(edges).toBeDefined();

      // Check that no walking edge goes to the water tile at (2, 1)
      const hasWalkingEdgeToWater = edges!.some(
        edge => edge.position.x === 2 && edge.position.y === 1 && !edge.stationId
      );
      expect(hasWalkingEdgeToWater).toBe(false);
    });

    it('should create edges for all 8 directions including diagonals', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Position (5, 3) is surrounded by land tiles
      const edges = graph.get('5,3');
      expect(edges).toBeDefined();

      // Should have walking edges in all 8 directions
      const walkingEdges = edges!.filter(edge => !edge.stationId);
      expect(walkingEdges.length).toBe(8);
    });

    it('should create nodes for stations even if on water tiles', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Position (2, 0) is water but has station-2
      // The function still creates a node for stations on water (for train connectivity)
      const edges = graph.get('2,0');
      expect(edges).toBeDefined();
      
      // But verify that pure water tiles without stations have no nodes
      // Position (2, 2) is water and has no station
      const pureWaterEdges = graph.get('2,2');
      expect(pureWaterEdges).toBeUndefined();
    });
  });

  describe('Graph Edge Costs', () => {
    it('should calculate correct walking costs based on distance and speed', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Get edges from (0, 0)
      const edges = graph.get('0,0');
      expect(edges).toBeDefined();

      // Find horizontal edge (to 1,0)
      const horizontalEdge = edges!.find(
        e => e.position.x === 1 && e.position.y === 0 && !e.stationId
      );
      expect(horizontalEdge).toBeDefined();
      // Cost = distance / speed = 1 / 0.05 = 20 minutes
      expect(horizontalEdge!.cost).toBeCloseTo(20, 1);

      // Find diagonal edge (to 1,1)
      const diagonalEdge = edges!.find(
        e => e.position.x === 1 && e.position.y === 1 && !e.stationId
      );
      expect(diagonalEdge).toBeDefined();
      // Cost = sqrt(2) / 0.05 ≈ 28.28 minutes
      expect(diagonalEdge!.cost).toBeCloseTo(28.28, 1);
    });

    it('should create train edges between stations on the same line', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Station 1 is at (0, 1) and should have train edges to other stations on line-1
      const station1Edges = graph.get('0,1');
      expect(station1Edges).toBeDefined();

      // Should have edges to station-2, station-3, and station-4
      const trainEdges = station1Edges!.filter(e => e.stationId);
      expect(trainEdges.length).toBeGreaterThan(0);

      // Check that we have an edge to station-2 at (2, 0)
      const edgeToStation2 = trainEdges.find(
        e => e.position.x === 2 && e.position.y === 0
      );
      expect(edgeToStation2).toBeDefined();
      expect(edgeToStation2!.stationId).toBe('station-2');
      expect(edgeToStation2!.lineId).toBe('line-1');
    });

    it('should include stop time in train cost calculation', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Get train edges from station-1
      const station1Edges = graph.get('0,1');
      const trainEdges = station1Edges!.filter(e => e.stationId);

      // Edge from station-1 to station-4 should include stops at station-2 and station-3
      const edgeToStation4 = trainEdges.find(e => e.stationId === 'station-4');
      expect(edgeToStation4).toBeDefined();

      // Cost should include 2 intermediate stops (2 minutes) plus travel time
      // The cost should be greater than just travel time
      expect(edgeToStation4!.cost).toBeGreaterThan(2);
    });
  });

  describe('Graph Size and Completeness', () => {
    it('should create nodes for all land tiles', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Count land tiles in the config
      let landCount = 0;
      for (let x = 0; x < testCityConfig.gridWidth; x++) {
        for (let y = 0; y < testCityConfig.gridHeight; y++) {
          if (testCityConfig.tiles[x][y] === 'land') {
            landCount++;
          }
        }
      }

      // Graph should have exactly as many nodes as land tiles
      expect(graph.size).toBe(landCount);
      expect(landCount).toBeLessThan(50); // Not all tiles are land
    });

    it('should skip water tiles when building the graph', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Check that water tiles are not in the graph
      for (let x = 0; x < testCityConfig.gridWidth; x++) {
        for (let y = 0; y < testCityConfig.gridHeight; y++) {
          if (testCityConfig.tiles[x][y] === 'water') {
            const key = `${x},${y}`;
            expect(graph.has(key)).toBe(false);
          }
        }
      }
    });
  });

  describe('Station Connectivity', () => {
    it('should connect all stations on line-1 bidirectionally', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Each station should have edges to all other stations on the line
      const line1Stations = ['station-1', 'station-2', 'station-3', 'station-4'];
      const line1Positions = line1Stations.map(
        id => testRailNetwork.stations.get(id)!.position
      );

      for (let i = 0; i < line1Positions.length; i++) {
        const pos = line1Positions[i];
        const key = `${pos.x},${pos.y}`;
        const edges = graph.get(key);
        expect(edges).toBeDefined();

        const trainEdges = edges!.filter(e => e.lineId === 'line-1');
        // Should have edges to the other 3 stations
        expect(trainEdges.length).toBe(3);
      }
    });

    it('should connect stations on line-2', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Station 2 should have an edge to station 5 on line-2
      const station2Pos = testRailNetwork.stations.get('station-2')!.position;
      const key = `${station2Pos.x},${station2Pos.y}`;
      const edges = graph.get(key);
      expect(edges).toBeDefined();

      const line2Edge = edges!.find(e => e.lineId === 'line-2');
      expect(line2Edge).toBeDefined();
      expect(line2Edge!.stationId).toBe('station-5');
    });

    it('should create separate edges for different lines at transfer stations', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Station 2 is on both line-1 and line-2
      const station2Pos = testRailNetwork.stations.get('station-2')!.position;
      const key = `${station2Pos.x},${station2Pos.y}`;
      const edges = graph.get(key);
      expect(edges).toBeDefined();

      const line1Edges = edges!.filter(e => e.lineId === 'line-1');
      const line2Edges = edges!.filter(e => e.lineId === 'line-2');

      // Should have 3 edges for line-1 (to other 3 stations)
      expect(line1Edges.length).toBe(3);
      // Should have 1 edge for line-2 (to station-5)
      expect(line2Edges.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty rail network', () => {
      const emptyNetwork: RailNetwork = {
        stations: new Map(),
        tracks: new Map(),
        lines: new Map(),
        trains: new Map(),
      };

      const graph = buildCityGraph(
        testCityConfig,
        emptyNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Should still create walking edges for land tiles
      expect(graph.size).toBeGreaterThan(0);

      // But no train edges
      const allEdges = Array.from(graph.values()).flat();
      const trainEdges = allEdges.filter(e => e.stationId);
      expect(trainEdges.length).toBe(0);
    });

    it('should skip inactive lines', () => {
      const networkWithInactiveLine: RailNetwork = {
        ...testRailNetwork,
        lines: new Map([
          [
            'inactive-line',
            {
              id: 'inactive-line',
              name: 'Inactive',
              color: '#000000',
              stationIds: ['station-1', 'station-2'],
              trainIds: [],
              isActive: false,
            },
          ],
        ]),
      };

      const graph = buildCityGraph(
        testCityConfig,
        networkWithInactiveLine,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Should not have edges for the inactive line
      const allEdges = Array.from(graph.values()).flat();
      const inactiveLineEdges = allEdges.filter(e => e.lineId === 'inactive-line');
      expect(inactiveLineEdges.length).toBe(0);
    });

    it('should not create train edges for lines with only one station', () => {
      const networkWithSingleStationLine: RailNetwork = {
        ...testRailNetwork,
        lines: new Map([
          [
            'single-station',
            {
              id: 'single-station',
              name: 'Single',
              color: '#000000',
              stationIds: ['station-1'],
              trainIds: [],
              isActive: true,
            },
          ],
        ]),
      };

      const graph = buildCityGraph(
        testCityConfig,
        networkWithSingleStationLine,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Station 1 should only have walking edges, no train edges for single-station line
      const station1Pos = testRailNetwork.stations.get('station-1')!.position;
      const key = `${station1Pos.x},${station1Pos.y}`;
      const edges = graph.get(key);
      expect(edges).toBeDefined();

      const singleLineEdges = edges!.filter(e => e.lineId === 'single-station');
      expect(singleLineEdges.length).toBe(0);
    });

    it('should handle boundary tiles correctly', () => {
      const graph = buildCityGraph(
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Corner tile at (0, 0) should only have edges to valid neighbors
      const cornerEdges = graph.get('0,0');
      expect(cornerEdges).toBeDefined();

      // All edges should be within bounds
      for (const edge of cornerEdges!) {
        expect(edge.position.x).toBeGreaterThanOrEqual(0);
        expect(edge.position.x).toBeLessThan(testCityConfig.gridWidth);
        expect(edge.position.y).toBeGreaterThanOrEqual(0);
        expect(edge.position.y).toBeLessThan(testCityConfig.gridHeight);
      }
    });
  });
});

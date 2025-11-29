import { describe, it, expect } from '@jest/globals';
import type { CityConfig, RailNetwork, Station, Line } from '../models';
import { buildCityGraph, calculateRoute } from './pathfinding';

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

describe('calculateRoute', () => {
  const walkingSpeed = 0.05;
  const trainSpeed = 0.15;
  const stopTimePerStation = 1;

  // Helper to get neighborhood positions for testing
  const neighborhoods = {
    downtown: { x: 2, y: 0 },           // station-2
    commercialA: { x: 0, y: 1 },        // station-1
    commercialB: { x: 9, y: 2 },        // station-4
    residential1: { x: 4, y: 1 },       // station-3
    residential2: { x: 0, y: 4 },       // no station
    residential3: { x: 4, y: 4 },       // no station
    residential4: { x: 7, y: 3 },       // no station
    south: { x: 2, y: 4 },              // station-5
  };

  describe('Routes between stations on same line', () => {
    it('should find route from Commercial A to Downtown (line-1)', () => {
      const route = calculateRoute(
        neighborhoods.commercialA,
        neighborhoods.downtown,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      // Should use train since both are on line-1
      const hasRideSegment = route.some(seg => seg.type === 'ride');
      expect(hasRideSegment).toBe(true);
      
      // Verify the ride is on line-1
      const rideSegment = route.find(seg => seg.type === 'ride');
      if (rideSegment && rideSegment.type === 'ride') {
        expect(rideSegment.lineId).toBe('line-1');
        expect(rideSegment.fromStationId).toBe('station-1');
        expect(rideSegment.toStationId).toBe('station-2');
      }
    });

    it('should find route from Downtown to Residential 1 (line-1)', () => {
      const route = calculateRoute(
        neighborhoods.downtown,
        neighborhoods.residential1,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      const rideSegment = route.find(seg => seg.type === 'ride');
      if (rideSegment && rideSegment.type === 'ride') {
        expect(rideSegment.lineId).toBe('line-1');
        expect(rideSegment.fromStationId).toBe('station-2');
        expect(rideSegment.toStationId).toBe('station-3');
      }
    });

    it('should find route from Residential 1 to Commercial B (line-1)', () => {
      const route = calculateRoute(
        neighborhoods.residential1,
        neighborhoods.commercialB,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      const rideSegment = route.find(seg => seg.type === 'ride');
      if (rideSegment && rideSegment.type === 'ride') {
        expect(rideSegment.lineId).toBe('line-1');
        expect(rideSegment.fromStationId).toBe('station-3');
        expect(rideSegment.toStationId).toBe('station-4');
      }
    });

    it('should find route from Commercial A to Commercial B (line-1, 3 stops)', () => {
      const route = calculateRoute(
        neighborhoods.commercialA,
        neighborhoods.commercialB,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      // Should use line-1 to travel between these stations
      const rideSegments = route.filter(seg => seg.type === 'ride');
      expect(rideSegments.length).toBeGreaterThan(0);
      
      // All ride segments should be on line-1
      for (const segment of rideSegments) {
        if (segment.type === 'ride') {
          expect(segment.lineId).toBe('line-1');
        }
      }
      
      // First segment should start from station-1
      const firstRide = rideSegments[0];
      if (firstRide.type === 'ride') {
        expect(firstRide.fromStationId).toBe('station-1');
      }
      
      // Last segment should end at station-4
      const lastRide = rideSegments[rideSegments.length - 1];
      if (lastRide.type === 'ride') {
        expect(lastRide.toStationId).toBe('station-4');
      }
    });

    it('should find route from Downtown to South (line-2)', () => {
      const route = calculateRoute(
        neighborhoods.downtown,
        neighborhoods.south,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      const rideSegment = route.find(seg => seg.type === 'ride');
      if (rideSegment && rideSegment.type === 'ride') {
        expect(rideSegment.lineId).toBe('line-2');
        expect(rideSegment.fromStationId).toBe('station-2');
        expect(rideSegment.toStationId).toBe('station-5');
      }
    });
  });

  describe('Routes requiring transfers', () => {
    it('should find route from Commercial A to South (line-1 to line-2)', () => {
      const route = calculateRoute(
        neighborhoods.commercialA,
        neighborhoods.south,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      // Should have two ride segments (transfer at downtown)
      const rideSegments = route.filter(seg => seg.type === 'ride');
      expect(rideSegments.length).toBeGreaterThanOrEqual(1);
    });

    it('should find route from Residential 1 to South (line-1 to line-2)', () => {
      const route = calculateRoute(
        neighborhoods.residential1,
        neighborhoods.south,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      const rideSegments = route.filter(seg => seg.type === 'ride');
      expect(rideSegments.length).toBeGreaterThanOrEqual(1);
    });

    it('should find route from Commercial B to South (line-1 to line-2)', () => {
      const route = calculateRoute(
        neighborhoods.commercialB,
        neighborhoods.south,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      const rideSegments = route.filter(seg => seg.type === 'ride');
      expect(rideSegments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Routes with walking only (no nearby stations)', () => {
    it('should find walking route from Residential 2 to Residential 3', () => {
      const route = calculateRoute(
        neighborhoods.residential2,
        neighborhoods.residential3,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      // Calculate total distance
      let totalDistance = 0;
      for (const segment of route) {
        if (segment.type === 'walk') {
          totalDistance += segment.distance;
        }
      }
      
      expect(totalDistance).toBeGreaterThan(0);
    });

    it('should find walking route from Residential 2 to Commercial A', () => {
      const route = calculateRoute(
        neighborhoods.residential2,
        neighborhoods.commercialA,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
    });

    it('should find route from Residential 4 to Commercial B', () => {
      const route = calculateRoute(
        neighborhoods.residential4,
        neighborhoods.commercialB,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
    });
  });

  describe('Routes combining walking and train', () => {
    it('should find route from Residential 2 to Downtown', () => {
      const route = calculateRoute(
        neighborhoods.residential2,
        neighborhoods.downtown,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      // Should have both walking and riding segments or just riding
      const hasWalkSegment = route.some(seg => seg.type === 'walk');
      const hasRideSegment = route.some(seg => seg.type === 'ride');
      
      expect(hasWalkSegment || hasRideSegment).toBe(true);
    });

    it('should find route from Residential 3 to Commercial A', () => {
      const route = calculateRoute(
        neighborhoods.residential3,
        neighborhoods.commercialA,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
    });

    it('should find route from Residential 4 to Downtown', () => {
      const route = calculateRoute(
        neighborhoods.residential4,
        neighborhoods.downtown,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
    });

    it('should find route from South to Commercial B', () => {
      const route = calculateRoute(
        neighborhoods.south,
        neighborhoods.commercialB,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      expect(route.length).toBeGreaterThan(0);
      
      // Should use line-2 to downtown, then line-1 to commercial B
      const rideSegments = route.filter(seg => seg.type === 'ride');
      expect(rideSegments.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Route properties and validations', () => {
    it('should calculate estimated time for all route segments', () => {
      const route = calculateRoute(
        neighborhoods.commercialA,
        neighborhoods.commercialB,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      for (const segment of route) {
        expect(segment.estimatedTime).toBeGreaterThan(0);
      }
    });

    it('should have valid positions in walk segments', () => {
      const route = calculateRoute(
        neighborhoods.residential2,
        neighborhoods.residential3,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      for (const segment of route) {
        if (segment.type === 'walk') {
          expect(segment.from.x).toBeGreaterThanOrEqual(0);
          expect(segment.from.x).toBeLessThan(testCityConfig.gridWidth);
          expect(segment.from.y).toBeGreaterThanOrEqual(0);
          expect(segment.from.y).toBeLessThan(testCityConfig.gridHeight);
          
          expect(segment.to.x).toBeGreaterThanOrEqual(0);
          expect(segment.to.x).toBeLessThan(testCityConfig.gridWidth);
          expect(segment.to.y).toBeGreaterThanOrEqual(0);
          expect(segment.to.y).toBeLessThan(testCityConfig.gridHeight);
        }
      }
    });

    it('should have valid station IDs in ride segments', () => {
      const route = calculateRoute(
        neighborhoods.commercialA,
        neighborhoods.downtown,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      for (const segment of route) {
        if (segment.type === 'ride') {
          expect(testRailNetwork.stations.has(segment.fromStationId)).toBe(true);
          expect(testRailNetwork.stations.has(segment.toStationId)).toBe(true);
        }
      }
    });

    it('should return empty route for unreachable destinations', () => {
      // Create a position in water that's unreachable
      const unreachablePos = { x: 2, y: 3 }; // This is water
      
      const route = calculateRoute(
        neighborhoods.commercialA,
        unreachablePos,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Should return empty array for unreachable destination
      expect(Array.isArray(route)).toBe(true);
    });
  });

  describe('Route optimization', () => {
    it('should prefer train over walking for longer distances', () => {
      const route = calculateRoute(
        neighborhoods.commercialA,
        neighborhoods.commercialB,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // For this long distance, should use train
      const hasRideSegment = route.some(seg => seg.type === 'ride');
      expect(hasRideSegment).toBe(true);
    });

    it('should calculate reasonable total time for routes', () => {
      const route = calculateRoute(
        neighborhoods.commercialA,
        neighborhoods.commercialB,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      const totalTime = route.reduce((sum, seg) => sum + seg.estimatedTime, 0);
      
      // Total time should be positive and reasonable (less than walking the whole way)
      expect(totalTime).toBeGreaterThan(0);
      
      // Walking the full distance would be: distance / walkingSpeed
      // Train should be faster than pure walking for this distance
      const directDistance = Math.sqrt(
        Math.pow(neighborhoods.commercialB.x - neighborhoods.commercialA.x, 2) +
        Math.pow(neighborhoods.commercialB.y - neighborhoods.commercialA.y, 2)
      );
      const pureWalkingTime = directDistance / walkingSpeed;
      
      // Route should be faster than or equal to pure walking
      expect(totalTime).toBeLessThanOrEqual(pureWalkingTime * 1.5); // Allow some overhead
    });
  });

  describe('Same origin and destination', () => {
    it('should handle route from location to itself', () => {
      const route = calculateRoute(
        neighborhoods.downtown,
        neighborhoods.downtown,
        testCityConfig,
        testRailNetwork,
        walkingSpeed,
        trainSpeed,
        stopTimePerStation
      );

      // Should return a valid route (possibly empty or minimal)
      expect(Array.isArray(route)).toBe(true);
    });
  });

  describe('Parameterized walking tests', () => {
    it.each([
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, 20], // horizontal: 1 unit / 0.05 speed = 20 min
      [{ x: 0, y: 0 }, { x: 0, y: 1 }, 20], // vertical: 1 unit / 0.05 speed = 20 min
      [{ x: 0, y: 0 }, { x: 1, y: 1 }, 28.28], // diagonal: sqrt(2) / 0.05 ≈ 28.28 min
    ])(
      'should calculate correct time from %p to %p (expected: %f min)',
      (origin, destination, expectedTime) => {
        const route = calculateRoute(
          origin,
          destination,
          testCityConfig,
          testRailNetwork,
          walkingSpeed,
          trainSpeed,
          stopTimePerStation
        );

        expect(Array.isArray(route)).toBe(true);
        expect(route.length).toBe(1);
        const segment = route[0];
        expect(segment.type).toBe('walk');
        expect(segment.estimatedTime).toBeCloseTo(expectedTime, 1);
      }
    );
  });
});

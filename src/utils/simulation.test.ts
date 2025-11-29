import { describe, it, expect } from '@jest/globals';
import type { Station, Track, Position } from '../models';
import { findTrackPath } from './simulation';

describe('findTrackPath', () => {
  // Helper function to create a station
  const createStation = (id: string, x: number, y: number): Station => ({
    id,
    position: { x, y },
    neighborhoodId: 'test-neighborhood',
    lineIds: [],
    waitingCitizens: new Map(),
  });

  // Helper function to create a track
  const createTrack = (
    id: string,
    from: Position,
    to: Position,
    lineIds: string[]
  ): Track => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return {
      id,
      from,
      to,
      lineIds,
      distance,
      isOverWater: false,
      cost: distance * 100,
    };
  };

  describe('simple paths', () => {
    it('should return single position when from and to stations are at same location', () => {
      const station = createStation('s1', 0, 0);
      const tracks = new Map<string, Track>();
      
      const result = findTrackPath(station, station, tracks, 'line1');
      
      expect(result).toEqual([{ x: 0, y: 0 }]);
    });

    it('should find direct path between two connected stations', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 1, 0);
      
      const tracks = new Map<string, Track>();
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
    });

    it('should find path with multiple waypoints', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 2, 0);
      
      const tracks = new Map<string, Track>();
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1']));
      tracks.set('t2', createTrack('t2', { x: 1, y: 0 }, { x: 2, y: 0 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]);
    });
  });

  describe('bidirectional tracks', () => {
    it('should traverse tracks in both directions', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 2, 0);
      
      const tracks = new Map<string, Track>();
      // Track goes from (1,0) to (0,0), but should be traversable both ways
      tracks.set('t1', createTrack('t1', { x: 1, y: 0 }, { x: 0, y: 0 }, ['line1']));
      tracks.set('t2', createTrack('t2', { x: 1, y: 0 }, { x: 2, y: 0 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]);
    });
  });

  describe('line filtering', () => {
    it('should only use tracks belonging to specified line', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 2, 0);
      
      const tracks = new Map<string, Track>();
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1']));
      tracks.set('t2', createTrack('t2', { x: 1, y: 0 }, { x: 2, y: 0 }, ['line2'])); // Different line
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      // Should return direct line since there's no complete path on line1
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ]);
    });

    it('should work with tracks belonging to multiple lines', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 2, 0);
      
      const tracks = new Map<string, Track>();
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1', 'line2']));
      tracks.set('t2', createTrack('t2', { x: 1, y: 0 }, { x: 2, y: 0 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]);
    });
  });

  describe('complex paths', () => {
    it('should find path through L-shaped track layout', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 1, 1);
      
      const tracks = new Map<string, Track>();
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1']));
      tracks.set('t2', createTrack('t2', { x: 1, y: 0 }, { x: 1, y: 1 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
      ]);
    });

    it('should find shortest path when multiple routes exist', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 2, 0);
      
      const tracks = new Map<string, Track>();
      // Direct path
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1']));
      tracks.set('t2', createTrack('t2', { x: 1, y: 0 }, { x: 2, y: 0 }, ['line1']));
      // Longer alternate path
      tracks.set('t3', createTrack('t3', { x: 0, y: 0 }, { x: 0, y: 1 }, ['line1']));
      tracks.set('t4', createTrack('t4', { x: 0, y: 1 }, { x: 1, y: 1 }, ['line1']));
      tracks.set('t5', createTrack('t5', { x: 1, y: 1 }, { x: 2, y: 1 }, ['line1']));
      tracks.set('t6', createTrack('t6', { x: 2, y: 1 }, { x: 2, y: 0 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      // BFS should find the shortest path (direct route)
      expect(result).toHaveLength(3); // Start + 1 intermediate + end
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[result.length - 1]).toEqual({ x: 2, y: 0 });
    });

    it('should handle circular/loop tracks', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 2, 0);
      
      const tracks = new Map<string, Track>();
      // Create a square loop
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1']));
      tracks.set('t2', createTrack('t2', { x: 1, y: 0 }, { x: 2, y: 0 }, ['line1']));
      tracks.set('t3', createTrack('t3', { x: 2, y: 0 }, { x: 2, y: 1 }, ['line1']));
      tracks.set('t4', createTrack('t4', { x: 2, y: 1 }, { x: 1, y: 1 }, ['line1']));
      tracks.set('t5', createTrack('t5', { x: 1, y: 1 }, { x: 0, y: 1 }, ['line1']));
      tracks.set('t6', createTrack('t6', { x: 0, y: 1 }, { x: 0, y: 0 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      // Should find a valid path (direct is shortest)
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[result.length - 1]).toEqual({ x: 2, y: 0 });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('no path scenarios', () => {
    it('should return direct line when no tracks exist', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 5, 5);
      
      const tracks = new Map<string, Track>();
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 5, y: 5 },
      ]);
    });

    it('should return direct line when no path exists on specified line', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 2, 0);
      
      const tracks = new Map<string, Track>();
      // Tracks exist but form disconnected segments
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1']));
      tracks.set('t2', createTrack('t2', { x: 1.5, y: 0 }, { x: 2, y: 0 }, ['line1'])); // Gap at x=1
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ]);
    });

    it('should return direct line when tracks exist but not on the requested line', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 2, 0);
      
      const tracks = new Map<string, Track>();
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line2']));
      tracks.set('t2', createTrack('t2', { x: 1, y: 0 }, { x: 2, y: 0 }, ['line2']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty tracks map', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 1, 1);
      const tracks = new Map<string, Track>();
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ]);
    });

    it('should handle tracks with identical from and to positions', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 1, 0);
      
      const tracks = new Map<string, Track>();
      tracks.set('t1', createTrack('t1', { x: 0, y: 0 }, { x: 0, y: 0 }, ['line1'])); // Self-loop
      tracks.set('t2', createTrack('t2', { x: 0, y: 0 }, { x: 1, y: 0 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[result.length - 1]).toEqual({ x: 1, y: 0 });
    });

    it('should handle very long paths', () => {
      const stationA = createStation('s1', 0, 0);
      const stationB = createStation('s2', 10, 0);
      
      const tracks = new Map<string, Track>();
      // Create a long chain of tracks
      for (let i = 0; i < 10; i++) {
        tracks.set(`t${i}`, createTrack(`t${i}`, { x: i, y: 0 }, { x: i + 1, y: 0 }, ['line1']));
      }
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toHaveLength(11); // 11 positions for 10 segments
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[10]).toEqual({ x: 10, y: 0 });
    });
  });

  describe('position precision', () => {
    it('should handle floating point positions', () => {
      const stationA = createStation('s1', 0.5, 0.5);
      const stationB = createStation('s2', 1.5, 0.5);
      
      const tracks = new Map<string, Track>();
      tracks.set('t1', createTrack('t1', { x: 0.5, y: 0.5 }, { x: 1.5, y: 0.5 }, ['line1']));
      
      const result = findTrackPath(stationA, stationB, tracks, 'line1');
      
      expect(result).toEqual([
        { x: 0.5, y: 0.5 },
        { x: 1.5, y: 0.5 },
      ]);
    });
  });
});

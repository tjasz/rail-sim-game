// Pathfinding utilities for calculating optimal routes through the city

import type { Position, RailNetwork, Neighborhood, Line, Track } from '../models';
import { calculateDistance } from './simulation';

interface PathNode {
  position: Position;
  cost: number;
  previous?: PathNode;
  neighborhoodId?: string; // if this node is at a neighborhood
  viaNeighborhood?: string;
  segmentCount?: number; // number of segments to reach this node
}

/**
 * Find the shortest path along tracks between two positions using BFS
 */
function findTrackPath(
  from: Position,
  to: Position,
  lineId: string,
  tracks: Map<string, Track>
): number {
  const posKey = (pos: Position) => `${pos.x},${pos.y}`;
  const startKey = posKey(from);
  const endKey = posKey(to);
  
  if (startKey === endKey) return 0;
  
  // Build adjacency map for tracks on this line
  const adjacency = new Map<string, Array<{ position: Position; distance: number }>>();
  
  for (const track of tracks.values()) {
    if (!track.lineIds.includes(lineId)) continue;
    
    const fromKey = posKey(track.from);
    const toKey = posKey(track.to);
    
    // Add edges in both directions
    if (!adjacency.has(fromKey)) adjacency.set(fromKey, []);
    if (!adjacency.has(toKey)) adjacency.set(toKey, []);
    
    adjacency.get(fromKey)!.push({ position: track.to, distance: track.distance });
    adjacency.get(toKey)!.push({ position: track.from, distance: track.distance });
  }
  
  // BFS to find shortest path
  const queue: Array<{ position: Position; distance: number }> = [{ position: from, distance: 0 }];
  const visited = new Set<string>();
  visited.add(startKey);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = posKey(current.position);
    
    if (currentKey === endKey) {
      return current.distance;
    }
    
    const neighbors = adjacency.get(currentKey) || [];
    for (const neighbor of neighbors) {
      const neighborKey = posKey(neighbor.position);
      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push({
          position: neighbor.position,
          distance: current.distance + neighbor.distance
        });
      }
    }
  }
  
  // No path found along tracks
  return Infinity;
}

/**
 * Calculate the distance along tracks between two neighborhoods on the same line
 */
function getTrackDistanceBetweenNeighborhoods(
  fromNeighborhoodId: string,
  toNeighborhoodId: string,
  line: Line,
  neighborhoods: Neighborhood[],
  tracks: Map<string, Track>
): number {
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  const fromIndex = line.neighborhoodIds.indexOf(fromNeighborhoodId);
  const toIndex = line.neighborhoodIds.indexOf(toNeighborhoodId);
  
  if (fromIndex === -1 || toIndex === -1) return Infinity;
  
  const startIndex = Math.min(fromIndex, toIndex);
  const endIndex = Math.max(fromIndex, toIndex);
  
  let totalDistance = 0;
  
  // Sum up track distances between consecutive neighborhoods
  for (let i = startIndex; i < endIndex; i++) {
    const currentNeighborhoodId = line.neighborhoodIds[i];
    const nextNeighborhoodId = line.neighborhoodIds[i + 1];
    
    const currentNeighborhood = neighborhoodMap.get(currentNeighborhoodId);
    const nextNeighborhood = neighborhoodMap.get(nextNeighborhoodId);
    
    if (!currentNeighborhood || !nextNeighborhood) return Infinity;
    
    // Find path along tracks between these two consecutive neighborhoods
    const trackDistance = findTrackPath(
      currentNeighborhood.position,
      nextNeighborhood.position,
      line.id,
      tracks
    );
    
    // If no track path found, fall back to straight-line distance
    if (trackDistance === Infinity) {
      totalDistance += calculateDistance(currentNeighborhood.position, nextNeighborhood.position);
    } else {
      totalDistance += trackDistance;
    }
  }
  
  return totalDistance;
}

/**
 * Calculate the cost of traveling between two neighborhoods on the same line
 */
function getTrainCost(
  fromNeighborhoodId: string,
  toNeighborhoodId: string,
  line: Line,
  neighborhoods: Neighborhood[],
  tracks: Map<string, Track>,
  trainSpeed: number,
  stopTimePerNeighborhood: number
): number {
  const fromIndex = line.neighborhoodIds.indexOf(fromNeighborhoodId);
  const toIndex = line.neighborhoodIds.indexOf(toNeighborhoodId);
  
  if (fromIndex === -1 || toIndex === -1) return Infinity;
  
  // Calculate distance along tracks
  const distance = getTrackDistanceBetweenNeighborhoods(fromNeighborhoodId, toNeighborhoodId, line, neighborhoods, tracks);
  
  if (distance === Infinity) return Infinity;
  
  // Calculate number of stops between (not including start and end)
  const stopsInBetween = Math.abs(toIndex - fromIndex) - 1;
  
  // Time = travel time + stop time
  return (distance / trainSpeed) + (stopsInBetween * stopTimePerNeighborhood);
}

/**
 * Build a graph of all possible movements in the city
 * Returns a map of position keys to arrays of {position, cost, neighborhoodId?}
 */
export interface GraphEdge {
  position: Position;
  cost: number;
  neighborhoodId?: string;
  lineId?: string;
  lineDirection?: 'forward' | 'backward';
  viaNeighborhood?: string; // if this edge uses a train line
}

export function buildCityGraph(
  railNetwork: RailNetwork,
  neighborhoods: Neighborhood[],
  trainSpeed: number,
  stopTimePerNeighborhood: number
): Map<string, GraphEdge[]> {
  const graph = new Map<string, GraphEdge[]>();
  
  const posKey = (pos: Position) => `${pos.x},${pos.y}`;
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  
  // Add train edges between neighborhoods
  railNetwork.lines.forEach(line => {
    if (!line.isActive || line.neighborhoodIds.length < 2) return;
    
    // For each neighborhood on the line
    for (let i = 0; i < line.neighborhoodIds.length; i++) {
      const neighborhoodId = line.neighborhoodIds[i];
      const neighborhood = neighborhoodMap.get(neighborhoodId);
      if (!neighborhood) continue;
      
      const key = posKey(neighborhood.position);
      const edges = graph.get(key) || [];
      
      // Add edges to all other neighborhoods on this line
      for (let j = 0; j < line.neighborhoodIds.length; j++) {
        if (i === j) continue;
        
        const otherNeighborhoodId = line.neighborhoodIds[j];
        const otherNeighborhood = neighborhoodMap.get(otherNeighborhoodId);
        if (!otherNeighborhood) continue;
        
        const cost = getTrainCost(
          neighborhoodId,
          otherNeighborhoodId,
          line,
          neighborhoods,
          railNetwork.tracks,
          trainSpeed,
          stopTimePerNeighborhood
        );
        
        edges.push({
          position: otherNeighborhood.position,
          cost,
          neighborhoodId: otherNeighborhoodId,
          lineId: line.id,
          lineDirection: j > i ? 'forward' : 'backward',
          viaNeighborhood: neighborhoodId,
        });
      }
      
      graph.set(key, edges);
    }
  });
  
  return graph;
}

/**
 * Find the shortest path between two positions using Dijkstra's algorithm
 * Prefers paths with fewer segments when travel times are similar
 */
function findShortestPath(
  from: Position,
  to: Position,
  graph: Map<string, GraphEdge[]>
): PathNode[] {
  const posKey = (pos: Position) => `${pos.x},${pos.y}`;
  const startKey = posKey(from);
  const endKey = posKey(to);
  
  // Small penalty per segment to prefer fewer transfers/segments (0.01 time units)
  const SEGMENT_PENALTY = 0.01;
  
  // Priority queue (simple array-based implementation)
  const openSet: PathNode[] = [{ position: from, cost: 0, segmentCount: 0 }];
  const closedSet = new Set<string>();
  const costSoFar = new Map<string, number>();
  costSoFar.set(startKey, 0);
  
  while (openSet.length > 0) {
    // Get node with lowest cost (including segment penalty)
    openSet.sort((a, b) => {
      const aCost = a.cost + (a.segmentCount || 0) * SEGMENT_PENALTY;
      const bCost = b.cost + (b.segmentCount || 0) * SEGMENT_PENALTY;
      return aCost - bCost;
    });
    const current = openSet.shift()!;
    const currentKey = posKey(current.position);
    
    // Check if we reached the destination
    if (currentKey === endKey) {
      // Reconstruct path
      const path: PathNode[] = [];
      let node: PathNode | undefined = current;
      while (node) {
        path.unshift(node);
        node = node.previous;
      }
      return path;
    }
    
    closedSet.add(currentKey);
    
    // Check neighbors
    const edges = graph.get(currentKey) || [];
    for (const edge of edges) {
      const neighborKey = posKey(edge.position);
      if (closedSet.has(neighborKey)) continue;
      
      const newCost = current.cost + edge.cost;
      const newSegmentCount = (current.segmentCount || 0) + 1;
      const existingCost = costSoFar.get(neighborKey);
      
      if (existingCost === undefined || newCost < existingCost) {
        costSoFar.set(neighborKey, newCost);
        const neighborNode: PathNode = {
          position: edge.position,
          cost: newCost,
          previous: current,
          neighborhoodId: edge.neighborhoodId,
          viaNeighborhood: edge.viaNeighborhood,
          segmentCount: newSegmentCount,
        };
        
        // Remove old entry if exists
        const existingIndex = openSet.findIndex(n => posKey(n.position) === neighborKey);
        if (existingIndex !== -1) {
          openSet.splice(existingIndex, 1);
        }
        
        openSet.push(neighborNode);
      }
    }
  }
  
  // No path found
  return [];
}

/**
 * Convert a path of nodes into route segments
 */
import type { RouteSegment, RideSegment } from '../models';

function pathToRouteSegments(
  path: PathNode[],
  railNetwork: RailNetwork,
  neighborhoods: Neighborhood[],
  trainSpeed: number
): RouteSegment[] {
  if (path.length < 2) return [];
  
  const segments: RouteSegment[] = [];
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  let i = 0;
  
  while (i < path.length - 1) {
    const next = path[i + 1];
    
    // Check if this is a train segment (both nodes have neighborhoodIds)
    if (next.viaNeighborhood && next.neighborhoodId) {
      // Find which line connects these neighborhoods
      let lineId: string | undefined;
      let lineDirection: 'forward' | 'backward' | undefined;
      let fromNeighborhoodId = next.viaNeighborhood;
      let toNeighborhoodId = next.neighborhoodId;
      
      railNetwork.lines.forEach(line => {
        if (line.neighborhoodIds.includes(fromNeighborhoodId) && line.neighborhoodIds.includes(toNeighborhoodId)) {
          lineId = line.id;
          lineDirection = line.neighborhoodIds.indexOf(fromNeighborhoodId) < line.neighborhoodIds.indexOf(toNeighborhoodId) ? 'forward' : 'backward';
        }
      });
      
      if (lineId && lineDirection) {
        // Look ahead to merge consecutive segments on the same line in the same direction
        let endNeighborhoodId = toNeighborhoodId;
        let j = i + 1;
        
        while (j < path.length - 1) {
          const nextNode = path[j + 1];
          if (!nextNode.viaNeighborhood || !nextNode.neighborhoodId) break;
          
          // Check if the next segment is on the same line
          let nextLineId: string | undefined;
          let nextLineDirection: 'forward' | 'backward' | undefined;
          
          railNetwork.lines.forEach(line => {
            if (line.neighborhoodIds.includes(nextNode.viaNeighborhood!) && line.neighborhoodIds.includes(nextNode.neighborhoodId!)) {
              nextLineId = line.id;
              nextLineDirection = line.neighborhoodIds.indexOf(nextNode.viaNeighborhood!) < line.neighborhoodIds.indexOf(nextNode.neighborhoodId!) ? 'forward' : 'backward';
            }
          });
          
          // If same line and same direction, extend the segment
          if (nextLineId === lineId && nextLineDirection === lineDirection && nextNode.viaNeighborhood === endNeighborhoodId) {
            endNeighborhoodId = nextNode.neighborhoodId;
            j++;
          } else {
            break;
          }
        }
        
        const line = railNetwork.lines.get(lineId);
        const fromNeighborhood = neighborhoodMap.get(fromNeighborhoodId);
        const endNeighborhood = neighborhoodMap.get(endNeighborhoodId);
        
        if (line && fromNeighborhood && endNeighborhood) {
          // Use track distance instead of straight-line distance
          const distance = getTrackDistanceBetweenNeighborhoods(
            fromNeighborhoodId,
            endNeighborhoodId,
            line,
            neighborhoods,
            railNetwork.tracks
          );
          const fromIndex = line.neighborhoodIds.indexOf(fromNeighborhoodId);
          const toIndex = line.neighborhoodIds.indexOf(endNeighborhoodId);
          const stopsInBetween = Math.abs(toIndex - fromIndex) - 1;
          const estimatedTime = (distance / trainSpeed) + (stopsInBetween * 1); // 1 min per stop
          
          segments.push({
            type: 'ride',
            lineId,
            lineDirection,
            fromNeighborhoodId,
            toNeighborhoodId: endNeighborhoodId,
            distance,
            estimatedTime,
          } as RideSegment);
          
          i = j;
          continue;
        }
      }
    }
    
    i++;
  }
  
  return segments;
}

/**
 * Calculate optimal route from origin to destination
 */
export function calculateRoute(
  from: Position,
  to: Position,
  railNetwork: RailNetwork,
  neighborhoods: Neighborhood[],
  trainSpeed: number,
  stopTimePerNeighborhood: number = 1
): RouteSegment[] {
  // Build graph
  const graph = buildCityGraph(railNetwork, neighborhoods, trainSpeed, stopTimePerNeighborhood);
  
  // Find shortest path
  const path = findShortestPath(from, to, graph);
  
  if (path.length === 0) {
    // No path found - return empty route
    return [];
  }
  
  // Convert to route segments
  return pathToRouteSegments(path, railNetwork, neighborhoods, trainSpeed);
}

/**
 * Calculate routes for all origin-destination pairs
 */
export function calculateAllRoutes(
  origins: Position[],
  destinations: Position[],
  railNetwork: RailNetwork,
  neighborhoods: Neighborhood[],
  trainSpeed: number,
  timePerNeighborhoodStop: number
): Map<string, RouteSegment[]> {
  const routes = new Map<string, RouteSegment[]>();
  
  for (const origin of origins) {
    for (const destination of destinations) {
      const key = `${origin.x},${origin.y}->${destination.x},${destination.y}`;
      const route = calculateRoute(origin, destination, railNetwork, neighborhoods, trainSpeed, timePerNeighborhoodStop);
      routes.set(key, route);
    }
  }
  
  return routes;
}

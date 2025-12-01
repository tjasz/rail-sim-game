// Pathfinding utilities for calculating optimal routes through the city

import type { Position, CityConfig, RailNetwork, Station, Line, Track } from '../models';
import { calculateDistance } from './simulation';

interface PathNode {
  position: Position;
  cost: number;
  previous?: PathNode;
  stationId?: string; // if this node is at a station
  viaStation?: string;
  segmentCount?: number; // number of segments to reach this node
}

/**
 * Calculate the cost of traveling between two adjacent grid cells by walking.
 * Citizens can walk at 0 or 45 degree angles only.
 */
function getWalkingCost(
  from: Position,
  to: Position,
  config: CityConfig,
  walkingSpeed: number
): number {
  // Check if positions are adjacent
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx > 1 || dy > 1) return Infinity;
  
  // Check bounds
  if (to.x < 0 || to.x >= config.gridWidth || to.y < 0 || to.y >= config.gridHeight) {
    return Infinity;
  }
  
  // Check if either cell is water
  const fromTile = config.tiles[from.x]?.[from.y];
  const toTile = config.tiles[to.x]?.[to.y];
  if (fromTile === 'w' || toTile === 'w') {
    return Infinity;
  }
  
  // Cost is distance divided by speed (time = distance / speed)
  const distance = calculateDistance(from, to);
  return distance / walkingSpeed;
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
 * Calculate the distance along tracks between two stations on the same line
 */
function getTrackDistanceBetweenStations(
  fromStationId: string,
  toStationId: string,
  line: Line,
  stations: Map<string, Station>,
  tracks: Map<string, Track>
): number {
  const fromIndex = line.stationIds.indexOf(fromStationId);
  const toIndex = line.stationIds.indexOf(toStationId);
  
  if (fromIndex === -1 || toIndex === -1) return Infinity;
  
  const startIndex = Math.min(fromIndex, toIndex);
  const endIndex = Math.max(fromIndex, toIndex);
  
  let totalDistance = 0;
  
  // Sum up track distances between consecutive stations
  for (let i = startIndex; i < endIndex; i++) {
    const currentStationId = line.stationIds[i];
    const nextStationId = line.stationIds[i + 1];
    
    const currentStation = stations.get(currentStationId);
    const nextStation = stations.get(nextStationId);
    
    if (!currentStation || !nextStation) return Infinity;
    
    // Find path along tracks between these two consecutive stations
    const trackDistance = findTrackPath(
      currentStation.position,
      nextStation.position,
      line.id,
      tracks
    );
    
    // If no track path found, fall back to straight-line distance
    if (trackDistance === Infinity) {
      totalDistance += calculateDistance(currentStation.position, nextStation.position);
    } else {
      totalDistance += trackDistance;
    }
  }
  
  return totalDistance;
}

/**
 * Calculate the cost of traveling between two stations on the same line
 */
function getTrainCost(
  fromStationId: string,
  toStationId: string,
  line: Line,
  stations: Map<string, Station>,
  tracks: Map<string, Track>,
  trainSpeed: number,
  stopTimePerStation: number
): number {
  const fromIndex = line.stationIds.indexOf(fromStationId);
  const toIndex = line.stationIds.indexOf(toStationId);
  
  if (fromIndex === -1 || toIndex === -1) return Infinity;
  
  // Calculate distance along tracks
  const distance = getTrackDistanceBetweenStations(fromStationId, toStationId, line, stations, tracks);
  
  if (distance === Infinity) return Infinity;
  
  // Calculate number of stops between (not including start and end)
  const stopsInBetween = Math.abs(toIndex - fromIndex) - 1;
  
  // Time = travel time + stop time
  return (distance / trainSpeed) + (stopsInBetween * stopTimePerStation);
}

/**
 * Build a graph of all possible movements in the city
 * Returns a map of position keys to arrays of {position, cost, stationId?}
 */
export interface GraphEdge {
  position: Position;
  cost: number;
  stationId?: string;
  lineId?: string;
  lineDirection?: 'forward' | 'backward';
  viaStation?: string; // if this edge uses a train line
}

export function buildCityGraph(
  config: CityConfig,
  railNetwork: RailNetwork,
  walkingSpeed: number,
  trainSpeed: number,
  stopTimePerStation: number
): Map<string, GraphEdge[]> {
  const graph = new Map<string, GraphEdge[]>();
  
  const posKey = (pos: Position) => `${pos.x},${pos.y}`;
  
  // Add walking edges for all land cells
  for (let y = 0; y < config.gridHeight; y++) {
    for (let x = 0; x < config.gridWidth; x++) {
      if (config.tiles[x]?.[y] === 'w') continue;
      
      const pos = { x, y };
      const key = posKey(pos);
      const edges: GraphEdge[] = [];
      
      // Add walking to adjacent cells, including diagonals
      const neighbors = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 },
        { x: x - 1, y: y - 1 },
        { x: x + 1, y: y - 1 },
        { x: x - 1, y: y + 1 },
        { x: x + 1, y: y + 1 },
      ];
      
      for (const neighbor of neighbors) {
        const cost = getWalkingCost(pos, neighbor, config, walkingSpeed);
        if (cost < Infinity) {
          edges.push({ position: neighbor, cost });
        }
      }
      
      graph.set(key, edges);
    }
  }
  
  // Add train edges between stations
  railNetwork.lines.forEach(line => {
    if (!line.isActive || line.stationIds.length < 2) return;
    
    // For each station on the line
    for (let i = 0; i < line.stationIds.length; i++) {
      const stationId = line.stationIds[i];
      const station = railNetwork.stations.get(stationId);
      if (!station) continue;
      
      const key = posKey(station.position);
      const edges = graph.get(key) || [];
      
      // Add edges to all other stations on this line
      for (let j = 0; j < line.stationIds.length; j++) {
        if (i === j) continue;
        
        const otherStationId = line.stationIds[j];
        const otherStation = railNetwork.stations.get(otherStationId);
        if (!otherStation) continue;
        
        const cost = getTrainCost(
          stationId,
          otherStationId,
          line,
          railNetwork.stations,
          railNetwork.tracks,
          trainSpeed,
          stopTimePerStation
        );
        
        edges.push({
          position: otherStation.position,
          cost,
          stationId: otherStationId,
          lineId: line.id,
          lineDirection: j > i ? 'forward' : 'backward',
          viaStation: stationId,
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
          stationId: edge.stationId,
          viaStation: edge.viaStation,
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
import type { RouteSegment, WalkSegment, RideSegment } from '../models';

function pathToRouteSegments(
  path: PathNode[],
  railNetwork: RailNetwork,
  walkingSpeed: number,
  trainSpeed: number
): RouteSegment[] {
  if (path.length < 2) return [];
  
  const segments: RouteSegment[] = [];
  let i = 0;
  
  while (i < path.length - 1) {
    const current = path[i];
    const next = path[i + 1];
    
    // Check if this is a train segment (both nodes have stationIds)
    if (next.viaStation && next.stationId) {
      // Find which line connects these stations
      let lineId: string | undefined;
      let lineDirection: 'forward' | 'backward' | undefined;
      let fromStationId = next.viaStation;
      let toStationId = next.stationId;
      
      railNetwork.lines.forEach(line => {
        if (line.stationIds.includes(fromStationId) && line.stationIds.includes(toStationId)) {
          lineId = line.id;
          lineDirection = line.stationIds.indexOf(fromStationId) < line.stationIds.indexOf(toStationId) ? 'forward' : 'backward';
        }
      });
      
      if (lineId && lineDirection) {
        // Look ahead to merge consecutive segments on the same line in the same direction
        let endStationId = toStationId;
        let j = i + 1;
        
        while (j < path.length - 1) {
          const nextNode = path[j + 1];
          if (!nextNode.viaStation || !nextNode.stationId) break;
          
          // Check if the next segment is on the same line
          let nextLineId: string | undefined;
          let nextLineDirection: 'forward' | 'backward' | undefined;
          
          railNetwork.lines.forEach(line => {
            if (line.stationIds.includes(nextNode.viaStation!) && line.stationIds.includes(nextNode.stationId!)) {
              nextLineId = line.id;
              nextLineDirection = line.stationIds.indexOf(nextNode.viaStation!) < line.stationIds.indexOf(nextNode.stationId!) ? 'forward' : 'backward';
            }
          });
          
          // If same line and same direction, extend the segment
          if (nextLineId === lineId && nextLineDirection === lineDirection && nextNode.viaStation === endStationId) {
            endStationId = nextNode.stationId;
            j++;
          } else {
            break;
          }
        }
        
        const line = railNetwork.lines.get(lineId);
        const fromStation = railNetwork.stations.get(fromStationId);
        const endStation = railNetwork.stations.get(endStationId);
        
        if (line && fromStation && endStation) {
          // Use track distance instead of straight-line distance
          const distance = getTrackDistanceBetweenStations(
            fromStationId,
            endStationId,
            line,
            railNetwork.stations,
            railNetwork.tracks
          );
          const fromIndex = line.stationIds.indexOf(fromStationId);
          const toIndex = line.stationIds.indexOf(endStationId);
          const stopsInBetween = Math.abs(toIndex - fromIndex) - 1;
          const estimatedTime = (distance / trainSpeed) + (stopsInBetween * 1); // 1 min per stop
          
          segments.push({
            type: 'ride',
            lineId,
            lineDirection,
            fromStationId,
            toStationId: endStationId,
            distance,
            estimatedTime,
          } as RideSegment);
          
          i = j;
          continue;
        }
      }
    }
    
    // Otherwise, it's a walking segment
    const distance = calculateDistance(current.position, next.position);
    const estimatedTime = distance / walkingSpeed;
    
    segments.push({
      type: 'walk',
      from: current.position,
      to: next.position,
      distance,
      estimatedTime,
    } as WalkSegment);
    
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
  config: CityConfig,
  railNetwork: RailNetwork,
  walkingSpeed: number,
  trainSpeed: number,
  stopTimePerStation: number = 1
): RouteSegment[] {
  // Build graph
  const graph = buildCityGraph(config, railNetwork, walkingSpeed, trainSpeed, stopTimePerStation);
  
  // Find shortest path
  const path = findShortestPath(from, to, graph);
  
  if (path.length === 0) {
    // No path found - return empty route
    return [];
  }
  
  // Convert to route segments
  return pathToRouteSegments(path, railNetwork, walkingSpeed, trainSpeed);
}

/**
 * Calculate routes for all origin-destination pairs
 */
export function calculateAllRoutes(
  origins: Position[],
  destinations: Position[],
  config: CityConfig,
  railNetwork: RailNetwork,
  walkingSpeed: number,
  trainSpeed: number
): Map<string, RouteSegment[]> {
  const routes = new Map<string, RouteSegment[]>();
  
  for (const origin of origins) {
    for (const destination of destinations) {
      const key = `${origin.x},${origin.y}->${destination.x},${destination.y}`;
      const route = calculateRoute(origin, destination, config, railNetwork, walkingSpeed, trainSpeed);
      routes.set(key, route);
    }
  }
  
  return routes;
}

// Pathfinding utilities for calculating optimal routes through the city

import type { Position, CityConfig, RailNetwork, Station, Line } from '../models';
import { calculateDistance } from './simulation';

interface PathNode {
  position: Position;
  cost: number;
  previous?: PathNode;
  stationId?: string; // if this node is at a station
  viaStation?: string;
}

/**
 * Calculate the cost of traveling between two adjacent grid cells by walking
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
  if (dx + dy !== 1) return Infinity;
  
  // Check bounds
  if (to.x < 0 || to.x >= config.gridWidth || to.y < 0 || to.y >= config.gridHeight) {
    return Infinity;
  }
  
  // Check if either cell is water
  const fromTile = config.tiles[from.x]?.[from.y];
  const toTile = config.tiles[to.x]?.[to.y];
  if (fromTile === 'water' || toTile === 'water') {
    return Infinity;
  }
  
  // Cost is distance divided by speed (time = distance / speed)
  const distance = calculateDistance(from, to);
  return distance / walkingSpeed;
}

/**
 * Calculate the cost of traveling between two stations on the same line
 */
function getTrainCost(
  fromStationId: string,
  toStationId: string,
  line: Line,
  stations: Map<string, Station>,
  trainSpeed: number,
  stopTimePerStation: number
): number {
  const fromIndex = line.stationIds.indexOf(fromStationId);
  const toIndex = line.stationIds.indexOf(toStationId);
  
  if (fromIndex === -1 || toIndex === -1) return Infinity;
  
  // Calculate distance
  const fromStation = stations.get(fromStationId);
  const toStation = stations.get(toStationId);
  if (!fromStation || !toStation) return Infinity;
  
  const distance = calculateDistance(fromStation.position, toStation.position);
  
  // Calculate number of stops between (not including start and end)
  const stopsInBetween = Math.abs(toIndex - fromIndex) - 1;
  
  // Time = travel time + stop time
  return (distance / trainSpeed) + (stopsInBetween * stopTimePerStation);
}

/**
 * Build a graph of all possible movements in the city
 * Returns a map of position keys to arrays of {position, cost, stationId?}
 */
interface GraphEdge {
  position: Position;
  cost: number;
  stationId?: string;
  lineId?: string;
  lineDirection?: 'forward' | 'backward';
  viaStation?: string; // if this edge uses a train line
}

function buildCityGraph(
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
      if (config.tiles[x]?.[y] === 'water') continue;
      
      const pos = { x, y };
      const key = posKey(pos);
      const edges: GraphEdge[] = [];
      
      // Add walking to adjacent cells
      const neighbors = [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 },
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
 */
function findShortestPath(
  from: Position,
  to: Position,
  graph: Map<string, GraphEdge[]>
): PathNode[] {
  const posKey = (pos: Position) => `${pos.x},${pos.y}`;
  const startKey = posKey(from);
  const endKey = posKey(to);
  
  // Priority queue (simple array-based implementation)
  const openSet: PathNode[] = [{ position: from, cost: 0 }];
  const closedSet = new Set<string>();
  const costSoFar = new Map<string, number>();
  costSoFar.set(startKey, 0);
  
  while (openSet.length > 0) {
    // Get node with lowest cost
    openSet.sort((a, b) => a.cost - b.cost);
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
      const existingCost = costSoFar.get(neighborKey);
      
      if (existingCost === undefined || newCost < existingCost) {
        costSoFar.set(neighborKey, newCost);
        const neighborNode: PathNode = {
          position: edge.position,
          cost: newCost,
          previous: current,
          stationId: edge.stationId,
          viaStation: edge.viaStation,
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
        const line = railNetwork.lines.get(lineId);
        const fromStation = railNetwork.stations.get(fromStationId);
        const toStation = railNetwork.stations.get(toStationId);
        
        if (line && fromStation && toStation) {
          const distance = calculateDistance(fromStation.position, toStation.position);
          const fromIndex = line.stationIds.indexOf(fromStationId);
          const toIndex = line.stationIds.indexOf(toStationId);
          const stopsInBetween = Math.abs(toIndex - fromIndex) - 1;
          const estimatedTime = (distance / trainSpeed) + (stopsInBetween * 1); // 1 min per stop
          
          segments.push({
            type: 'ride',
            lineId,
            lineDirection,
            fromStationId,
            toStationId,
            estimatedTime,
          } as RideSegment);
          
          i++;
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
  const result = pathToRouteSegments(path, railNetwork, walkingSpeed, trainSpeed);
  console.log({graph, path, result})
  return result;
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

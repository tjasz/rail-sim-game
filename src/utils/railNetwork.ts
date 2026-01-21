// Utility functions for managing rail network connections

import type { Position, Track, Neighborhood } from '../models';

/**
 * Find the shortest path between two stations using Dijkstra's algorithm on the track network
 * Returns an object with the path (array of track IDs) and total distance, or null if no path exists
 */
export function findShortestTrackPath(
  fromStation: Neighborhood,
  toStation: Neighborhood,
  tracks: Map<string, Track>
): { path: string[]; distance: number } | null {
  if (fromStation.id === toStation.id) {
    return { path: [], distance: 0 };
  }

  const posKey = (pos: Position) => `${pos.x},${pos.y}`;
  const startKey = posKey(fromStation.position);
  const endKey = posKey(toStation.position);

  // Build adjacency map: position -> array of { position, trackId, distance }
  const adjacency = new Map<string, Array<{ position: Position; trackId: string; distance: number }>>();

  for (const [trackId, track] of tracks.entries()) {
    const fromKey = posKey(track.from);
    const toKey = posKey(track.to);

    if (!adjacency.has(fromKey)) adjacency.set(fromKey, []);
    if (!adjacency.has(toKey)) adjacency.set(toKey, []);

    // Add edges in both directions
    adjacency.get(fromKey)!.push({ position: track.to, trackId, distance: track.distance });
    adjacency.get(toKey)!.push({ position: track.from, trackId, distance: track.distance });
  }

  // Dijkstra's algorithm to find shortest path
  interface QueueItem {
    position: Position;
    path: string[]; // track IDs
    distance: number; // total distance so far
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, { trackId: string; prevKey: string } | null>();
  const queue: QueueItem[] = [{ position: fromStation.position, path: [], distance: 0 }];
  
  distances.set(startKey, 0);
  previous.set(startKey, null);

  while (queue.length > 0) {
    // Find node with minimum distance
    let minIndex = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].distance < queue[minIndex].distance) {
        minIndex = i;
      }
    }
    const current = queue.splice(minIndex, 1)[0];
    const currentKey = posKey(current.position);

    if (currentKey === endKey) {
      return { path: current.path, distance: current.distance };
    }

    const neighbors = adjacency.get(currentKey) || [];
    for (const neighbor of neighbors) {
      const neighborKey = posKey(neighbor.position);
      const newDistance = current.distance + neighbor.distance;
      
      const existingDistance = distances.get(neighborKey);
      if (existingDistance === undefined || newDistance < existingDistance) {
        distances.set(neighborKey, newDistance);
        previous.set(neighborKey, { trackId: neighbor.trackId, prevKey: currentKey });
        queue.push({
          position: neighbor.position,
          path: [...current.path, neighbor.trackId],
          distance: newDistance
        });
      }
    }
  }

  // No path found
  return null;
}

/**
 * Check if two stations are connected by tracks
 */
export function areStationsConnected(
  station1: Neighborhood,
  station2: Neighborhood,
  tracks: Map<string, Track>
): boolean {
  return findShortestTrackPath(station1, station2, tracks) !== null;
}

/**
 * Get all stations connected to a given station via tracks
 */
export function getConnectedStations(
  station: Neighborhood,
  allStations: Map<string, Neighborhood>,
  tracks: Map<string, Track>
): Neighborhood[] {
  const connected: Neighborhood[] = [];

  for (const otherStation of allStations.values()) {
    if (otherStation.id !== station.id) {
      if (areStationsConnected(station, otherStation, tracks)) {
        connected.push(otherStation);
      }
    }
  }

  return connected;
}

/**
 * Generate a random color for a new line
 */
const LINE_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // turquoise
  '#e91e63', // pink
  '#ff5722', // deep orange
  '#009688', // teal
  '#673ab7', // deep purple
  '#795548', // brown
  '#607d8b', // blue grey
];

export function generateLineColor(existingColors: string[]): string {
  // Find an unused color
  const unusedColors = LINE_COLORS.filter(color => !existingColors.includes(color));
  
  if (unusedColors.length > 0) {
    return unusedColors[0];
  }
  
  // If all colors are used, generate a random one
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

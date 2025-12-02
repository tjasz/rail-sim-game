// Utility functions for managing rail network connections

import type { Position, Station, Track } from '../models';

/**
 * Find the shortest path between two stations using BFS on the track network
 * Returns an array of track IDs that form the path, or null if no path exists
 */
export function findShortestTrackPath(
  fromStation: Station,
  toStation: Station,
  tracks: Map<string, Track>
): string[] | null {
  if (fromStation.id === toStation.id) {
    return [];
  }

  const posKey = (pos: Position) => `${pos.x},${pos.y}`;
  const startKey = posKey(fromStation.position);
  const endKey = posKey(toStation.position);

  // Build adjacency map: position -> array of { position, trackId }
  const adjacency = new Map<string, Array<{ position: Position; trackId: string }>>();

  for (const [trackId, track] of tracks.entries()) {
    const fromKey = posKey(track.from);
    const toKey = posKey(track.to);

    if (!adjacency.has(fromKey)) adjacency.set(fromKey, []);
    if (!adjacency.has(toKey)) adjacency.set(toKey, []);

    // Add edges in both directions
    adjacency.get(fromKey)!.push({ position: track.to, trackId });
    adjacency.get(toKey)!.push({ position: track.from, trackId });
  }

  // BFS to find shortest path
  interface QueueItem {
    position: Position;
    path: string[]; // track IDs
  }

  const queue: QueueItem[] = [{ position: fromStation.position, path: [] }];
  const visited = new Set<string>();
  visited.add(startKey);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = posKey(current.position);

    if (currentKey === endKey) {
      return current.path;
    }

    const neighbors = adjacency.get(currentKey) || [];
    for (const neighbor of neighbors) {
      const neighborKey = posKey(neighbor.position);
      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        queue.push({
          position: neighbor.position,
          path: [...current.path, neighbor.trackId]
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
  station1: Station,
  station2: Station,
  tracks: Map<string, Track>
): boolean {
  return findShortestTrackPath(station1, station2, tracks) !== null;
}

/**
 * Get all stations connected to a given station via tracks
 */
export function getConnectedStations(
  station: Station,
  allStations: Map<string, Station>,
  tracks: Map<string, Track>
): Station[] {
  const connected: Station[] = [];

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

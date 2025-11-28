// Utility functions for game simulation

import type { GameState, Citizen, Train, Line, Station } from '../models';

export const MINUTES_PER_DAY = 24 * 60; // 1440 minutes in a day
export const SIMULATION_TICK_MS = 50; // Update every 50ms

/**
 * Convert simulation minutes to hour:minute format
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = Math.floor(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate distance between two positions
 */
export function calculateDistance(
  from: { x: number; y: number },
  to: { x: number; y: number }
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Move a position toward a target at a given speed
 * Returns the new position and whether the target was reached
 */
export function moveToward(
  current: { x: number; y: number },
  target: { x: number; y: number },
  speed: number,
  deltaTime: number
): { position: { x: number; y: number }; reached: boolean } {
  const distance = calculateDistance(current, target);
  const movement = speed * deltaTime;

  if (movement >= distance) {
    return { position: { ...target }, reached: true };
  }

  const ratio = movement / distance;
  return {
    position: {
      x: current.x + (target.x - current.x) * ratio,
      y: current.y + (target.y - current.y) * ratio,
    },
    reached: false,
  };
}

/**
 * Update train positions based on elapsed time
 */
export function updateTrains(
  trains: Map<string, Train>,
  lines: Map<string, Line>,
  stations: Map<string, Station>,
  _deltaMinutes: number,
  currentTime: number
): Map<string, Train> {
  const updatedTrains = new Map(trains);

  updatedTrains.forEach((train, trainId) => {
    const line = lines.get(train.lineId);
    if (!line || !line.isActive || line.stationIds.length < 2) {
      return;
    }

    // Check if train should arrive at next station
    if (train.nextStationArrivalTime && currentTime >= train.nextStationArrivalTime) {
      // Arrive at station
      const updatedTrain = { ...train };

      // Move to next station
      if (train.direction === 'forward') {
        if (train.currentStationIndex >= line.stationIds.length - 1) {
          // Reached end, reverse direction
          updatedTrain.direction = 'backward';
          updatedTrain.currentStationIndex = line.stationIds.length - 1;
        } else {
          updatedTrain.currentStationIndex += 1;
        }
      } else {
        if (train.currentStationIndex <= 0) {
          // Reached beginning, reverse direction
          updatedTrain.direction = 'forward';
          updatedTrain.currentStationIndex = 0;
        } else {
          updatedTrain.currentStationIndex -= 1;
        }
      }

      // Calculate next arrival time
      const nextIndex =
        updatedTrain.direction === 'forward'
          ? updatedTrain.currentStationIndex + 1
          : updatedTrain.currentStationIndex - 1;

      if (nextIndex >= 0 && nextIndex < line.stationIds.length) {
        const currentStationId = line.stationIds[updatedTrain.currentStationIndex];
        const nextStationId = line.stationIds[nextIndex];
        const currentStation = stations.get(currentStationId);
        const nextStation = stations.get(nextStationId);

        if (currentStation && nextStation) {
          const distance = calculateDistance(currentStation.position, nextStation.position);
          const travelTime = distance / train.speed;
          updatedTrain.nextStationArrivalTime = currentTime + travelTime + 1; // +1 for station stop
        }
      } else {
        updatedTrain.nextStationArrivalTime = undefined;
      }

      updatedTrains.set(trainId, updatedTrain);
    }
  });

  return updatedTrains;
}

/**
 * Update citizen positions and states based on elapsed time
 */
export function updateCitizens(
  citizens: Map<string, Citizen>,
  _deltaMinutes: number,
  _walkingSpeed: number
): Map<string, Citizen> {
  const updatedCitizens = new Map(citizens);

  updatedCitizens.forEach((citizen, citizenId) => {
    const updatedCitizen = { ...citizen };

    // Simple movement logic - can be expanded later
    switch (citizen.state) {
      case 'walking-to-station':
      case 'walking-to-destination':
        // Move citizen slightly (simplified for now)
        // In a full implementation, you'd move toward the target
        break;

      case 'waiting-at-station':
        // Citizens wait for trains
        break;

      case 'riding-train':
        // Position is determined by train position
        break;
    }

    updatedCitizens.set(citizenId, updatedCitizen);
  });

  return updatedCitizens;
}

/**
 * Advance the simulation by one tick
 */
export function tickSimulation(
  gameState: GameState,
  deltaMinutes: number
): GameState {
  const newTime = gameState.simulationTime + deltaMinutes;

  // Check if day is over
  if (newTime >= MINUTES_PER_DAY) {
    return {
      ...gameState,
      isSimulating: false,
      simulationTime: MINUTES_PER_DAY,
    };
  }

  // Update trains
  const updatedTrains = updateTrains(
    gameState.railNetwork.trains,
    gameState.railNetwork.lines,
    gameState.railNetwork.stations,
    deltaMinutes,
    newTime
  );

  // Update citizens
  const updatedCitizens = updateCitizens(
    gameState.citizens,
    deltaMinutes,
    gameState.city.config.walkingSpeed
  );

  return {
    ...gameState,
    simulationTime: newTime,
    railNetwork: {
      ...gameState.railNetwork,
      trains: updatedTrains,
    },
    citizens: updatedCitizens,
  };
}

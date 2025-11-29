// Utility functions for game simulation

import type { GameState, Citizen, Train, Line, Station, Track, Position } from '../models';

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
 * Find a path of track waypoints between two stations
 * Uses BFS to find connected tracks that form a path
 */
export function findTrackPath(
  fromStation: Station,
  toStation: Station,
  tracks: Map<string, Track>,
  lineId: string
): Position[] {
  // Build adjacency map of positions connected by tracks on this line
  const adjacency = new Map<string, Position[]>();
  const posKey = (pos: Position) => `${pos.x},${pos.y}`;
  
  tracks.forEach(track => {
    if (!track.lineIds.includes(lineId)) return;
    
    const fromKey = posKey(track.from);
    const toKey = posKey(track.to);
    
    if (!adjacency.has(fromKey)) adjacency.set(fromKey, []);
    if (!adjacency.has(toKey)) adjacency.set(toKey, []);
    
    adjacency.get(fromKey)!.push(track.to);
    adjacency.get(toKey)!.push(track.from);
  });
  
  // BFS to find path
  const startKey = posKey(fromStation.position);
  const endKey = posKey(toStation.position);
  
  if (startKey === endKey) return [fromStation.position];
  
  const queue: { pos: Position; path: Position[] }[] = [
    { pos: fromStation.position, path: [fromStation.position] }
  ];
  const visited = new Set<string>([startKey]);
  
  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    const neighbors = adjacency.get(posKey(pos)) || [];
    
    for (const neighbor of neighbors) {
      const nKey = posKey(neighbor);
      if (visited.has(nKey)) continue;
      
      visited.add(nKey);
      const newPath = [...path, neighbor];
      
      if (nKey === endKey) {
        return newPath;
      }
      
      queue.push({ pos: neighbor, path: newPath });
    }
  }
  
  // No path found via tracks, return direct line
  return [fromStation.position, toStation.position];
}

/**
 * Update train positions based on elapsed time
 */
export function updateTrains(
  trains: Map<string, Train>,
  lines: Map<string, Line>,
  stations: Map<string, Station>,
  tracks: Map<string, Track>,
  deltaMinutes: number,
  currentTime: number
): Map<string, Train> {
  const updatedTrains = new Map(trains);

  updatedTrains.forEach((train, trainId) => {
    const line = lines.get(train.lineId);
    if (!line || !line.isActive || line.stationIds.length < 2) {
      return;
    }

    const updatedTrain = { ...train };
    
    // Determine next station
    const nextStationIndex = train.direction === 'forward'
      ? train.currentStationIndex + 1
      : train.currentStationIndex - 1;
    
    if (nextStationIndex < 0 || nextStationIndex >= line.stationIds.length) {
      // No next station (shouldn't happen with proper initialization)
      updatedTrains.set(trainId, updatedTrain);
      return;
    }
    
    const nextStationId = line.stationIds[nextStationIndex];
    const nextStation = stations.get(nextStationId);
    
    if (!nextStation) {
      updatedTrains.set(trainId, updatedTrain);
      return;
    }

    // Check if train should arrive at next station
    if (train.nextStationArrivalTime && currentTime >= train.nextStationArrivalTime) {
      // Arrive at station - snap to station position
      updatedTrain.position = { ...nextStation.position };
      updatedTrain.currentStationIndex = nextStationIndex;
      updatedTrain.currentPath = undefined;
      updatedTrain.currentPathIndex = undefined;

      // Check if we need to reverse direction
      if (train.direction === 'forward' && nextStationIndex >= line.stationIds.length - 1) {
        updatedTrain.direction = 'backward';
      } else if (train.direction === 'backward' && nextStationIndex <= 0) {
        updatedTrain.direction = 'forward';
      }

      // Calculate next arrival time and path
      const followingIndex = updatedTrain.direction === 'forward'
        ? updatedTrain.currentStationIndex + 1
        : updatedTrain.currentStationIndex - 1;

      if (followingIndex >= 0 && followingIndex < line.stationIds.length) {
        const followingStationId = line.stationIds[followingIndex];
        const followingStation = stations.get(followingStationId);
        const currentStation = stations.get(line.stationIds[updatedTrain.currentStationIndex]);

        if (followingStation && currentStation) {
          // Find track path between stations
          const path = findTrackPath(currentStation, followingStation, tracks, line.id);
          updatedTrain.currentPath = path;
          updatedTrain.currentPathIndex = 0;
          
          // Calculate total distance along path
          let totalDistance = 0;
          for (let i = 0; i < path.length - 1; i++) {
            totalDistance += calculateDistance(path[i], path[i + 1]);
          }
          
          const travelTime = totalDistance / train.speed;
          updatedTrain.nextStationArrivalTime = currentTime + travelTime + 1; // +1 for station stop
        }
      } else {
        updatedTrain.nextStationArrivalTime = undefined;
      }
    } else {
      // Train is between stations - follow the path
      if (!train.currentPath || train.currentPath.length === 0) {
        // No path defined, initialize it
        const currentStation = stations.get(line.stationIds[train.currentStationIndex]);
        if (currentStation && nextStation) {
          const path = findTrackPath(currentStation, nextStation, tracks, line.id);
          updatedTrain.currentPath = path;
          updatedTrain.currentPathIndex = 0;
        }
      }
      
      if (updatedTrain.currentPath && updatedTrain.currentPath.length > 1) {
        const pathIndex = train.currentPathIndex ?? 0;
        const currentTarget = updatedTrain.currentPath[pathIndex + 1];
        
        if (currentTarget) {
          // Move toward current waypoint
          const movement = moveToward(
            train.position,
            currentTarget,
            train.speed,
            deltaMinutes
          );
          updatedTrain.position = movement.position;
          
          // If reached this waypoint, move to next
          if (movement.reached && pathIndex + 2 < updatedTrain.currentPath.length) {
            updatedTrain.currentPathIndex = pathIndex + 1;
          }
        }
      } else {
        // Fallback to direct movement if no path
        const movement = moveToward(
          train.position,
          nextStation.position,
          train.speed,
          deltaMinutes
        );
        updatedTrain.position = movement.position;
      }
    }

    updatedTrains.set(trainId, updatedTrain);
  });

  return updatedTrains;
}

/**
 * Update train passenger lists based on citizen boarding/exiting
 */
export function updateTrainPassengers(
  trains: Map<string, Train>,
  citizens: Map<string, Citizen>
): Map<string, Train> {
  const updatedTrains = new Map(trains);
  
  // Clear all passenger lists first
  updatedTrains.forEach(train => {
    train.passengerIds = [];
  });
  
  // Add citizens who are currently riding trains
  citizens.forEach(citizen => {
    if (citizen.state === 'riding-train' && citizen.currentTrainId) {
      const train = updatedTrains.get(citizen.currentTrainId);
      if (train && train.passengerIds.length < train.capacity) {
        train.passengerIds.push(citizen.id);
      }
    }
  });
  
  return updatedTrains;
}

/**
 * Update citizen positions and states based on elapsed time
 */
export function updateCitizens(
  citizens: Map<string, Citizen>,
  trains: Map<string, Train>,
  stations: Map<string, Station>,
  deltaMinutes: number,
  walkingSpeed: number,
  currentTime: number
): Map<string, Citizen> {
  const updatedCitizens = new Map(citizens);
  const citizensToRemove: string[] = [];

  updatedCitizens.forEach((citizen, citizenId) => {
    // Skip citizens who haven't started their trip yet
    if (currentTime < citizen.tripStartTime) {
      return;
    }
    
    // Handle citizens at their origin who need to start
    if (citizen.state === 'waiting-at-origin') {
      const updatedCitizen = { ...citizen };
      if (!citizen.route || citizen.route.segments.length === 0) {
        // No route available - citizen is unhappy and gives up
        updatedCitizen.isHappy = false;
        updatedCitizen.state = 'completed';
        citizensToRemove.push(citizenId);
        return;
      }
      
      // Start following the route
      const firstSegment = citizen.route.segments[0];
      if (firstSegment.type === 'walk') {
        updatedCitizen.state = citizen.route.segments.every(segment => segment.type === 'walk') ? 'walking-to-destination' : 'walking-to-station';
      } else if (firstSegment.type === 'ride') {
        // Route starts with a train ride, wait at that station
        updatedCitizen.state = 'waiting-at-station';
        updatedCitizen.currentStationId = firstSegment.fromStationId;
      }
      
      updatedCitizens.set(citizenId, updatedCitizen);
      return;
    }

    const updatedCitizen = { ...citizen };

    switch (citizen.state) {
      case 'walking-to-station':
      case 'walking-to-destination': {
        // Find the target position from the current route segment
        if (!citizen.route || citizen.route.segments.length === 0) break;
        
        // Find first incomplete walk segment
        let targetSegment = null;
        for (const segment of citizen.route.segments) {
          if (segment.type === 'walk') {
            targetSegment = segment;
            break;
          }
        }
        
        if (!targetSegment || targetSegment.type !== 'walk') break;
        
        const target = targetSegment.to;
        const movement = moveToward(citizen.currentPosition, target, walkingSpeed, deltaMinutes);
        updatedCitizen.currentPosition = movement.position;
        
        // Check if reached target
        if (movement.reached) {
          // Remove this segment from route
          updatedCitizen.route = {
            ...citizen.route,
            segments: citizen.route.segments.slice(1),
          };
          
          // Determine next state
          if (updatedCitizen.route.segments.length === 0) {
            // Reached final destination!
            updatedCitizen.state = 'at-destination';
            updatedCitizen.tripEndTime = currentTime;
            
            // Check happiness based on trip time
            const tripDuration = currentTime - citizen.tripStartTime;
            const threshold = citizen.route.walkingOnlyTime * 1.5; // Allow 50% more time
            updatedCitizen.isHappy = tripDuration <= threshold;
            
            // Mark for removal
            citizensToRemove.push(citizenId);
          } else {
            const nextSegment = updatedCitizen.route.segments[0];
            if (nextSegment.type === 'ride') {
              // Next segment is a train ride - wait at station
              updatedCitizen.state = 'waiting-at-station';
              // Find which station we're at
              const station = Array.from(stations.values()).find(
                s => s.position.x === target.x && s.position.y === target.y
              );
              if (station) {
                updatedCitizen.currentStationId = station.id;
              }
            } else if (nextSegment.type === 'walk') {
              // Continue walking
              updatedCitizen.state = citizen.state; // Stay in same walking state
            }
          }
        }
        break;
      }

      case 'waiting-at-station': {
        // Check if a suitable train has arrived
        if (!citizen.route || citizen.route.segments.length === 0) break;
        if (!citizen.currentStationId) break;
        
        const nextSegment = citizen.route.segments[0];
        if (nextSegment.type !== 'ride') break;
        
        const station = stations.get(citizen.currentStationId);
        if (!station) break;
        
        // Find trains at this station going in the right direction
        const suitableTrains = Array.from(trains.values()).filter(train => {
          if (train.lineId !== nextSegment.lineId) return false;
          
          // Check if train is at this station
          const trainStationId = train.lineId ? 
            Array.from(stations.values()).find(s => 
              s.position.x === train.position.x && s.position.y === train.position.y
            )?.id : null;
          
          if (trainStationId !== citizen.currentStationId) return false;

          // Check if train has capacity
          if (train.passengerIds.length >= train.capacity) return false;
          
          // Check if train is going toward destination station
          return train.direction === nextSegment.lineDirection;
        });
        
        if (suitableTrains.length > 0) {
          // Board the first suitable train
          const train = suitableTrains[0];
          updatedCitizen.state = 'riding-train';
          updatedCitizen.currentTrainId = train.id;
          updatedCitizen.currentPosition = { ...train.position };
        }
        break;
      }

      case 'riding-train': {
        // Update position to match train
        if (!citizen.currentTrainId) break;
        
        const train = trains.get(citizen.currentTrainId);
        if (!train) break;
        
        updatedCitizen.currentPosition = { ...train.position };
        
        // Check if we've reached the destination station
        if (!citizen.route || citizen.route.segments.length === 0) break;
        
        const currentSegment = citizen.route.segments[0];
        if (currentSegment.type !== 'ride') break;
        
        const destStation = stations.get(currentSegment.toStationId);
        if (!destStation) break;
        
        // Check if train is at destination station
        const distance = calculateDistance(train.position, destStation.position);
        if (distance < 0.1) {
          // Exit train
          updatedCitizen.state = 'walking-to-destination';
          updatedCitizen.currentTrainId = undefined;
          updatedCitizen.currentStationId = undefined;
          
          // Remove this segment from route
          updatedCitizen.route = {
            ...citizen.route,
            segments: citizen.route.segments.slice(1),
          };
          
          // Check if there are more segments
          if (updatedCitizen.route.segments.length === 0) {
            // This was the last segment - we're at destination
            updatedCitizen.state = 'at-destination';
            updatedCitizen.tripEndTime = currentTime;
            
            const tripDuration = currentTime - citizen.tripStartTime;
            const threshold = citizen.route.walkingOnlyTime * 1.5;
            updatedCitizen.isHappy = tripDuration <= threshold;
            
            citizensToRemove.push(citizenId);
          }
        }
        break;
      }

      case 'at-destination':
      case 'completed':
        // These citizens should be removed
        citizensToRemove.push(citizenId);
        break;
    }

    updatedCitizens.set(citizenId, updatedCitizen);
  });

  // Remove completed citizens
  citizensToRemove.forEach(id => updatedCitizens.delete(id));

  return updatedCitizens;
}

import type { DayResult } from '../models';

/**
 * Calculate the day result from current game state
 */
export function calculateDayResult(gameState: GameState): DayResult {
  const totalCitizens = gameState.stats.currentDayHappyCitizens + gameState.stats.currentDayUnhappyCitizens;
  const happyCitizens = gameState.stats.currentDayHappyCitizens;
  const unhappyCitizens = gameState.stats.currentDayUnhappyCitizens;
  const happinessRate = totalCitizens > 0 ? (happyCitizens / totalCitizens) * 100 : 0;
  const passed = happinessRate >= 50;
  
  const budgetEarned = gameState.city.config.budgetBaseline + 
    (happyCitizens * gameState.city.config.budgetBonusPerHappyCitizen);

  return {
    day: gameState.city.currentDay,
    totalCitizens,
    happyCitizens,
    unhappyCitizens,
    happinessRate,
    budgetEarned,
    passed,
  };
}

/**
 * Roll over to the next day and calculate end-of-day statistics
 */
export function rolloverToNextDay(gameState: GameState): GameState {
  // Calculate day statistics from current day
  const totalCitizens = gameState.stats.currentDayHappyCitizens + gameState.stats.currentDayUnhappyCitizens;
  const happyCitizens = gameState.stats.currentDayHappyCitizens;
  const unhappyCitizens = gameState.stats.currentDayUnhappyCitizens;
  const happinessRate = totalCitizens > 0 ? (happyCitizens / totalCitizens) * 100 : 0;
  const passed = happinessRate >= 50;

  // Calculate budget earned
  const budgetEarned = gameState.city.config.budgetBaseline + 
    (happyCitizens * gameState.city.config.budgetBonusPerHappyCitizen);

  // Update statistics
  const updatedStats = {
    ...gameState.stats,
    totalDaysPlayed: gameState.stats.totalDaysPlayed + 1,
    totalCitizensTransported: gameState.stats.totalCitizensTransported + totalCitizens,
    totalHappyCitizens: gameState.stats.totalHappyCitizens + happyCitizens,
    totalUnhappyCitizens: gameState.stats.totalUnhappyCitizens + unhappyCitizens,
    currentDayHappyCitizens: 0, // Reset for new day
    currentDayUnhappyCitizens: 0, // Reset for new day
    happinessRate: 0, // Reset for new day
    totalMoneyEarned: gameState.stats.totalMoneyEarned + budgetEarned,
  };

  // Calculate new population (growth per month, prorated per day)
  const daysInMonth = 30;
  const dailyGrowthRate = gameState.city.config.populationGrowthRate / daysInMonth;
  const newPopulation = Math.floor(gameState.city.population * (1 + dailyGrowthRate));

  // Check if month rolled over
  const newDay = gameState.city.currentDay + 1;
  const newMonth = newDay > daysInMonth ? gameState.city.currentMonth + 1 : gameState.city.currentMonth;
  const adjustedDay = newDay > daysInMonth ? 1 : newDay;

  // Add bonus budget at month rollover
  const monthlyBonus = newDay > daysInMonth ? gameState.city.config.budgetBaseline : 0;

  return {
    ...gameState,
    city: {
      ...gameState.city,
      currentDay: adjustedDay,
      currentMonth: newMonth,
      population: newPopulation,
      budget: gameState.city.budget + budgetEarned + monthlyBonus,
    },
    stats: updatedStats,
    simulationTime: 0, // Reset to midnight
    isSimulating: false, // Stop simulation
    citizens: new Map(), // Clear citizens for new day
    status: passed ? gameState.status : 'game-over',
  };
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
    return rolloverToNextDay(gameState);
  }

  // Update trains
  let updatedTrains = updateTrains(
    gameState.railNetwork.trains,
    gameState.railNetwork.lines,
    gameState.railNetwork.stations,
    gameState.railNetwork.tracks,
    deltaMinutes,
    newTime
  );

  // Update citizens
  const updatedCitizens = updateCitizens(
    gameState.citizens,
    updatedTrains,
    gameState.railNetwork.stations,
    deltaMinutes,
    gameState.city.config.walkingSpeed,
    newTime
  );
  
  // Update train passenger lists based on citizen states
  updatedTrains = updateTrainPassengers(updatedTrains, updatedCitizens);

  // Update current day statistics
  const totalCitizens = updatedCitizens.size;
  const happyCitizens = Array.from(updatedCitizens.values()).filter(c => c.isHappy).length;
  const unhappyCitizens = totalCitizens - happyCitizens;
  const currentHappinessRate = totalCitizens > 0 ? (happyCitizens / totalCitizens) * 100 : 0;

  return {
    ...gameState,
    simulationTime: newTime,
    railNetwork: {
      ...gameState.railNetwork,
      trains: updatedTrains,
    },
    citizens: updatedCitizens,
    stats: {
      ...gameState.stats,
      currentDayHappyCitizens: happyCitizens,
      currentDayUnhappyCitizens: unhappyCitizens,
      happinessRate: currentHappinessRate,
    },
  };
}

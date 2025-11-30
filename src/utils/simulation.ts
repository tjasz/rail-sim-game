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
 * Update station waiting lists based on citizens waiting at stations
 */
export function updateStationWaitingLists(
  stations: Map<string, Station>,
  citizens: Map<string, Citizen>
): Map<string, Station> {
  const updatedStations = new Map(stations);
  
  // Clear all waiting lists first
  updatedStations.forEach(station => {
    station.waitingCitizens = new Map();
  });
  
  // Add citizens who are currently waiting at stations
  citizens.forEach(citizen => {
    if (citizen.state === 'waiting-at-station' && citizen.currentStationId) {
      const station = updatedStations.get(citizen.currentStationId);
      if (!station) return;
      
      // Determine which line the citizen is waiting for
      if (citizen.route && citizen.route.segments.length > 0) {
        const nextSegment = citizen.route.segments[0];
        if (nextSegment.type === 'ride') {
          const lineId = nextSegment.lineId;
          
          // Initialize the waiting list for this line if it doesn't exist
          if (!station.waitingCitizens.has(lineId)) {
            station.waitingCitizens.set(lineId, []);
          }
          
          // Add citizen to the waiting list
          station.waitingCitizens.get(lineId)!.push(citizen.id);
        }
      }
    }
  });
  
  return updatedStations;
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
  const updatedTrains = new Map(trains);

  // Group citizens by state
  const citizensByState = new Map<string, Citizen[]>();
  updatedCitizens.forEach(citizen => {
    // Skip citizens who haven't started their trip yet
    if (currentTime < citizen.tripStartTime) {
      return;
    }
    
    const state = citizen.state;
    if (!citizensByState.has(state)) {
      citizensByState.set(state, []);
    }
    citizensByState.get(state)!.push(citizen);
  });

  // 1. Update citizens waiting at origin
  const waitingAtOrigin = citizensByState.get('waiting-at-origin') || [];
  for (const citizen of waitingAtOrigin) {
    const updatedCitizen = { ...citizen };
    
    if (!citizen.route || citizen.route.segments.length === 0) {
      // No route available - citizen is unhappy and gives up if its destination and origin differ
      updatedCitizen.isHappy = updatedCitizen.originNeighborhoodId === updatedCitizen.destinationNeighborhoodId;
      updatedCitizen.state = 'completed';
      updatedCitizens.set(citizen.id, updatedCitizen);
      continue;
    }
    
    // Start following the route
    const firstSegment = citizen.route.segments[0];
    if (firstSegment.type === 'walk') {
      updatedCitizen.state = citizen.route.segments.every(segment => segment.type === 'walk') 
        ? 'walking-to-destination' 
        : 'walking-to-station';
    } else if (firstSegment.type === 'ride') {
      // Route starts with a train ride, wait at that station
      updatedCitizen.state = 'waiting-at-station';
      updatedCitizen.currentStationId = firstSegment.fromStationId;
    }
    
    updatedCitizens.set(citizen.id, updatedCitizen);
  }

  // 2. Update walking citizens
  const walkingCitizens = [
    ...(citizensByState.get('walking-to-station') || []),
    ...(citizensByState.get('walking-to-destination') || [])
  ];
  
  for (const citizen of walkingCitizens) {
    if (!citizen.route || citizen.route.segments.length === 0) continue;
    
    // Find first incomplete walk segment
    let targetSegment = null;
    for (const segment of citizen.route.segments) {
      if (segment.type === 'walk') {
        targetSegment = segment;
        break;
      }
    }
    
    if (!targetSegment || targetSegment.type !== 'walk') continue;
    
    const updatedCitizen = { ...citizen };
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
          // Continue walking - state stays the same
          updatedCitizen.state = citizen.state;
        }
      }
    }
    
    updatedCitizens.set(citizen.id, updatedCitizen);
  }

  // 3. Update citizens riding trains - iterate over trains
  updatedTrains.forEach(train => {
    // Find station at train's current position
    const trainStation = Array.from(stations.values()).find(
      s => calculateDistance(s.position, train.position) < 0.1
    );
    
    if (!trainStation) {
      // Train not at a station - just update passenger positions
      for (const passengerId of train.passengerIds) {
        const citizen = updatedCitizens.get(passengerId);
        if (citizen) {
          const updatedCitizen = { ...citizen };
          updatedCitizen.currentPosition = { ...train.position };
          updatedCitizens.set(passengerId, updatedCitizen);
        }
      }
      return;
    }
    
    // Train is at a station - check if passengers need to exit
    const passengersToRemove: string[] = [];
    
    for (const passengerId of train.passengerIds) {
      const citizen = updatedCitizens.get(passengerId);
      if (!citizen || !citizen.route || citizen.route.segments.length === 0) continue;
      
      const currentSegment = citizen.route.segments[0];
      if (currentSegment.type !== 'ride') continue;
      
      // Check if this is the destination station
      if (currentSegment.toStationId === trainStation.id) {
        // Exit train
        const updatedCitizen = { ...citizen };
        updatedCitizen.currentPosition = { ...train.position };
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
        } else {
          // If next segment is a ride, wait at this station for the train
          const nextSegment = updatedCitizen.route.segments[0];
          if (nextSegment.type === 'ride') {
            updatedCitizen.state = 'waiting-at-station';
            updatedCitizen.currentStationId = nextSegment.fromStationId;
          } else if (nextSegment.type === 'walk') {
            updatedCitizen.state = 'walking-to-destination';
          }
        }
        
        updatedCitizens.set(passengerId, updatedCitizen);
        passengersToRemove.push(passengerId);
      } else {
        // Just update position
        const updatedCitizen = { ...citizen };
        updatedCitizen.currentPosition = { ...train.position };
        updatedCitizens.set(passengerId, updatedCitizen);
      }
    }
    
    // Remove exited passengers from train
    train.passengerIds = train.passengerIds.filter(id => !passengersToRemove.includes(id));
  });

  // 4. Update citizens waiting at stations - iterate over stations
  stations.forEach(station => {
    // Find all trains at this station
    const trainsAtStation = Array.from(updatedTrains.values()).filter(
      train => calculateDistance(train.position, station.position) < 0.1
    );
    
    if (trainsAtStation.length === 0) return;
    
    // Get waiting citizens at this station
    const waitingCitizens = (citizensByState.get('waiting-at-station') || [])
      .filter(c => c.currentStationId === station.id);
    
    // Group waiting citizens by line and direction
    const waitingByLineAndDirection = new Map<string, Citizen[]>();
    for (const citizen of waitingCitizens) {
      if (!citizen.route || citizen.route.segments.length === 0) continue;
      
      const nextSegment = citizen.route.segments[0];
      if (nextSegment.type !== 'ride') continue;
      
      const key = `${nextSegment.lineId}-${nextSegment.lineDirection}`;
      if (!waitingByLineAndDirection.has(key)) {
        waitingByLineAndDirection.set(key, []);
      }
      waitingByLineAndDirection.get(key)!.push(citizen);
    }
    
    // For each train at the station, board waiting citizens
    for (const train of trainsAtStation) {
      const key = `${train.lineId}-${train.direction}`;
      const waitingForThisTrain = waitingByLineAndDirection.get(key) || [];
      
      const availableCapacity = train.capacity - train.passengerIds.length;
      const citizensToBoard = waitingForThisTrain.slice(0, availableCapacity);
      
      for (const citizen of citizensToBoard) {
        const updatedCitizen = { ...citizen };
        updatedCitizen.state = 'riding-train';
        updatedCitizen.currentTrainId = train.id;
        updatedCitizen.currentPosition = { ...train.position };
        
        updatedCitizens.set(citizen.id, updatedCitizen);
        train.passengerIds.push(citizen.id);
      }
    }
  });

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
  
  // Update station waiting lists based on citizen states
  const updatedStations = updateStationWaitingLists(
    gameState.railNetwork.stations,
    updatedCitizens
  );

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
      stations: updatedStations,
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

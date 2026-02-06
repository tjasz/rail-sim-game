// Utility functions for game simulation

import type { GameState, Citizen, Train, Line, Neighborhood, Position } from '../models';
import { generateSingleTrip } from './tripGeneration';

export const MINUTES_PER_DAY = 300; // 300 minutes in a day
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
 * Calculate the heading angle (in degrees) from one position to another
 * 0 = east, 90 = south, 180 = west, 270 = north
 */
export function calculateHeading(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fallback: number = 0
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (dx === 0 && dy === 0) {
    return fallback;
  }
  
  // atan2 returns angle in radians from -π to π, with 0 pointing right (east)
  // and increasing counter-clockwise
  const radians = Math.atan2(dy, dx);
  
  // Convert to degrees (0-360), with 0 = east and increasing clockwise
  let degrees = radians * (180 / Math.PI);
  
  // Normalize to 0-360 range
  if (degrees < 0) {
    degrees += 360;
  }
  
  return degrees;
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
 * Create a direct path between two neighborhoods (no track waypoints)
 */
export function findDirectPath(
  fromNeighborhood: Neighborhood,
  toNeighborhood: Neighborhood
): Position[] {
  // Just return direct line between the two neighborhoods
  return [fromNeighborhood.position, toNeighborhood.position];
}

/**
 * Update train positions based on elapsed time
 */
export function updateTrains(
  trains: Map<string, Train>,
  lines: Map<string, Line>,
  neighborhoods: Neighborhood[],
  deltaMinutes: number,
  currentTime: number
): Map<string, Train> {
  const updatedTrains = new Map(trains);
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));

  updatedTrains.forEach((train, trainId) => {
    const line = lines.get(train.lineId);
    if (!line || !line.isActive || line.neighborhoodIds.length < 2) {
      return;
    }

    const updatedTrain = { ...train };
    
    // Determine next neighborhood
    const nextNeighborhoodIndex = train.direction === 'forward'
      ? train.currentNeighborhoodIndex + 1
      : train.currentNeighborhoodIndex - 1;
    
    if (nextNeighborhoodIndex < 0 || nextNeighborhoodIndex >= line.neighborhoodIds.length) {
      // No next neighborhood (shouldn't happen with proper initialization)
      updatedTrains.set(trainId, updatedTrain);
      return;
    }
    
    const nextNeighborhoodId = line.neighborhoodIds[nextNeighborhoodIndex];
    const nextNeighborhood = neighborhoodMap.get(nextNeighborhoodId);
    
    if (!nextNeighborhood) {
      updatedTrains.set(trainId, updatedTrain);
      return;
    }

    // Check if train should arrive at next neighborhood
    if (train.nextNeighborhoodArrivalTime && currentTime >= train.nextNeighborhoodArrivalTime) {
      // Arrive at neighborhood - snap to neighborhood position
      updatedTrain.position = { ...nextNeighborhood.position };
      updatedTrain.currentNeighborhoodIndex = nextNeighborhoodIndex;
      updatedTrain.currentPath = undefined;
      updatedTrain.currentPathIndex = undefined;

      // Check if we need to reverse direction
      if (train.direction === 'forward' && nextNeighborhoodIndex >= line.neighborhoodIds.length - 1) {
        updatedTrain.direction = 'backward';
      } else if (train.direction === 'backward' && nextNeighborhoodIndex <= 0) {
        updatedTrain.direction = 'forward';
      }

      // Calculate next arrival time and path
      const followingIndex = updatedTrain.direction === 'forward'
        ? updatedTrain.currentNeighborhoodIndex + 1
        : updatedTrain.currentNeighborhoodIndex - 1;

      if (followingIndex >= 0 && followingIndex < line.neighborhoodIds.length) {
        const followingNeighborhoodId = line.neighborhoodIds[followingIndex];
        const followingNeighborhood = neighborhoodMap.get(followingNeighborhoodId);
        const currentNeighborhood = neighborhoodMap.get(line.neighborhoodIds[updatedTrain.currentNeighborhoodIndex]);

        if (followingNeighborhood && currentNeighborhood) {
          // Find direct path between neighborhoods
          const path = findDirectPath(currentNeighborhood, followingNeighborhood);
          updatedTrain.currentPath = path;
          updatedTrain.currentPathIndex = 0;
          
          // Calculate total distance along path
          let totalDistance = 0;
          for (let i = 0; i < path.length - 1; i++) {
            totalDistance += calculateDistance(path[i], path[i + 1]);
          }
          
          const travelTime = totalDistance / train.speed;
          updatedTrain.nextNeighborhoodArrivalTime = currentTime + travelTime + 1; // +1 for stop
        }
      } else {
        updatedTrain.nextNeighborhoodArrivalTime = undefined;
      }
    } else {
      // Train is between neighborhoods - follow the path
      if (!train.currentPath || train.currentPath.length === 0) {
        // No path defined, initialize it
        const currentNeighborhood = neighborhoodMap.get(line.neighborhoodIds[train.currentNeighborhoodIndex]);
        if (currentNeighborhood && nextNeighborhood) {
          const path = findDirectPath(currentNeighborhood, nextNeighborhood);
          updatedTrain.currentPath = path;
          updatedTrain.currentPathIndex = 0;
        }
      }
      
      if (updatedTrain.currentPath && updatedTrain.currentPath.length > 1) {
        const pathIndex = train.currentPathIndex ?? 0;
        const currentTarget = updatedTrain.currentPath[pathIndex + 1];
        
        if (currentTarget) {
          // Calculate heading before moving
          updatedTrain.heading = calculateHeading(train.position, currentTarget, train.heading ?? 0);
          
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
        // Calculate heading before moving
        updatedTrain.heading = calculateHeading(train.position, nextNeighborhood.position, train.heading ?? 0);
        
        const movement = moveToward(
          train.position,
          nextNeighborhood.position,
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
 * Update neighborhood waiting lists based on citizens waiting at neighborhoods
 */
export function updateNeighborhoodWaitingLists(
  neighborhoods: Neighborhood[],
  citizens: Map<string, Citizen>
): Neighborhood[] {
  const updatedNeighborhoods = neighborhoods.map(n => ({ 
    ...n, 
    waitingCitizens: new Map<string, string[]>(),
    crowdingTime: n.crowdingTime || 0 
  }));
  const neighborhoodMap = new Map(updatedNeighborhoods.map(n => [n.id, n]));
  
  // Add citizens who are currently waiting at neighborhoods
  citizens.forEach(citizen => {
    if (citizen.state === 'waiting-at-station' && citizen.currentNeighborhoodId) {
      const neighborhood = neighborhoodMap.get(citizen.currentNeighborhoodId);
      if (!neighborhood) return;
      
      // Determine which line the citizen is waiting for
      if (citizen.route && citizen.route.segments.length > 0) {
        const nextSegment = citizen.route.segments[0];
        if (nextSegment.type === 'ride') {
          const lineId = nextSegment.lineId;
          const waitingCitizens = neighborhood.waitingCitizens ?? new Map();
          
          // Initialize the waiting list for this line if it doesn't exist
          if (!waitingCitizens.has(lineId)) {
            waitingCitizens.set(lineId, []);
          }
          
          // Add citizen to the waiting list
          waitingCitizens.get(lineId)!.push(citizen.id);
        }
      }
      else {
        // No route - just add to a generic waiting list (could be improved)
        const genericLineId = 'generic';
        const waitingCitizens = neighborhood.waitingCitizens ?? new Map();
        if (!waitingCitizens.has(genericLineId)) {
          waitingCitizens.set(genericLineId, []);
        }
        waitingCitizens.get(genericLineId)!.push(citizen.id);
      }
    }
  });
  
  return updatedNeighborhoods;
}

/**
 * Update citizen positions and states based on elapsed time
 */
export function updateCitizens(
  citizens: Map<string, Citizen>,
  trains: Map<string, Train>,
  neighborhoods: Neighborhood[],
  lines: Map<string, Line>,
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
      // No route available - wait at neighborhood indefinitely
      updatedCitizen.state = 'waiting-at-station';
      updatedCitizen.currentNeighborhoodId = citizen.originNeighborhoodId;
      updatedCitizens.set(citizen.id, updatedCitizen);
      continue;
    }
    
    // Start following the route
    const firstSegment = citizen.route.segments[0];
    if (firstSegment.type === 'ride') {
      updatedCitizen.state = 'waiting-at-station';
      updatedCitizen.currentNeighborhoodId = firstSegment.fromNeighborhoodId;
    }
    
    updatedCitizens.set(citizen.id, updatedCitizen);
  }

  // 3. Update citizens riding trains - iterate over trains
  updatedTrains.forEach(train => {
    // Find neighborhood at train's current position
    const trainNeighborhood = neighborhoods.find(
      n => calculateDistance(n.position, train.position) < 0.1
    );
    
    if (!trainNeighborhood) {
      // Train not at a neighborhood - just update passenger positions
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
    
    // Train is at a neighborhood - check if passengers need to exit
    const passengersToRemove: string[] = [];
    
    for (const passengerId of train.passengerIds) {
      const citizen = updatedCitizens.get(passengerId);
      if (!citizen || !citizen.route || citizen.route.segments.length === 0) continue;
      
      const currentSegment = citizen.route.segments[0];
      if (currentSegment.type !== 'ride') continue;
      
      // Check if this is the destination neighborhood
      if (currentSegment.toNeighborhoodId === trainNeighborhood.id) {
        // Exit train
        const updatedCitizen = { ...citizen };
        updatedCitizen.currentPosition = { ...train.position };
        updatedCitizen.currentTrainId = undefined;
        updatedCitizen.currentNeighborhoodId = undefined;
        
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
        } else {
          // If next segment is a ride, wait at this neighborhood for the train
          const nextSegment = updatedCitizen.route.segments[0];
          if (nextSegment.type === 'ride') {
            updatedCitizen.state = 'waiting-at-station';
            updatedCitizen.currentNeighborhoodId = nextSegment.fromNeighborhoodId;
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

  // 4. Update citizens waiting at neighborhoods - iterate over neighborhoods
  neighborhoods.forEach(neighborhood => {
    // Find all trains at this neighborhood
    const trainsAtNeighborhood = Array.from(updatedTrains.values()).filter(
      train => calculateDistance(train.position, neighborhood.position) < 0.1
    );
    
    if (trainsAtNeighborhood.length === 0) return;
    
    // Get waiting citizens at this neighborhood
    const waitingCitizens = (citizensByState.get('waiting-at-station') || [])
      .filter(c => c.currentNeighborhoodId === neighborhood.id);
    
    // For each train at the neighborhood, board waiting citizens who can use this train
    for (const train of trainsAtNeighborhood) {
      const line = lines.get(train.lineId);
      if (!line || !line.isActive) continue;
      
      // Determine which neighborhoods this train will visit based on its direction
      const currentIndex = train.currentNeighborhoodIndex;
      const neighborhoodsAhead: string[] = [];
      
      if (train.direction === 'forward') {
        // Train is going forward through the line
        neighborhoodsAhead.push(...line.neighborhoodIds.slice(currentIndex + 1));
      } else {
        // Train is going backward through the line
        for (let i = currentIndex - 1; i >= 0; i--) {
          neighborhoodsAhead.push(line.neighborhoodIds[i]);
        }
      }
      
      // Find citizens who want to go to any neighborhood this train will visit
      const eligibleCitizens: Citizen[] = [];
      for (const citizen of waitingCitizens) {
        if (!citizen.route || citizen.route.segments.length === 0) continue;
        
        const nextSegment = citizen.route.segments[0];
        if (nextSegment.type !== 'ride') continue;
        
        // Check if this train goes to the citizen's desired neighborhood
        if (neighborhoodsAhead.includes(nextSegment.toNeighborhoodId)) {
          eligibleCitizens.push(citizen);
        }
      }
      
      // Board as many eligible citizens as possible
      const availableCapacity = train.capacity - train.passengerIds.length;
      const citizensToBoard = eligibleCitizens.slice(0, availableCapacity);
      
      for (const citizen of citizensToBoard) {
        const updatedCitizen = { ...citizen };
        updatedCitizen.state = 'riding-train';
        updatedCitizen.currentTrainId = train.id;
        updatedCitizen.currentPosition = { ...train.position };
        
        updatedCitizens.set(citizen.id, updatedCitizen);
        train.passengerIds.push(citizen.id);
        
        // Remove from waiting list so they don't board another train
        const index = waitingCitizens.indexOf(citizen);
        if (index > -1) {
          waitingCitizens.splice(index, 1);
        }
      }
    }
  });

  // 5. Update citizens at destination - move them to completed state
  const atDestination = citizensByState.get('at-destination') || [];
  for (const citizen of atDestination) {
    const updatedCitizen = { ...citizen };
    if (citizen.state !== 'completed') {
      updatedCitizen.state = 'completed';
      updatedCitizens.set(citizen.id, updatedCitizen);
    }
  }

  // Remove citizens who were already in completed state
  const completedCitizens = citizensByState.get('completed') || [];
  for (const citizen of completedCitizens) {
    updatedCitizens.delete(citizen.id);
  }

  return updatedCitizens;
}

import type { DayResult } from '../models';

/**
 * Calculate the day result from current game state
 */
export function calculateDayResult(gameState: GameState): DayResult {
  const budgetEarned = gameState.city.config.budgetBaseline;
  const enginesEarned = gameState.city.config.enginesPerDay;
  const linesEarned = gameState.city.config.linesPerDay;

  return {
    day: gameState.city.currentDay,
    budgetEarned,
    enginesEarned,
    linesEarned,
  };
}

/**
 * Roll over to the next day and calculate end-of-day statistics
 */
export function rolloverToNextDay(gameState: GameState): GameState {
  // Calculate budget earned, engines earned, and lines earned
  const budgetEarned = gameState.city.config.budgetBaseline;
  const enginesEarned = gameState.city.config.enginesPerDay;
  const linesEarned = gameState.city.config.linesPerDay;

  // Create new unassigned trains
  const updatedTrains = new Map(gameState.railNetwork.trains);
  for (let i = 0; i < enginesEarned; i++) {
    const newTrainId = `train-${Date.now()}-${i}`;
    const newTrain = {
      id: newTrainId,
      lineId: 'unassigned',
      currentNeighborhoodIndex: 0,
      direction: 'forward' as const,
      position: { x: 0, y: 0 },
      passengerIds: [],
      capacity: gameState.city.config.trainCapacity,
      speed: gameState.city.config.trainSpeed,
    };
    updatedTrains.set(newTrainId, newTrain);
  }

  // Update statistics
  const updatedStats = {
    ...gameState.stats,
    totalMoneyEarned: gameState.stats.totalMoneyEarned + budgetEarned,
    totalTrainsPurchased: gameState.stats.totalTrainsPurchased + enginesEarned,
  };

  const newDay = gameState.city.currentDay + 1;

  return {
    ...gameState,
    city: {
      ...gameState.city,
      currentDay: newDay,
      budget: gameState.city.budget + budgetEarned,
    },
    railNetwork: {
      ...gameState.railNetwork,
      trains: updatedTrains,
    },
    allowedLines: gameState.allowedLines + linesEarned,
    stats: updatedStats,
    simulationTime: gameState.simulationTime, // Continue tracking total time
    isSimulating: false, // Stop simulation
    citizens: new Map(), // Clear citizens for new day
  };
}

import type { CityConfig } from '../models';
import type { RailNetwork } from '../models';
import { calculateRoute } from './pathfinding';

/**
 * Recalculate routes for citizens who need them (e.g., starting a new trip)
 */
function recalculateRoutesForCitizens(
  citizens: Map<string, Citizen>,
  config: CityConfig,
  railNetwork: RailNetwork
): Map<string, Citizen> {
  const updatedCitizens = new Map<string, Citizen>();
  const neighborhoods = config.neighborhoods;
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  
  citizens.forEach(citizen => {
    // Only recalculate for citizens who need routes (waiting at origin without a route)
    if (citizen.state === 'waiting-at-origin' && !citizen.route) {
      const originNeighborhood = neighborhoodMap.get(citizen.originNeighborhoodId);
      const destNeighborhood = neighborhoodMap.get(citizen.destinationNeighborhoodId);
      
      if (!originNeighborhood || !destNeighborhood) {
        updatedCitizens.set(citizen.id, citizen);
        return;
      }
      
      // Calculate route with rail network
      const segments = calculateRoute(
        originNeighborhood.position,
        destNeighborhood.position,
        railNetwork,
        config.neighborhoods,
        config.trainSpeed,
        config.timePerStationStop
      );
      
      const totalEstimatedTime = segments.reduce(
        (sum: number, seg: any) => sum + seg.estimatedTime, 
        0
      );
      
      updatedCitizens.set(citizen.id, {
        ...citizen,
        route: {
          segments,
          totalEstimatedTime,
        },
      });
    } else {
      updatedCitizens.set(citizen.id, citizen);
    }
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
  const currentDay = gameState.city.currentDay;
  const expectedDayEndTime = (currentDay+1) * MINUTES_PER_DAY;

  // Check if day is over - stop simulation but don't rollover yet
  // The UI will show the day result modal and handle the rollover
  if (newTime >= expectedDayEndTime) {
    return {
      ...gameState,
      simulationTime: expectedDayEndTime - 1, // Cap at end of current day
      isSimulating: false, // Stop simulation
    };
  }

  const maxNeighborhoods = gameState.city.config.neighborhoods.length;
  let updatedActiveNeighborhoodCount = Math.min(
      gameState.city.config.activeNeighborhoodsAtTime(newTime),
      maxNeighborhoods
    );

  // Generate new trips if needed
  let currentCitizens = new Map(gameState.citizens);
  let tripsGenerated = gameState.totalTripsStarted;
  const tripsNeeded = gameState.city.config.totalTripsStartedAtTime(gameState.simulationTime);
  
  // Keep generating trips while we're past the next generation time and haven't hit the limit
  while (tripsGenerated < tripsNeeded) {
    const activeNeighborhoods = gameState.city.config.neighborhoods.slice(0, updatedActiveNeighborhoodCount);
    
    // Use a counter based on current map size to ensure unique IDs
    const citizenIdCounter = Date.now() + currentCitizens.size;
    
    const newCitizen = generateSingleTrip(
      activeNeighborhoods,
      gameState.simulationTime,
      citizenIdCounter
    );
    
    if (newCitizen) {
      // Calculate route for the new citizen
      const originNeighborhood = activeNeighborhoods.find(n => n.id === newCitizen.originNeighborhoodId);
      const destNeighborhood = activeNeighborhoods.find(n => n.id === newCitizen.destinationNeighborhoodId);
      
      if (originNeighborhood && destNeighborhood) {
        const segments = calculateRoute(
          originNeighborhood.position,
          destNeighborhood.position,
          gameState.railNetwork,
          activeNeighborhoods,
          gameState.city.config.trainSpeed,
          gameState.city.config.timePerStationStop,
        );
        
        const totalEstimatedTime = segments.reduce((sum: number, seg: any) => sum + seg.estimatedTime, 0);

        const citizenWithRoute = {
          ...newCitizen,
          route: {
            segments,
            totalEstimatedTime,
          },
        };
        
        currentCitizens.set(citizenWithRoute.id, citizenWithRoute);
      }
    }
    
    tripsGenerated++;
  }

  const newCitizens = new Map([...gameState.citizens, ...currentCitizens]);

  // Get active neighborhoods for this simulation step
  const activeNeighborhoods = gameState.city.config.neighborhoods.slice(0, updatedActiveNeighborhoodCount);

  // Update trains
  let updatedTrains = updateTrains(
    gameState.railNetwork.trains,
    gameState.railNetwork.lines,
    activeNeighborhoods,
    deltaMinutes,
    newTime
  );

  // Update citizens
  let updatedCitizens = updateCitizens(
    newCitizens,
    updatedTrains,
    activeNeighborhoods,
    gameState.railNetwork.lines,
    newTime
  );
  
  // Recalculate routes for citizens who need them (starting new trips)
  updatedCitizens = recalculateRoutesForCitizens(
    updatedCitizens,
    gameState.city.config,
    gameState.railNetwork
  );
  
  // Update train passenger lists based on citizen states
  updatedTrains = updateTrainPassengers(updatedTrains, updatedCitizens);
  
  // Update neighborhood waiting lists based on citizen states
  const updatedNeighborhoods = updateNeighborhoodWaitingLists(
    activeNeighborhoods,
    updatedCitizens
  );
  
  // Update crowding time for each neighborhood and check for game-over condition
  const stationCapacity = gameState.city.config.stationCapacity;
  const crowdingTimeLimit = gameState.city.config.stationCrowdingTimeLimit;
  let isGameOver = false;
  
  const neighborhoodsWithCrowding = updatedNeighborhoods.map(neighborhood => {
    // Count total waiting passengers at this station
    const totalWaiting = Array.from(neighborhood.waitingCitizens?.values() || [])
      .reduce((sum, citizens) => sum + citizens.length, 0);
    
    const isCrowded = totalWaiting > stationCapacity;
    const currentCrowdingTime = neighborhood.crowdingTime || 0;
    
    let newCrowdingTime: number;
    if (isCrowded) {
      // Station is crowded - increment crowding time
      newCrowdingTime = currentCrowdingTime + deltaMinutes;
      
      // Check if crowding time exceeds limit
      if (newCrowdingTime >= crowdingTimeLimit) {
        isGameOver = true;
      }
    } else {
      // Station is not crowded - reset crowding time to 0
      newCrowdingTime = 0;
    }
    
    return {
      ...neighborhood,
      crowdingTime: newCrowdingTime,
    };
  });
  
  // Update the neighborhoods in the city config with the updated waiting lists and crowding times
  const updatedConfig = {
    ...gameState.city.config,
    neighborhoods: gameState.city.config.neighborhoods.map((n, i) => {
      if (i < neighborhoodsWithCrowding.length) {
        return neighborhoodsWithCrowding[i];
      }
      return n;
    }),
  };

  return {
    ...gameState,
    status: isGameOver ? 'game-over' : gameState.status,
    simulationTime: newTime,
    activeNeighborhoodCount: updatedActiveNeighborhoodCount,
    totalTripsStarted: tripsGenerated,
    city: {
      ...gameState.city,
      config: updatedConfig,
    },
    railNetwork: {
      ...gameState.railNetwork,
      trains: updatedTrains,
    },
    citizens: updatedCitizens,
    stats: {
      ...gameState.stats,
      totalCitizensTransported: gameState.stats.totalCitizensTransported + (Array.from(updatedCitizens.values()).filter(c => c.state === 'completed').length),
    },
  };
}

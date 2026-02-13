// Trip generation and citizen initialization

import type { 
  CityConfig, 
  Neighborhood, 
  TripMatrix, 
  Citizen, 
  RailNetwork,
  Train,
  Line,
  DailyTrip
} from '../models';
import type { Shift } from '../models/Neighborhood';
import { calculateDistance } from './simulation';
import { calculateRoute } from './pathfinding';

// Trip purpose probabilities
const TRIP_PROBABILITIES = {
  HOME_TO_WORK: 0.40,
  WORK_TO_HOME: 0.40,
  WORK_TO_RECREATION: 0.10,
  RECREATION_TO_HOME: 0.10,
};

/**
 * Get active neighborhoods based on the active neighborhood count
 */
export function getActiveNeighborhoods(
  neighborhoods: Neighborhood[],
  activeNeighborhoodCount: number
): Neighborhood[] {  
  return neighborhoods.slice(0, activeNeighborhoodCount);
}

/**
 * Calculate total population from active neighborhoods
 */
export function calculatePopulation(
  neighborhoods: Neighborhood[],
  activeNeighborhoodCount: number
): number {
  const activeNeighborhoods = getActiveNeighborhoods(neighborhoods, activeNeighborhoodCount);
  return activeNeighborhoods.reduce((sum, n) => sum + n.residents, 0);
}

/**
 * Assign a home neighborhood to a citizen based on resident counts
 */
function assignHomeNeighborhood(
  activeNeighborhoods: Neighborhood[]
): Neighborhood {
  const totalResidents = activeNeighborhoods.reduce((sum, n) => sum + n.residents, 0);
  const random = Math.random() * totalResidents;
  
  let cumulative = 0;
  for (const neighborhood of activeNeighborhoods) {
    cumulative += neighborhood.residents;
    if (random <= cumulative) {
      return neighborhood;
    }
  }
  
  return activeNeighborhoods[activeNeighborhoods.length - 1];
}

/**
 * Assign a work neighborhood based on job proportions
 */
function assignWorkNeighborhood(
  activeNeighborhoods: Neighborhood[]
): Neighborhood {
  const random = Math.random();

  const totalJobHeat = activeNeighborhoods.reduce((sum, n) => sum + n.proportionOfJobs, 0);
  const scaledRandom = random * totalJobHeat;
  
  let cumulative = 0;
  for (const neighborhood of activeNeighborhoods) {
    cumulative += neighborhood.proportionOfJobs;
    if (scaledRandom <= cumulative) {
      return neighborhood;
    }
  }
  
  return activeNeighborhoods[activeNeighborhoods.length - 1];
}

/**
 * Assign a shift from the available shifts at a work neighborhood
 */
function assignShift(workNeighborhood: Neighborhood): Shift {
  const shifts = workNeighborhood.availableShifts;
  const randomIndex = Math.floor(Math.random() * shifts.length);
  return shifts[randomIndex];
}

/**
 * Check if a shift crosses midnight
 */
function shiftCrossesMidnight(shift: Shift): boolean {
  const [start, end] = shift;
  return end <= start;
}

/**
 * Generate a citizen's daily schedule based on their shift and neighborhoods
 */
function generateDailySchedule(
  homeNeighborhoodId: string,
  workNeighborhoodId: string,
  shift: Shift,
  activeNeighborhoods: Neighborhood[]
): DailyTrip[] {
  const schedule: DailyTrip[] = [];
  const [shiftStart, shiftEnd] = shift;
  const crossesMidnight = shiftCrossesMidnight(shift);
  
  // Helper function to add random offset of -30 to 30 minutes (in hours)
  const addRandomOffset = (time: number): number => {
    const offsetMinutes = Math.floor(Math.random() * 61) - 30; // -30 to 30 minutes
    return time + (offsetMinutes / 60); // Convert minutes to hours
  };
  
  if (!crossesMidnight) {
    // Regular shift: start at home, go to work, optionally recreation, end at home
    
    // Trip to work
    if (homeNeighborhoodId !== workNeighborhoodId) {
      schedule.push({
        originNeighborhoodId: homeNeighborhoodId,
        destinationNeighborhoodId: workNeighborhoodId,
        departureTime: addRandomOffset(shiftStart),
        purpose: 'to-work'
      });
    }
    
    // Trip from work - 50% chance go straight home, 50% go to recreation
    const goToRecreation = Math.random() < 0.5;
    
    if (goToRecreation) {
      // Pick a recreational destination
      const recreationNeighborhood = pickRecreationalDestination(activeNeighborhoods);
      
      if (workNeighborhoodId !== recreationNeighborhood.id) {
        schedule.push({
          originNeighborhoodId: workNeighborhoodId,
          destinationNeighborhoodId: recreationNeighborhood.id,
          departureTime: addRandomOffset(shiftEnd),
          purpose: 'recreation'
        });
      }
      
      // After 1-2 hours of recreation, go home
      const recreationDuration = 1 + Math.floor(Math.random() * 2); // 1-2 hours
      if (recreationNeighborhood.id !== homeNeighborhoodId) {
        schedule.push({
          originNeighborhoodId: recreationNeighborhood.id,
          destinationNeighborhoodId: homeNeighborhoodId,
          departureTime: addRandomOffset(shiftEnd + recreationDuration),
          purpose: 'to-home'
        });
      }
    } else {
      // Go straight home
      if (workNeighborhoodId !== homeNeighborhoodId) {
        schedule.push({
          originNeighborhoodId: workNeighborhoodId,
          destinationNeighborhoodId: homeNeighborhoodId,
          departureTime: addRandomOffset(shiftEnd),
          purpose: 'to-home'
        });
      }
    }
  } else {
    // Midnight-crossing shift: start at work, go home after shift, rest 8h, go back to work
    
    // Trip from work (they're already at work at day start)
    const goToRecreation = Math.random() < 0.5;
    
    if (goToRecreation) {
      // Pick a recreational destination
      const recreationNeighborhood = pickRecreationalDestination(activeNeighborhoods);
      
      if (workNeighborhoodId !== recreationNeighborhood.id) {
        schedule.push({
          originNeighborhoodId: workNeighborhoodId,
          destinationNeighborhoodId: recreationNeighborhood.id,
          departureTime: addRandomOffset(shiftEnd),
          purpose: 'recreation'
        });
      }
      
      // After 1-2 hours of recreation, go home
      const recreationDuration = 1 + Math.floor(Math.random() * 2);
      if (recreationNeighborhood.id !== homeNeighborhoodId) {
        schedule.push({
          originNeighborhoodId: recreationNeighborhood.id,
          destinationNeighborhoodId: homeNeighborhoodId,
          departureTime: addRandomOffset(shiftEnd + recreationDuration),
          purpose: 'to-home'
        });
      }
      
      // Leave home at least 8 hours before shift starts (accounting for 24h wrap)
      const nextShiftStart = shiftStart + 24; // next day's shift
      const leaveHomeTime = Math.max(
        shiftEnd + recreationDuration + 8,
        nextShiftStart
      );
      
      if (homeNeighborhoodId !== workNeighborhoodId) {
        schedule.push({
          originNeighborhoodId: homeNeighborhoodId,
          destinationNeighborhoodId: workNeighborhoodId,
          departureTime: addRandomOffset(leaveHomeTime),
          purpose: 'to-work'
        });
      }
    } else {
      // Go straight home
      if (workNeighborhoodId !== homeNeighborhoodId) {
        schedule.push({
          originNeighborhoodId: workNeighborhoodId,
          destinationNeighborhoodId: homeNeighborhoodId,
          departureTime: addRandomOffset(shiftEnd),
          purpose: 'to-home'
        });
      }
      
      // Leave home at least 8 hours later for next shift
      const nextShiftStart = shiftStart + 24;
      const leaveHomeTime = Math.max(shiftEnd + 8, nextShiftStart);
      
      if (homeNeighborhoodId !== workNeighborhoodId) {
        schedule.push({
          originNeighborhoodId: homeNeighborhoodId,
          destinationNeighborhoodId: workNeighborhoodId,
          departureTime: addRandomOffset(leaveHomeTime),
          purpose: 'to-work'
        });
      }
    }
  }
  
  return schedule;
}

/**
 * Pick a recreational destination based on proportions
 */
function pickRecreationalDestination(activeNeighborhoods: Neighborhood[]): Neighborhood {
  const recreationalDemand = (n : Neighborhood) => 
    n.recreationalDemandCoefficient * (n.residents + n.proportionOfJobs);

  const totalRecDemand = activeNeighborhoods.reduce(
    (sum, n) => sum + recreationalDemand(n), 
    0
  );
  
  const random = Math.random() * totalRecDemand;
  
  let cumulative = 0;
  for (const neighborhood of activeNeighborhoods) {
    cumulative += recreationalDemand(neighborhood);
    if (random <= cumulative) {
      return neighborhood;
    }
  }
  
  return activeNeighborhoods[activeNeighborhoods.length - 1];
}

/**
 * Calculate trip generation interval based on day number
 */
export function calculateTripGenerationInterval(tripsPerDay: number): number {
  return 1440 / tripsPerDay;
}

/**
 * Generate a single trip based on probabilities
 * 40% home-to-work
 * 40% work-to-home
 * 10% work-to-recreation
 * 10% recreation-to-home
 */
export function generateSingleTrip(
  activeNeighborhoods: Neighborhood[],
  currentTime: number,
  citizenIdCounter: number
): Citizen | null {
  const random = Math.random();
  
  let originNeighborhood: Neighborhood;
  let destinationNeighborhood: Neighborhood;
  let purpose: 'to-work' | 'from-work' | 'recreation' | 'to-home';
  
  if (random < TRIP_PROBABILITIES.HOME_TO_WORK) {
    // 40% chance: home to work
    originNeighborhood = assignHomeNeighborhood(activeNeighborhoods);
    destinationNeighborhood = assignWorkNeighborhood(activeNeighborhoods);
    purpose = 'to-work';
  } else if (random < TRIP_PROBABILITIES.HOME_TO_WORK + TRIP_PROBABILITIES.WORK_TO_HOME) {
    // 40% chance: work to home
    destinationNeighborhood = assignHomeNeighborhood(activeNeighborhoods);
    originNeighborhood = assignWorkNeighborhood(activeNeighborhoods);
    purpose = 'from-work';
  } else if (random < TRIP_PROBABILITIES.HOME_TO_WORK + TRIP_PROBABILITIES.WORK_TO_HOME + TRIP_PROBABILITIES.WORK_TO_RECREATION) {
    // 10% chance: work to recreation
    originNeighborhood = assignWorkNeighborhood(activeNeighborhoods);
    destinationNeighborhood = pickRecreationalDestination(activeNeighborhoods);
    purpose = 'recreation';
  } else {
    // 10% chance: recreation to home
    originNeighborhood = pickRecreationalDestination(activeNeighborhoods);
    destinationNeighborhood = assignHomeNeighborhood(activeNeighborhoods);
    purpose = 'to-home';
  }
  
  // Don't create trips where origin and destination are the same
  if (originNeighborhood.id === destinationNeighborhood.id) {
    return null;
  }
  
  const citizenId = `citizen-${citizenIdCounter}`;
  
  // Create a simplified citizen for this single trip
  // We'll use a dummy shift and schedule since we're not tracking full daily schedules anymore
  const dummyShift: Shift = [9, 17]; // 9am-5pm dummy
  
  const citizen: Citizen = {
    id: citizenId,
    homeNeighborhoodId: purpose === 'to-work' || purpose === 'recreation' 
      ? originNeighborhood.id 
      : destinationNeighborhood.id,
    workNeighborhoodId: purpose === 'to-work' || purpose === 'from-work'
      ? destinationNeighborhood.id
      : originNeighborhood.id,
    shift: dummyShift,
    dailySchedule: [{
      originNeighborhoodId: originNeighborhood.id,
      destinationNeighborhoodId: destinationNeighborhood.id,
      departureTime: currentTime / 60, // Convert minutes to hours
      purpose: purpose,
    }],
    currentTripIndex: 0,
    originNeighborhoodId: originNeighborhood.id,
    destinationNeighborhoodId: destinationNeighborhood.id,
    state: 'waiting-at-origin',
    currentPosition: { ...originNeighborhood.position },
    tripStartTime: currentTime,
  };
  
  return citizen;
}

/**
 * Generate the trip matrix for a day based on citizen schedules
 */
export function generateTripMatrix(
  citizens: Map<string, Citizen>,
  day: number
): TripMatrix {
  const trips = new Map<string, Map<string, number>>();
  
  // Count all trips from all citizens' schedules
  citizens.forEach(citizen => {
    citizen.dailySchedule.forEach(trip => {
      if (!trips.has(trip.originNeighborhoodId)) {
        trips.set(trip.originNeighborhoodId, new Map());
      }
      
      const originTrips = trips.get(trip.originNeighborhoodId)!;
      const currentCount = originTrips.get(trip.destinationNeighborhoodId) || 0;
      originTrips.set(trip.destinationNeighborhoodId, currentCount + 1);
    });
  });
  
  // Calculate total trips
  let totalTrips = 0;
  trips.forEach(destinations => {
    destinations.forEach(count => {
      totalTrips += count;
    });
  });
  
  return {
    date: day,
    trips,
    totalTrips,
  };
}

/**
 * Create citizens with work assignments and daily schedules
 */
export function createCitizensWithSchedules(
  activeNeighborhoods: Neighborhood[],
  totalPopulation : number
): Map<string, Citizen> {
  const citizens = new Map<string, Citizen>();
  
  // Create a citizen for each resident
  for (let i = 0; i < totalPopulation; i++) {
    const citizenId = `citizen-${i}`;
    
    // Assign home, work, and shift
    const homeNeighborhood = assignHomeNeighborhood(activeNeighborhoods);
    const workNeighborhood = assignWorkNeighborhood(activeNeighborhoods);
    const shift = assignShift(workNeighborhood);
    
    // Generate daily schedule
    const dailySchedule = generateDailySchedule(
      homeNeighborhood.id,
      workNeighborhood.id,
      shift,
      activeNeighborhoods
    );
    
    // Determine starting position and first trip
    const crossesMidnight = shiftCrossesMidnight(shift);
    const firstTrip = dailySchedule[0];

    // only add citizens that take trips
    if (firstTrip !== undefined) {
      const startingNeighborhoodId = crossesMidnight ? workNeighborhood.id : homeNeighborhood.id;
      const startingNeighborhood = activeNeighborhoods.find(n => n.id === startingNeighborhoodId)!;
      
      const citizen: Citizen = {
        id: citizenId,
        homeNeighborhoodId: homeNeighborhood.id,
        workNeighborhoodId: workNeighborhood.id,
        shift,
        dailySchedule,
        currentTripIndex: 0,
        originNeighborhoodId: firstTrip.originNeighborhoodId,
        destinationNeighborhoodId: firstTrip.destinationNeighborhoodId,
        state: 'waiting-at-origin',
        currentPosition: { ...startingNeighborhood.position },
        tripStartTime: firstTrip.departureTime * 60, // Convert hours to minutes
      };
      
      citizens.set(citizenId, citizen);
    }
  }
  
  return citizens;
}

/**
 * Calculate routes for all citizens based on their current trip
 */
export function calculateCitizenRoutes(
  citizens: Map<string, Citizen>,
  neighborhoods: Neighborhood[],
  trainSpeed: number,
  timePerStationStop: number,
  railNetwork: RailNetwork
): Map<string, Citizen> {
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  const updatedCitizens = new Map<string, Citizen>();
  
  citizens.forEach(citizen => {
    const destNeighborhood = neighborhoodMap.get(citizen.destinationNeighborhoodId);
    
    if (!destNeighborhood) {
      updatedCitizens.set(citizen.id, citizen);
      return;
    }
    
    // Determine the starting position for route calculation
    let startNeighborhood: Neighborhood | undefined;
    
    if (citizen.state === 'riding-train' && citizen.currentTrainId) {
      // If riding a train, calculate from the train's next stop
      const train = railNetwork.trains?.get(citizen.currentTrainId);
      const line = train ? railNetwork.lines.get(train.lineId) : undefined;
      
      if (train && line) {
        // Calculate the next neighborhood index based on direction
        const nextIndex = train.direction === 'forward'
          ? (train.currentNeighborhoodIndex + 1) % line.neighborhoodIds.length
          : (train.currentNeighborhoodIndex - 1 + line.neighborhoodIds.length) % line.neighborhoodIds.length;
        
        // Get the next neighborhood ID if valid
        if (nextIndex >= 0 && nextIndex < line.neighborhoodIds.length) {
          const nextNeighborhoodId = line.neighborhoodIds[nextIndex];
          startNeighborhood = neighborhoodMap.get(nextNeighborhoodId);
        }
      }
      
      // If we couldn't determine the train's next stop, fall back to current neighborhood or origin
      if (!startNeighborhood) {
        if (citizen.currentNeighborhoodId) {
          startNeighborhood = neighborhoodMap.get(citizen.currentNeighborhoodId);
        } else {
          startNeighborhood = neighborhoodMap.get(citizen.originNeighborhoodId);
        }
      }
    } else if (citizen.currentNeighborhoodId) {
      // If at a station (waiting-at-station or waiting-at-origin), calculate from current neighborhood
      startNeighborhood = neighborhoodMap.get(citizen.currentNeighborhoodId);
    } else {
      // Otherwise, calculate from the origin
      startNeighborhood = neighborhoodMap.get(citizen.originNeighborhoodId);
    }
    
    if (!startNeighborhood) {
      updatedCitizens.set(citizen.id, citizen);
      return;
    }
    
    // Calculate route with rail network
    const segments = calculateRoute(
      startNeighborhood.position,
      destNeighborhood.position,
      railNetwork,
      neighborhoods,
      trainSpeed,
      timePerStationStop,
    );
    
    const totalEstimatedTime = segments.reduce((sum: number, seg: any) => sum + seg.estimatedTime, 0);

    updatedCitizens.set(citizen.id, {
      ...citizen,
      route: {
        segments,
        totalEstimatedTime,
      },
    });
  });
  
  return updatedCitizens;
}


/**
 * Initialize train positions and arrival times for the start of a day
 */
export function initializeTrains(
  trains: Map<string, Train> | undefined,
  lines: Map<string, Line>,
  neighborhoods: Neighborhood[],
  currentTime: number,
): Map<string, Train> {
  const updatedTrains = new Map<string, Train>();
  
  // Handle undefined trains
  if (!trains) {
    return updatedTrains;
  }
  
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  
  // Group trains by line
  const trainsByLine = new Map<string, Train[]>();
  trains.forEach(train => {
    if (!trainsByLine.has(train.lineId)) {
      trainsByLine.set(train.lineId, []);
    }
    trainsByLine.get(train.lineId)!.push(train);
  });
  
  // Initialize each line's trains
  trainsByLine.forEach((lineTrains, lineId) => {
    const line = lines.get(lineId);
    if (!line || !line.isActive || line.neighborhoodIds.length < 2) {
      // Keep trains as-is if line is inactive or has insufficient neighborhoods
      lineTrains.forEach(train => updatedTrains.set(train.id, train));
      return;
    }
    
    const numTrains = lineTrains.length;
    const numNeighborhoods = line.neighborhoodIds.length;
    
    lineTrains.forEach((train, idx) => {
      let updatedTrain = { ...train };
      
      if (numTrains === 1) {
        // Single train: start at beginning, going forward
        updatedTrain.currentNeighborhoodIndex = 0;
        updatedTrain.direction = 'forward';
      } else if (numTrains === 2) {
        // Two trains: one at start going forward, one at end going backward
        if (idx === 0) {
          updatedTrain.currentNeighborhoodIndex = 0;
          updatedTrain.direction = 'forward';
        } else {
          updatedTrain.currentNeighborhoodIndex = numNeighborhoods - 1;
          updatedTrain.direction = 'backward';
        }
      } else {
        // Multiple trains: distribute evenly
        // Split between forward and backward directions
        const isForward = idx % 2 === 0;
        
        if (isForward) {
          // Forward trains: space them evenly along the line
          const forwardCount = Math.ceil(numTrains / 2);
          const forwardIdx = Math.floor(idx / 2);
          const spacing = Math.max(1, Math.floor(numNeighborhoods / forwardCount));
          updatedTrain.currentNeighborhoodIndex = Math.min(
            forwardIdx * spacing,
            numNeighborhoods - 1
          );
          updatedTrain.direction = 'forward';
        } else {
          // Backward trains: space them evenly from the end
          const backwardCount = Math.floor(numTrains / 2);
          const backwardIdx = Math.floor(idx / 2);
          const spacing = Math.max(1, Math.floor(numNeighborhoods / backwardCount));
          updatedTrain.currentNeighborhoodIndex = Math.max(
            numNeighborhoods - 1 - backwardIdx * spacing,
            0
          );
          updatedTrain.direction = 'backward';
        }
      }
      
      // Set train position to current neighborhood
      const currentNeighborhoodId = line.neighborhoodIds[updatedTrain.currentNeighborhoodIndex];
      const currentNeighborhood = neighborhoodMap.get(currentNeighborhoodId);
      if (currentNeighborhood) {
        updatedTrain.position = { ...currentNeighborhood.position };
      }
      
      // Calculate next neighborhood arrival time
      const nextIndex = updatedTrain.direction === 'forward'
        ? updatedTrain.currentNeighborhoodIndex + 1
        : updatedTrain.currentNeighborhoodIndex - 1;
      
      if (nextIndex >= 0 && nextIndex < numNeighborhoods) {
        const nextNeighborhoodId = line.neighborhoodIds[nextIndex];
        const nextNeighborhood = neighborhoodMap.get(nextNeighborhoodId);
        
        if (currentNeighborhood && nextNeighborhood) {
          const distance = calculateDistance(currentNeighborhood.position, nextNeighborhood.position);
          const travelTime = distance / updatedTrain.speed;
          // Add 1 minute for neighborhood stop time
          updatedTrain.nextNeighborhoodArrivalTime = currentTime + travelTime + 1;
        }
      } else {
        updatedTrain.nextNeighborhoodArrivalTime = undefined;
      }
      
      updatedTrains.set(updatedTrain.id, updatedTrain);
    });
  });
  
  return updatedTrains;
}

/**
 * Initialize a new day with the new continuous trip generation system
 */
export function initializeDay(
  config: CityConfig,
  day: number,
  _activeNeighborhoodCount: number,
  railNetwork: RailNetwork,
  startTime: number = 0 // Midnight default
): {
  tripMatrix: TripMatrix;
  citizens: Map<string, Citizen>;
  updatedNetwork: RailNetwork;
  nextTripGenerationTime: number;
} {
  // Start with empty citizens - they'll be generated continuously
  const citizens = new Map<string, Citizen>();
  
  // Set next trip generation time to the start time
  const nextTripGenerationTime = startTime;
  
  // Create empty trip matrix
  const tripMatrix: TripMatrix = {
    date: day,
    trips: new Map(),
    totalTrips: 0,
  };
  
  // Initialize train positions and arrival times
  const updatedTrains = initializeTrains(
    railNetwork.trains,
    railNetwork.lines,
    config.neighborhoods,
    startTime
  );
  
  const updatedNetwork: RailNetwork = {
    ...railNetwork,
    trains: updatedTrains,
  };
  
  return {
    tripMatrix,
    citizens,
    updatedNetwork,
    nextTripGenerationTime,
  };
}

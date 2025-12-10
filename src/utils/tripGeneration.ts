// Trip generation and citizen initialization

import type { 
  CityConfig, 
  Neighborhood, 
  TripMatrix, 
  Citizen, 
  Station,
  RailNetwork,
  Train,
  Line,
  DailyTrip
} from '../models';
import type { Shift } from '../models/Neighborhood';
import { calculateDistance } from './simulation';
import { calculateRoute } from './pathfinding';

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
    schedule.push({
      originNeighborhoodId: homeNeighborhoodId,
      destinationNeighborhoodId: workNeighborhoodId,
      departureTime: addRandomOffset(shiftStart),
      purpose: 'to-work'
    });
    
    // Trip from work - 50% chance go straight home, 50% go to recreation
    const goToRecreation = Math.random() < 0.5;
    
    if (goToRecreation) {
      // Pick a recreational destination
      const recreationNeighborhood = pickRecreationalDestination(activeNeighborhoods);
      
      schedule.push({
        originNeighborhoodId: workNeighborhoodId,
        destinationNeighborhoodId: recreationNeighborhood.id,
        departureTime: addRandomOffset(shiftEnd),
        purpose: 'recreation'
      });
      
      // After 1-2 hours of recreation, go home
      const recreationDuration = 1 + Math.floor(Math.random() * 2); // 1-2 hours
      schedule.push({
        originNeighborhoodId: recreationNeighborhood.id,
        destinationNeighborhoodId: homeNeighborhoodId,
        departureTime: addRandomOffset(shiftEnd + recreationDuration),
        purpose: 'to-home'
      });
    } else {
      // Go straight home
      schedule.push({
        originNeighborhoodId: workNeighborhoodId,
        destinationNeighborhoodId: homeNeighborhoodId,
        departureTime: addRandomOffset(shiftEnd),
        purpose: 'to-home'
      });
    }
  } else {
    // Midnight-crossing shift: start at work, go home after shift, rest 8h, go back to work
    
    // Trip from work (they're already at work at day start)
    const goToRecreation = Math.random() < 0.5;
    
    if (goToRecreation) {
      // Pick a recreational destination
      const recreationNeighborhood = pickRecreationalDestination(activeNeighborhoods);
      
      schedule.push({
        originNeighborhoodId: workNeighborhoodId,
        destinationNeighborhoodId: recreationNeighborhood.id,
        departureTime: addRandomOffset(shiftEnd),
        purpose: 'recreation'
      });
      
      // After 1-2 hours of recreation, go home
      const recreationDuration = 1 + Math.floor(Math.random() * 2);
      schedule.push({
        originNeighborhoodId: recreationNeighborhood.id,
        destinationNeighborhoodId: homeNeighborhoodId,
        departureTime: addRandomOffset(shiftEnd + recreationDuration),
        purpose: 'to-home'
      });
      
      // Leave home at least 8 hours before shift starts (accounting for 24h wrap)
      const nextShiftStart = shiftStart + 24; // next day's shift
      const leaveHomeTime = Math.max(
        shiftEnd + recreationDuration + 8,
        nextShiftStart
      );
      
      schedule.push({
        originNeighborhoodId: homeNeighborhoodId,
        destinationNeighborhoodId: workNeighborhoodId,
        departureTime: addRandomOffset(leaveHomeTime),
        purpose: 'to-work'
      });
    } else {
      // Go straight home
      schedule.push({
        originNeighborhoodId: workNeighborhoodId,
        destinationNeighborhoodId: homeNeighborhoodId,
        departureTime: addRandomOffset(shiftEnd),
        purpose: 'to-home'
      });
      
      // Leave home at least 8 hours later for next shift
      const nextShiftStart = shiftStart + 24;
      const leaveHomeTime = Math.max(shiftEnd + 8, nextShiftStart);
      
      schedule.push({
        originNeighborhoodId: homeNeighborhoodId,
        destinationNeighborhoodId: workNeighborhoodId,
        departureTime: addRandomOffset(leaveHomeTime),
        purpose: 'to-work'
      });
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
      isHappy: true,
      tripStartTime: firstTrip.departureTime * 60, // Convert hours to minutes
    };
    
    citizens.set(citizenId, citizen);
  }
  
  return citizens;
}

/**
 * Calculate routes for all citizens based on their current trip
 */
export function calculateCitizenRoutes(
  citizens: Map<string, Citizen>,
  neighborhoods: Neighborhood[],
  config: CityConfig,
  railNetwork: RailNetwork
): Map<string, Citizen> {
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  const updatedCitizens = new Map<string, Citizen>();
  
  const emptyNetwork: RailNetwork = {
    stations: new Map(),
    lines: new Map(),
    tracks: new Map(),
    trains: new Map(),
  };
  
  citizens.forEach(citizen => {
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
      config,
      railNetwork,
      config.walkingSpeed,
      config.trainSpeed
    );
    
    const totalEstimatedTime = segments.reduce((sum: number, seg: any) => sum + seg.estimatedTime, 0);
    
    // Calculate walking-only time
    const walkingSegments = calculateRoute(
      originNeighborhood.position,
      destNeighborhood.position,
      config,
      emptyNetwork,
      config.walkingSpeed,
      config.trainSpeed
    );
    const walkingOnlyTime = walkingSegments.reduce((sum: number, seg: any) => sum + seg.estimatedTime, 0);
    
    updatedCitizens.set(citizen.id, {
      ...citizen,
      route: {
        segments,
        totalEstimatedTime,
        walkingOnlyTime,
      },
    });
  });
  
  return updatedCitizens;
}

/**
 * Update station waiting citizens based on citizen positions and states
 */
export function updateStationWaitingCitizens(
  stations: Map<string, Station> | undefined,
  citizens: Map<string, Citizen>,
  _neighborhoods: Neighborhood[]
): Map<string, Station> {
  // Handle undefined stations
  if (!stations) {
    return new Map();
  }
  
  const updatedStations = new Map(stations);
  
  // Clear all waiting citizens
  updatedStations.forEach(station => {
    station.waitingCitizens = new Map();
  });
  
  // Find stations by neighborhood position
  const stationsByPosition = new Map<string, Station>();
  updatedStations.forEach(station => {
    const key = `${station.position.x},${station.position.y}`;
    stationsByPosition.set(key, station);
  });
  
  // Add citizens who are waiting at stations
  citizens.forEach(citizen => {
    if (citizen.state === 'waiting-at-station' && citizen.currentStationId) {
      const station = updatedStations.get(citizen.currentStationId);
      if (station) {
        // For now, assume they're waiting for any line at the station
        // In a full implementation, you'd determine which line they need
        station.lineIds.forEach(lineId => {
          if (!station.waitingCitizens.has(lineId)) {
            station.waitingCitizens.set(lineId, []);
          }
          station.waitingCitizens.get(lineId)!.push(citizen.id);
        });
      }
    }
  });
  
  return updatedStations;
}

/**
 * Initialize train positions and arrival times for the start of a day
 */
export function initializeTrains(
  trains: Map<string, Train> | undefined,
  lines: Map<string, Line>,
  stations: Map<string, Station>,
  currentTime: number,
  trainSpeed: number
): Map<string, Train> {
  const updatedTrains = new Map<string, Train>();
  
  // Handle undefined trains
  if (!trains) {
    return updatedTrains;
  }
  
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
    if (!line || !line.isActive || line.stationIds.length < 2) {
      // Keep trains as-is if line is inactive or has insufficient stations
      lineTrains.forEach(train => updatedTrains.set(train.id, train));
      return;
    }
    
    const numTrains = lineTrains.length;
    const numStations = line.stationIds.length;
    
    lineTrains.forEach((train, idx) => {
      let updatedTrain = { ...train };
      
      if (numTrains === 1) {
        // Single train: start at beginning, going forward
        updatedTrain.currentStationIndex = 0;
        updatedTrain.direction = 'forward';
      } else if (numTrains === 2) {
        // Two trains: one at start going forward, one at end going backward
        if (idx === 0) {
          updatedTrain.currentStationIndex = 0;
          updatedTrain.direction = 'forward';
        } else {
          updatedTrain.currentStationIndex = numStations - 1;
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
          const spacing = Math.max(1, Math.floor(numStations / forwardCount));
          updatedTrain.currentStationIndex = Math.min(
            forwardIdx * spacing,
            numStations - 1
          );
          updatedTrain.direction = 'forward';
        } else {
          // Backward trains: space them evenly from the end
          const backwardCount = Math.floor(numTrains / 2);
          const backwardIdx = Math.floor(idx / 2);
          const spacing = Math.max(1, Math.floor(numStations / backwardCount));
          updatedTrain.currentStationIndex = Math.max(
            numStations - 1 - backwardIdx * spacing,
            0
          );
          updatedTrain.direction = 'backward';
        }
      }
      
      // Set train position to current station
      const currentStationId = line.stationIds[updatedTrain.currentStationIndex];
      const currentStation = stations.get(currentStationId);
      if (currentStation) {
        updatedTrain.position = { ...currentStation.position };
      }
      
      // Calculate next station arrival time
      const nextIndex = updatedTrain.direction === 'forward'
        ? updatedTrain.currentStationIndex + 1
        : updatedTrain.currentStationIndex - 1;
      
      if (nextIndex >= 0 && nextIndex < numStations) {
        const nextStationId = line.stationIds[nextIndex];
        const nextStation = stations.get(nextStationId);
        
        if (currentStation && nextStation) {
          const distance = calculateDistance(currentStation.position, nextStation.position);
          const travelTime = distance / trainSpeed;
          // Add 1 minute for station stop time
          updatedTrain.nextStationArrivalTime = currentTime + travelTime + 1;
        }
      } else {
        updatedTrain.nextStationArrivalTime = undefined;
      }
      
      updatedTrains.set(updatedTrain.id, updatedTrain);
    });
  });
  
  return updatedTrains;
}

/**
 * Initialize a new day with citizens and trips
 */
export function initializeDay(
  config: CityConfig,
  day: number,
  activeNeighborhoodCount: number,
  railNetwork: RailNetwork,
  startTime: number = 0 // Midnight default
): {
  tripMatrix: TripMatrix;
  citizens: Map<string, Citizen>;
  updatedNetwork: RailNetwork;
} {
  // Get active neighborhoods based on activeNeighborhoodCount
  const activeNeighborhoods = getActiveNeighborhoods(config.neighborhoods, activeNeighborhoodCount);
  
  // Create citizens with work assignments and daily schedules
  const totalPopulation = 35 * (day + 1);
  const citizensWithoutRoutes = createCitizensWithSchedules(activeNeighborhoods, totalPopulation);
  
  // Calculate routes for all citizens
  const citizens = calculateCitizenRoutes(
    citizensWithoutRoutes,
    activeNeighborhoods,
    config,
    railNetwork
  );
  
  // Generate trip matrix from citizen schedules
  const tripMatrix = generateTripMatrix(citizens, day);
  
  // Update stations with waiting citizens
  const updatedStations = updateStationWaitingCitizens(
    railNetwork.stations,
    citizens,
    activeNeighborhoods
  );
  
  // Initialize train positions and arrival times
  const updatedTrains = initializeTrains(
    railNetwork.trains,
    railNetwork.lines,
    updatedStations,
    startTime,
    config.trainSpeed
  );
  
  const updatedNetwork: RailNetwork = {
    ...railNetwork,
    stations: updatedStations,
    trains: updatedTrains,
  };
  
  return {
    tripMatrix,
    citizens,
    updatedNetwork,
  };
}

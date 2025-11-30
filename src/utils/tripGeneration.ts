// Trip generation and citizen initialization

import type { 
  CityConfig, 
  Neighborhood, 
  TripMatrix, 
  Citizen, 
  Station,
  RailNetwork,
  Train,
  Line
} from '../models';
import { calculateDistance } from './simulation';
import { calculateRoute } from './pathfinding';

/**
 * Generate the trip matrix for a day based on population and demand distributions
 */
export function generateTripMatrix(
  neighborhoods: Neighborhood[],
  population: number,
  day: number
): TripMatrix {
  const trips = new Map<string, Map<string, number>>();
  
  // Initialize the matrix
  neighborhoods.forEach(origin => {
    trips.set(origin.id, new Map());
  });
  
  // For each person in the population, assign them a trip
  for (let i = 0; i < population; i++) {
    // Pick an origin based on origin demand percentages
    const originRandom = Math.random() * 100;
    let cumulativeOrigin = 0;
    let selectedOrigin: Neighborhood | null = null;
    
    for (const neighborhood of neighborhoods) {
      cumulativeOrigin += neighborhood.originDemandPercent;
      if (originRandom <= cumulativeOrigin) {
        selectedOrigin = neighborhood;
        break;
      }
    }
    
    // If no origin selected (rounding errors), pick the last one
    if (!selectedOrigin) {
      selectedOrigin = neighborhoods[neighborhoods.length - 1];
    }
    
    // Pick a destination based on destination demand percentages
    const destRandom = Math.random() * 100;
    let cumulativeDest = 0;
    let selectedDest: Neighborhood | null = null;
    
    for (const neighborhood of neighborhoods) {
      cumulativeDest += neighborhood.destinationDemandPercent;
      if (destRandom <= cumulativeDest) {
        selectedDest = neighborhood;
        break;
      }
    }
    
    // If no destination selected, pick the last one
    if (!selectedDest) {
      selectedDest = neighborhoods[neighborhoods.length - 1];
    }
    
    // Increment the trip count for this O-D pair
    const originTrips = trips.get(selectedOrigin.id)!;
    const currentCount = originTrips.get(selectedDest.id) || 0;
    originTrips.set(selectedDest.id, currentCount + 1);
  }
  
  return {
    date: day,
    trips,
    totalTrips: population,
  };
}

/**
 * Create citizens based on the trip matrix with routes
 */
export function createCitizensFromTripMatrix(
  tripMatrix: TripMatrix,
  neighborhoods: Neighborhood[],
  config: CityConfig,
  railNetwork: RailNetwork,
  startTime: number = 0
): Map<string, Citizen> {
  const citizens = new Map<string, Citizen>();
  const neighborhoodMap = new Map(neighborhoods.map(n => [n.id, n]));
  
  let citizenCounter = 0;
  
  // Iterate through the trip matrix
  tripMatrix.trips.forEach((destinations, originId) => {
    const originNeighborhood = neighborhoodMap.get(originId);
    if (!originNeighborhood) return;
    
    destinations.forEach((count, destId) => {
      const destNeighborhood = neighborhoodMap.get(destId);
      if (!destNeighborhood) return;
      
      // Calculate route for this O-D pair (same for all citizens on this trip)
      const segments = calculateRoute(
        originNeighborhood.position,
        destNeighborhood.position,
        config,
        railNetwork,
        config.walkingSpeed,
        config.trainSpeed
      );
      
      const totalEstimatedTime = segments.reduce((sum: number, seg: any) => sum + seg.estimatedTime, 0);
      
      // Calculate walking-only time for comparison using pathfinding
      const emptyNetwork: RailNetwork = {
        stations: new Map(),
        lines: new Map(),
        tracks: new Map(),
        trains: new Map(),
      };
      const walkingSegments = calculateRoute(
        originNeighborhood.position,
        destNeighborhood.position,
        config,
        emptyNetwork,
        config.walkingSpeed,
        config.trainSpeed
      );
      const walkingOnlyTime = walkingSegments.reduce((sum: number, seg: any) => sum + seg.estimatedTime, 0);
      
      // Create 'count' citizens for this O-D pair
      for (let i = 0; i < count; i++) {
        const citizenId = `citizen-${citizenCounter++}`;
        
        // Add some randomness to start times (0-60 minutes spread)
        const randomStartDelay = Math.floor(Math.random() * 60);
        
        const citizen: Citizen = {
          id: citizenId,
          originNeighborhoodId: originId,
          destinationNeighborhoodId: destId,
          state: 'waiting-at-origin',
          currentPosition: { ...originNeighborhood.position },
          isHappy: true, // Assume happy until proven otherwise
          tripStartTime: startTime + randomStartDelay,
          route: {
            segments,
            totalEstimatedTime,
            walkingOnlyTime,
          },
        };
        
        citizens.set(citizenId, citizen);
      }
    });
  });
  
  return citizens;
}

/**
 * Update station waiting citizens based on citizen positions and states
 */
export function updateStationWaitingCitizens(
  stations: Map<string, Station>,
  citizens: Map<string, Citizen>,
  _neighborhoods: Neighborhood[]
): Map<string, Station> {
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
  trains: Map<string, Train>,
  lines: Map<string, Line>,
  stations: Map<string, Station>,
  currentTime: number,
  trainSpeed: number
): Map<string, Train> {
  const updatedTrains = new Map<string, Train>();
  
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
  population: number,
  day: number,
  railNetwork: RailNetwork,
  startTime: number = 0 // Midnight default
): {
  tripMatrix: TripMatrix;
  citizens: Map<string, Citizen>;
  updatedNetwork: RailNetwork;
} {
  // Generate trip matrix
  const tripMatrix = generateTripMatrix(config.neighborhoods, population, day);
  
  // Create citizens from trip matrix with routes
  const citizens = createCitizensFromTripMatrix(
    tripMatrix,
    config.neighborhoods,
    config,
    railNetwork,
    startTime
  );
  
  // Update stations with waiting citizens
  const updatedStations = updateStationWaitingCitizens(
    railNetwork.stations,
    citizens,
    config.neighborhoods
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

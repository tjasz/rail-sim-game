// Trip generation and citizen initialization

import type { 
  CityConfig, 
  Neighborhood, 
  TripMatrix, 
  Citizen, 
  Station,
  RailNetwork 
} from '../models';

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
 * Create citizens based on the trip matrix
 */
export function createCitizensFromTripMatrix(
  tripMatrix: TripMatrix,
  neighborhoods: Neighborhood[],
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
 * Initialize a new day with citizens and trips
 */
export function initializeDay(
  config: CityConfig,
  population: number,
  day: number,
  railNetwork: RailNetwork,
  startTime: number = 480 // 8:00 AM default
): {
  tripMatrix: TripMatrix;
  citizens: Map<string, Citizen>;
  updatedNetwork: RailNetwork;
} {
  // Generate trip matrix
  const tripMatrix = generateTripMatrix(config.neighborhoods, population, day);
  
  // Create citizens from trip matrix
  const citizens = createCitizensFromTripMatrix(
    tripMatrix,
    config.neighborhoods,
    startTime
  );
  
  // Update stations with waiting citizens
  const updatedStations = updateStationWaitingCitizens(
    railNetwork.stations,
    citizens,
    config.neighborhoods
  );
  
  const updatedNetwork: RailNetwork = {
    ...railNetwork,
    stations: updatedStations,
  };
  
  return {
    tripMatrix,
    citizens,
    updatedNetwork,
  };
}

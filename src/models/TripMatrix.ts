// Represents the Origin-Destination trip matrix for a single day

export interface TripMatrix {
  date: number; // day number in simulation
  trips: Map<string, Map<string, number>>; // originId -> destinationId -> count
  totalTrips: number;
}

export interface TripDemand {
  originNeighborhoodId: string;
  destinationNeighborhoodId: string;
  count: number;
}

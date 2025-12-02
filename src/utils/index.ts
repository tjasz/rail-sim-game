export { tickSimulation, rolloverToNextDay, calculateDayResult, formatTime, MINUTES_PER_DAY, calculateDistance } from './simulation';
export { 
  generateTripMatrix, 
  updateStationWaitingCitizens, 
  initializeTrains,
  initializeDay,
  getActiveNeighborhoods,
  calculatePopulation,
  calculateCitizenRoutes
} from './tripGeneration';
export { calculateRoute, calculateAllRoutes } from './pathfinding';
export { 
  findShortestTrackPath, 
  areStationsConnected, 
  getConnectedStations,
  generateLineColor 
} from './railNetwork';

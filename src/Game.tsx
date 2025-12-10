import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameStats,
  NetworkStats,
  CityGrid,
  TrackOverlay,
  DraftTrackOverlay,
  StationPlacementOverlay,
  TrainMarkers,
  NeighborhoodMarkers,
  StationMarkers,
  MapClickHandler,
  LinesList,
  TrainsList,
  PassengersList,
  StationsList,
  DayResultModal,
  StationAssignmentModal,
  TripMatrixDisplay,
  ObjectInspector,
  LeafletMap
} from './components';
import { SelectionProvider } from './contexts/SelectionContext';
import type { GameState, DayResult } from './models';
import { 
  tickSimulation, 
  calculateDayResult, 
  formatTime, 
  MINUTES_PER_DAY,
  initializeDay,
  calculateDistance,
  calculateCitizenRoutes
} from './utils';
import './Game.css';

interface GameProps {
  gameState: GameState;
  onGameStateChange?: (newState: GameState) => void;
}

interface BuildTrackState {
  isBuilding: boolean;
  points: { x: number; y: number }[];
  totalDistance: number;
  totalCost: number;
}

interface BuildStationState {
  isBuilding: boolean;
}

export function Game({ gameState: initialGameState, onGameStateChange }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [activeTab, setActiveTab] = useState<'lines' | 'trains' | 'stations' | 'passengers' | 'trips'>('trips');
  const [dayResult, setDayResult] = useState<DayResult | null>(null);
  const [buildTrackState, setBuildTrackState] = useState<BuildTrackState>({
    isBuilding: false,
    points: [],
    totalDistance: 0,
    totalCost: 0,
  });
  const [buildStationState, setBuildStationState] = useState<BuildStationState>({
    isBuilding: false,
  });
  const [selectedStationForAssignment, setSelectedStationForAssignment] = useState<string | null>(null);
  const prevDayRef = useRef<number>(initialGameState.city.currentDay);
  const prevSimulatingRef = useRef<boolean>(initialGameState.isSimulating);

  // Update local state when prop changes
  useEffect(() => {
    setGameState(initialGameState);
  }, [initialGameState]);

  // Notify parent of state changes
  useEffect(() => {
    onGameStateChange?.(gameState);
  }, [gameState, onGameStateChange]);

  // Detect day rollover and show result modal
  useEffect(() => {
    const currentDay = gameState.city.currentDay;
    const expectedDayEndTime = (currentDay+1) * MINUTES_PER_DAY;
    
    // Check if simulation just stopped (day ended)
    if (prevSimulatingRef.current && !gameState.isSimulating && gameState.simulationTime >= expectedDayEndTime - 1) {
      // Day just ended, show result modal
      const result = calculateDayResult(gameState);
      setDayResult(result);
    }
    
    // Check if day rolled over (after modal was closed)
    if (gameState.city.currentDay !== prevDayRef.current) {
      prevDayRef.current = gameState.city.currentDay;
    }
    
    prevSimulatingRef.current = gameState.isSimulating;
  }, [gameState.isSimulating, gameState.simulationTime, gameState.city.currentDay]);

  // Simulation loop
  useEffect(() => {
    if (!gameState.isSimulating) return;

    const interval = setInterval(() => {
      setGameState((prevState) => {
        const deltaMinutes = (0.05 * prevState.simulationSpeed * 1440) / 1000; // 50ms tick scaled
        return tickSimulation(prevState, deltaMinutes);
      });
    }, 50); // 50ms tick rate

    return () => clearInterval(interval);
  }, [gameState.isSimulating, gameState.simulationSpeed]);

  const handleStartPause = useCallback(() => {
    setGameState((prevState) => ({
      ...prevState,
      isSimulating: !prevState.isSimulating,
    }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setGameState((prevState) => ({
      ...prevState,
      simulationSpeed: speed,
    }));
  }, []);

  const handleContinueDay = useCallback(() => {
    if (!dayResult) return;
    
    setDayResult(null);
    // Trigger day rollover and initialize new day with citizens
    setGameState((prevState) => {
      // Use budget earned from the day result
      const budgetEarned = dayResult.budgetEarned;
      const totalCitizens = dayResult.totalCitizens;
      const happyCitizens = dayResult.happyCitizens;
      const unhappyCitizens = dayResult.unhappyCitizens;
      
      const updatedStats = {
        ...prevState.stats,
        totalDaysPlayed: prevState.stats.totalDaysPlayed + 1,
        totalCitizensTransported: prevState.stats.totalCitizensTransported + totalCitizens,
        totalHappyCitizens: prevState.stats.totalHappyCitizens + happyCitizens,
        totalUnhappyCitizens: prevState.stats.totalUnhappyCitizens + unhappyCitizens,
        currentDayHappyCitizens: 0,
        currentDayUnhappyCitizens: 0,
        happinessRate: 0,
        totalMoneyEarned: prevState.stats.totalMoneyEarned + budgetEarned,
      };
      
      const newDay = prevState.city.currentDay + 1;
      
      // Initialize new day with continuous trip generation system
      const dayStartTime = newDay * MINUTES_PER_DAY;
      const { tripMatrix, citizens, updatedNetwork, nextTripGenerationTime } = initializeDay(
        prevState.city.config,
        newDay,
        prevState.activeNeighborhoodCount,
        prevState.railNetwork,
        dayStartTime
      );
      
      return {
        ...prevState,
        city: {
          ...prevState.city,
          currentDay: newDay,
          budget: prevState.city.budget + budgetEarned,
        },
        stats: updatedStats,
        simulationTime: newDay * MINUTES_PER_DAY, // Start of new day
        isSimulating: false,
        activeNeighborhoodCount: prevState.activeNeighborhoodCount,
        citizens,
        currentTripMatrix: tripMatrix,
        railNetwork: updatedNetwork,
        nextTripGenerationTime,
        tripsGeneratedToday: 0,
      };
    });
  }, [dayResult]);

  const handleGameOver = useCallback(() => {
    setDayResult(null);
    setGameState((prevState) => ({
      ...prevState,
      status: 'game-over',
    }));
  }, []);

  const handlePurchaseTrain = useCallback(() => {
    setGameState((prevState) => {
      const trainCost = prevState.city.config.costPerTrain;
      
      // Check if player can afford
      if (prevState.city.budget < trainCost) {
        return prevState;
      }
      
      // Create new train with temporary "unassigned" lineId
      const newTrainId = `train-${Date.now()}`;
      const newTrain = {
        id: newTrainId,
        lineId: 'unassigned', // Special ID for unassigned trains
        currentStationIndex: 0,
        direction: 'forward' as const,
        position: { x: 0, y: 0 },
        passengerIds: [],
        capacity: prevState.city.config.trainCapacity,
        speed: prevState.city.config.trainSpeed,
      };
      
      const updatedTrains = new Map(prevState.railNetwork.trains);
      updatedTrains.set(newTrainId, newTrain);
      
      return {
        ...prevState,
        city: {
          ...prevState.city,
          budget: prevState.city.budget - trainCost,
        },
        railNetwork: {
          ...prevState.railNetwork,
          trains: updatedTrains,
        },
        stats: {
          ...prevState.stats,
          totalTrainsPurchased: prevState.stats.totalTrainsPurchased + 1,
          totalMoneySpent: prevState.stats.totalMoneySpent + trainCost,
        },
      };
    });
  }, []);

  const handleAssignTrainToLine = useCallback((trainId: string, lineId: string) => {
    setGameState((prevState) => {
      const train = prevState.railNetwork.trains.get(trainId);
      const line = prevState.railNetwork.lines.get(lineId);
      
      if (!train || !line) {
        return prevState;
      }
      
      // Check if line has at least 2 stations
      if (line.stationIds.length < 2) {
        console.warn('Cannot assign train to line with less than 2 stations');
        return prevState;
      }
      
      // Handle re-assignment: remove train from old line if it was assigned
      const updatedLines = new Map(prevState.railNetwork.lines);
      if (train.lineId && train.lineId !== 'unassigned' && train.lineId !== lineId) {
        const oldLine = prevState.railNetwork.lines.get(train.lineId);
        if (oldLine) {
          updatedLines.set(train.lineId, {
            ...oldLine,
            trainIds: oldLine.trainIds.filter(id => id !== trainId),
            isActive: oldLine.trainIds.filter(id => id !== trainId).length > 0,
          });
        }
      }
      
      // Get existing trains on this line (excluding the one being assigned)
      const existingTrainsOnLine = Array.from(prevState.railNetwork.trains.values())
        .filter(t => t.lineId === lineId && t.id !== trainId);
      
      const numExistingTrains = existingTrainsOnLine.length;
      const numStations = line.stationIds.length;
      
      // Initialize train properties based on existing trains
      let stationIndex: number;
      let direction: 'forward' | 'backward';
      
      if (numExistingTrains === 0) {
        // First train on the line: start at beginning, going forward
        stationIndex = 0;
        direction = 'forward';
      } else if (numExistingTrains === 1) {
        // Second train: start at end going backward (opposite direction)
        stationIndex = numStations - 1;
        direction = 'backward';
      } else {
        // Multiple trains: distribute evenly
        // Alternate between forward and backward directions
        const isForward = numExistingTrains % 2 === 0;
        
        if (isForward) {
          // Forward trains: space them evenly along the line
          const forwardCount = Math.ceil((numExistingTrains + 1) / 2);
          const forwardIdx = Math.floor(numExistingTrains / 2);
          const spacing = Math.max(1, Math.floor(numStations / forwardCount));
          stationIndex = Math.min(forwardIdx * spacing, numStations - 1);
          direction = 'forward';
        } else {
          // Backward trains: space them evenly from the end
          const backwardCount = Math.floor((numExistingTrains + 1) / 2);
          const backwardIdx = Math.floor(numExistingTrains / 2);
          const spacing = Math.max(1, Math.floor(numStations / backwardCount));
          stationIndex = Math.max(numStations - 1 - backwardIdx * spacing, 0);
          direction = 'backward';
        }
      }
      
      // Get current and next station
      const currentStationId = line.stationIds[stationIndex];
      const currentStation = prevState.railNetwork.stations.get(currentStationId);
      
      if (!currentStation) {
        return prevState;
      }
      
      // Calculate next station arrival time
      const nextIndex = direction === 'forward' ? stationIndex + 1 : stationIndex - 1;
      let nextStationArrivalTime: number | undefined;
      
      if (nextIndex >= 0 && nextIndex < numStations) {
        const nextStationId = line.stationIds[nextIndex];
        const nextStation = prevState.railNetwork.stations.get(nextStationId);
        
        if (nextStation) {
          // Calculate distance and travel time
          const distance = calculateDistance(currentStation.position, nextStation.position);
          const travelTime = distance / train.speed;
          // Add time per station stop from config
          nextStationArrivalTime = prevState.simulationTime + travelTime + prevState.city.config.timePerStationStop;
        }
      }
      
      // Update train with new line assignment and calculated properties
      const updatedTrains = new Map(prevState.railNetwork.trains);
      updatedTrains.set(trainId, {
        ...train,
        lineId: lineId,
        currentStationIndex: stationIndex,
        direction: direction,
        position: { x: currentStation.position.x, y: currentStation.position.y },
        passengerIds: [], // Clear passengers when reassigning
        nextStationArrivalTime: nextStationArrivalTime,
        currentPath: undefined,
        currentPathIndex: undefined,
      });
      
      // Add train to line's trainIds if not already there
      const updatedLine = { ...line };
      if (!updatedLine.trainIds.includes(trainId)) {
        updatedLine.trainIds = [...updatedLine.trainIds, trainId];
        updatedLine.isActive = true;
      }
      updatedLines.set(lineId, updatedLine);
      
      const updatedRailNetwork = {
        ...prevState.railNetwork,
        trains: updatedTrains,
        lines: updatedLines,
      };
      
      // Recalculate citizen routes with updated network (line now has trains!)
      const updatedCitizens = calculateCitizenRoutes(
        prevState.citizens,
        prevState.city.config.neighborhoods,
        prevState.city.config,
        updatedRailNetwork
      );
      
      return {
        ...prevState,
        railNetwork: updatedRailNetwork,
        citizens: updatedCitizens,
      };
    });
  }, []);

  const handleStartBuildTrack = useCallback(() => {
    setBuildTrackState({
      isBuilding: true,
      points: [],
      totalDistance: 0,
      totalCost: 0,
    });
  }, []);

  const handleCancelBuildTrack = useCallback(() => {
    setBuildTrackState({
      isBuilding: false,
      points: [],
      totalDistance: 0,
      totalCost: 0,
    });
  }, []);

  const handleStartBuildStation = useCallback(() => {
    setBuildStationState({
      isBuilding: true,
    });
  }, []);

  const handleCancelBuildStation = useCallback(() => {
    setBuildStationState({
      isBuilding: false,
    });
  }, []);

  const handleMapClick = useCallback((x: number, y: number) => {
    // Handle station building
    if (buildStationState.isBuilding) {
      // Check if there's already a station at this position
      const existingStation = Array.from(gameState.railNetwork.stations.values()).find(
        s => s.position.x === x && s.position.y === y
      );
      
      if (existingStation) {
        console.warn('Station already exists at this position');
        return;
      }
      
      // Check if there's track at or adjacent to this position
      const hasTrack = Array.from(gameState.railNetwork.tracks.values()).some(track => {
        // Check if track passes through this cell
        return (track.from.x === x && track.from.y === y) || 
               (track.to.x === x && track.to.y === y);
      });
      
      if (!hasTrack) {
        console.warn('Station must be placed on or adjacent to track');
        return;
      }
      
      // Check if player can afford
      const stationCost = gameState.city.config.costPerStation;
      if (gameState.city.budget < stationCost) {
        console.warn('Insufficient budget to build station');
        return;
      }
      
      // Build the station
      setGameState((prevState) => {
        const newStationId = `station-${Date.now()}`;
        
        // Check if station is in a neighborhood
        const neighborhood = prevState.city.config.neighborhoods.find(
          n => n.position.x === x && n.position.y === y
        );
        
        const newStation = {
          id: newStationId,
          neighborhoodId: neighborhood?.id || '',
          position: { x, y },
          lineIds: [],
          waitingCitizens: new Map<string, string[]>(),
        };
        
        const updatedStations = new Map(prevState.railNetwork.stations);
        updatedStations.set(newStationId, newStation);
        
        const updatedRailNetwork = {
          ...prevState.railNetwork,
          stations: updatedStations,
        };
        
        // Recalculate citizen routes with updated network
        const updatedCitizens = calculateCitizenRoutes(
          prevState.citizens,
          prevState.city.config.neighborhoods,
          prevState.city.config,
          updatedRailNetwork
        );
        
        return {
          ...prevState,
          city: {
            ...prevState.city,
            budget: prevState.city.budget - stationCost,
          },
          railNetwork: updatedRailNetwork,
          citizens: updatedCitizens,
          stats: {
            ...prevState.stats,
            totalMoneySpent: prevState.stats.totalMoneySpent + stationCost,
          },
        };
      });
      
      // Exit build mode
      setBuildStationState({
        isBuilding: false,
      });
      
      return;
    }
    
    // Handle track building
    if (!buildTrackState.isBuilding) return;

    setBuildTrackState((prev) => {
      // First click - allow any position
      if (prev.points.length === 0) {
        return {
          ...prev,
          points: [{ x, y }],
        };
      }

      // Subsequent clicks - must be adjacent to last point
      const lastPoint = prev.points[prev.points.length - 1];
      const dx = Math.abs(x - lastPoint.x);
      const dy = Math.abs(y - lastPoint.y);

      // Check if adjacent (including diagonally)
      if (dx > 1 || dy > 1) {
        console.warn('Track segment must be adjacent to previous point');
        return prev;
      }

      // Check if point already exists in path (no backtracking)
      if (prev.points.some(p => p.x === x && p.y === y)) {
        console.warn('Cannot revisit the same point');
        return prev;
      }

      // Calculate segment distance and cost
      const segmentDistance = calculateDistance(lastPoint, { x, y });
      const isOverWater = gameState.city.config.tiles[x][y] === 'w';
      const costPerMile = isOverWater 
        ? gameState.city.config.costPerTrackMileWater 
        : gameState.city.config.costPerTrackMileLand;
      const segmentCost = Math.round(segmentDistance * costPerMile);

      return {
        ...prev,
        points: [...prev.points, { x, y }],
        totalDistance: prev.totalDistance + segmentDistance,
        totalCost: prev.totalCost + segmentCost,
      };
    });
  }, [buildTrackState.isBuilding, buildStationState.isBuilding, gameState.city.config, gameState.city.budget, gameState.railNetwork.stations, gameState.railNetwork.tracks]);

  const handleConfirmBuildTrack = useCallback(() => {
    if (buildTrackState.points.length < 2) {
      console.warn('Need at least 2 points to build track');
      return;
    }

    if (gameState.city.budget < buildTrackState.totalCost) {
      console.warn('Insufficient budget to build track');
      return;
    }

    setGameState((prevState) => {
      const newTracks = new Map(prevState.railNetwork.tracks);
      
      // Create track segments between each pair of points
      for (let i = 0; i < buildTrackState.points.length - 1; i++) {
        const from = buildTrackState.points[i];
        const to = buildTrackState.points[i + 1];
        
        // Check if track already exists (bidirectional)
        const existingTrack = Array.from(newTracks.values()).find(
          t => (t.from.x === from.x && t.from.y === from.y && t.to.x === to.x && t.to.y === to.y) ||
               (t.from.x === to.x && t.from.y === to.y && t.to.x === from.x && t.to.y === from.y)
        );
        
        if (existingTrack) {
          continue; // Skip if track already exists
        }
        
        const distance = calculateDistance(from, to);
        const isOverWater = prevState.city.config.tiles[to.x][to.y] === 'w' || 
                           prevState.city.config.tiles[from.x][from.y] === 'w';
        const costPerMile = isOverWater 
          ? prevState.city.config.costPerTrackMileWater 
          : prevState.city.config.costPerTrackMileLand;
        const cost = distance * costPerMile;
        
        const newTrack = {
          id: `track-${Date.now()}-${i}`,
          from,
          to,
          distance,
          isOverWater,
          cost,
          lineIds: [],
        };
        
        newTracks.set(newTrack.id, newTrack);
      }
      
      const updatedRailNetwork = {
        ...prevState.railNetwork,
        tracks: newTracks,
      };
      
      // Recalculate citizen routes with updated network
      const updatedCitizens = calculateCitizenRoutes(
        prevState.citizens,
        prevState.city.config.neighborhoods,
        prevState.city.config,
        updatedRailNetwork
      );
      
      return {
        ...prevState,
        city: {
          ...prevState.city,
          budget: prevState.city.budget - buildTrackState.totalCost,
        },
        railNetwork: updatedRailNetwork,
        citizens: updatedCitizens,
        stats: {
          ...prevState.stats,
          totalMoneySpent: prevState.stats.totalMoneySpent + buildTrackState.totalCost,
        },
      };
    });

    // Reset build state
    setBuildTrackState({
      isBuilding: false,
      points: [],
      totalDistance: 0,
      totalCost: 0,
    });
  }, [buildTrackState, gameState.city.budget]);

  const handleAssignStationToLine = useCallback((stationId: string, lineId: string, trackIds: string[]) => {
    setGameState((prevState) => {
      const station = prevState.railNetwork.stations.get(stationId);
      const line = prevState.railNetwork.lines.get(lineId);
      
      if (!station || !line) {
        return prevState;
      }

      // Update station to include line
      const updatedStations = new Map(prevState.railNetwork.stations);
      updatedStations.set(stationId, {
        ...station,
        lineIds: [...station.lineIds, lineId],
      });

      // Find where to insert the station in the line's station list
      // Insert it next to the station it's connected to
      let insertIndex = line.stationIds.length;
      for (let i = 0; i < line.stationIds.length; i++) {
        const existingStationId = line.stationIds[i];
        const existingStation = prevState.railNetwork.stations.get(existingStationId);
        if (existingStation && trackIds.length > 0) {
          // Check if this station is connected via our track path
          const firstTrack = prevState.railNetwork.tracks.get(trackIds[0]);
          if (firstTrack) {
            const isConnected = 
              (firstTrack.from.x === existingStation.position.x && firstTrack.from.y === existingStation.position.y) ||
              (firstTrack.to.x === existingStation.position.x && firstTrack.to.y === existingStation.position.y);
            
            if (isConnected) {
              insertIndex = i + 1;
              break;
            }
          }
        }
      }

      // Update line to include station
      const updatedLines = new Map(prevState.railNetwork.lines);
      const newStationIds = [...line.stationIds];
      newStationIds.splice(insertIndex, 0, stationId);
      
      updatedLines.set(lineId, {
        ...line,
        stationIds: newStationIds,
      });

      // Update tracks to include line
      const updatedTracks = new Map(prevState.railNetwork.tracks);
      trackIds.forEach(trackId => {
        const track = prevState.railNetwork.tracks.get(trackId);
        if (track && !track.lineIds.includes(lineId)) {
          updatedTracks.set(trackId, {
            ...track,
            lineIds: [...track.lineIds, lineId],
          });
        }
      });

      const updatedRailNetwork = {
        ...prevState.railNetwork,
        stations: updatedStations,
        lines: updatedLines,
        tracks: updatedTracks,
      };
      
      // Recalculate citizen routes with updated network
      const updatedCitizens = calculateCitizenRoutes(
        prevState.citizens,
        prevState.city.config.neighborhoods,
        prevState.city.config,
        updatedRailNetwork
      );
      
      return {
        ...prevState,
        railNetwork: updatedRailNetwork,
        citizens: updatedCitizens,
      };
    });
  }, []);

  const handleUnassignStationFromLine = useCallback((stationId: string, lineId: string) => {
    setGameState((prevState) => {
      const station = prevState.railNetwork.stations.get(stationId);
      const line = prevState.railNetwork.lines.get(lineId);
      
      if (!station || !line) {
        return prevState;
      }

      // Update station to remove line
      const updatedStations = new Map(prevState.railNetwork.stations);
      updatedStations.set(stationId, {
        ...station,
        lineIds: station.lineIds.filter(id => id !== lineId),
      });

      // Update line to remove station
      const updatedLines = new Map(prevState.railNetwork.lines);
      updatedLines.set(lineId, {
        ...line,
        stationIds: line.stationIds.filter(id => id !== stationId),
      });

      // Note: We don't remove the line from tracks because other stations might still use them

      const updatedRailNetwork = {
        ...prevState.railNetwork,
        stations: updatedStations,
        lines: updatedLines,
      };
      
      // Recalculate citizen routes with updated network
      const updatedCitizens = calculateCitizenRoutes(
        prevState.citizens,
        prevState.city.config.neighborhoods,
        prevState.city.config,
        updatedRailNetwork
      );
      
      return {
        ...prevState,
        railNetwork: updatedRailNetwork,
        citizens: updatedCitizens,
      };
    });
  }, []);

  const handleCreateNewLine = useCallback((stationId: string, lineName: string, lineColor: string) => {
    setGameState((prevState) => {
      const station = prevState.railNetwork.stations.get(stationId);
      
      if (!station) {
        return prevState;
      }

      const newLineId = `line-${Date.now()}`;
      const newLine = {
        id: newLineId,
        name: lineName,
        color: lineColor,
        stationIds: [stationId],
        trainIds: [],
        isActive: false,
      };

      // Update station to include new line
      const updatedStations = new Map(prevState.railNetwork.stations);
      updatedStations.set(stationId, {
        ...station,
        lineIds: [...station.lineIds, newLineId],
      });

      // Add new line
      const updatedLines = new Map(prevState.railNetwork.lines);
      updatedLines.set(newLineId, newLine);

      const updatedRailNetwork = {
        ...prevState.railNetwork,
        stations: updatedStations,
        lines: updatedLines,
      };
      
      // Recalculate citizen routes with updated network
      const updatedCitizens = calculateCitizenRoutes(
        prevState.citizens,
        prevState.city.config.neighborhoods,
        prevState.city.config,
        updatedRailNetwork
      );
      
      return {
        ...prevState,
        railNetwork: updatedRailNetwork,
        citizens: updatedCitizens,
      };
    });
  }, []);

  const timeOfDay = formatTime(gameState.simulationTime);
  const currentDay = gameState.city.currentDay;
  const dayStartTime = currentDay * MINUTES_PER_DAY;
  const timeIntoCurrentDay = gameState.simulationTime - dayStartTime;
  const dayProgress = (timeIntoCurrentDay / MINUTES_PER_DAY) * 100;
  return (
    <SelectionProvider>
      <div className="game-container">
        <div className="game-header">
          <h1>Rails Game</h1>
          <div className="day-time-display">
            <div className="day-info">
              <span className="day-label">Day {gameState.city.currentDay}</span>
              <span className="time-label">{timeOfDay}</span>
            </div>
            <div className="time-progress-bar">
              <div 
                className="time-progress-fill" 
                style={{ width: `${dayProgress}%` }}
              />
            </div>
          </div>
        <div className="game-controls">
          <div className="speed-controls">
            <button
              className={`speed-btn ${gameState.simulationSpeed === 1 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(1)}
              disabled={!gameState.isSimulating}
            >
              1x
            </button>
            <button
              className={`speed-btn ${gameState.simulationSpeed === 2 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(2)}
              disabled={!gameState.isSimulating}
            >
              2x
            </button>
            <button
              className={`speed-btn ${gameState.simulationSpeed === 5 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(5)}
              disabled={!gameState.isSimulating}
            >
              5x
            </button>
            <button
              className={`speed-btn ${gameState.simulationSpeed === 10 ? 'active' : ''}`}
              onClick={() => handleSpeedChange(10)}
              disabled={!gameState.isSimulating}
            >
              10x
            </button>
          </div>
          <button className="btn-primary" onClick={handleStartPause}>
            {gameState.isSimulating ? '⏸ Pause' : '▶ Start Day'}
          </button>
        </div>
      </div>
      
      <div className="game-content">
        <div className="left-panel">
          <GameStats 
            stats={gameState.stats}
            budget={gameState.city.budget}
            currentDay={gameState.city.currentDay}
          />
          <NetworkStats network={gameState.railNetwork} />
          
          {/* Build Track Controls */}
          <div className="panel build-track-panel">
            {!buildTrackState.isBuilding ? (
              <button 
                className="btn-primary" 
                onClick={handleStartBuildTrack}
                disabled={gameState.isSimulating || buildStationState.isBuilding}
              >
                🔧 Start Building Track
              </button>
            ) : (
              <div className="build-track-controls">
                <div className="build-track-info">
                  <p>Click on map to place track points</p>
                  <p>Points: {buildTrackState.points.length}</p>
                  <p>Distance: {buildTrackState.totalDistance.toFixed(2)} units</p>
                  <p>Cost: ${Math.round(buildTrackState.totalCost).toLocaleString()}</p>
                  <p>Budget: ${Math.round(gameState.city.budget).toLocaleString()}</p>
                </div>
                <div className="build-track-buttons">
                  <button 
                    className="btn-primary" 
                    onClick={handleConfirmBuildTrack}
                    disabled={buildTrackState.points.length < 2 || buildTrackState.totalCost > gameState.city.budget}
                  >
                    ✓ Confirm Track
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={handleCancelBuildTrack}
                  >
                    ✗ Cancel Track
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Build Station Controls */}
          <div className="panel build-track-panel">
            {!buildStationState.isBuilding ? (
              <button 
                className="btn-primary" 
                onClick={handleStartBuildStation}
                disabled={gameState.isSimulating || buildTrackState.isBuilding}
              >
                🏢 Start Building Station
              </button>
            ) : (
              <div className="build-track-controls">
                <div className="build-track-info">
                  <p>Click on map to place station</p>
                  <p>Cost: ${Math.round(gameState.city.config.costPerStation).toLocaleString()}</p>
                  <p>Budget: ${Math.round(gameState.city.budget).toLocaleString()}</p>
                </div>
                <div className="build-track-buttons">
                  <button 
                    className="btn-secondary" 
                    onClick={handleCancelBuildStation}
                  >
                    ✗ Cancel Station
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <ObjectInspector />
          
          <div className="panel-tabs">
            <button
              className={`tab ${activeTab === 'lines' ? 'active' : ''}`}
              onClick={() => setActiveTab('lines')}
            >
              Lines
            </button>
            <button
              className={`tab ${activeTab === 'trains' ? 'active' : ''}`}
              onClick={() => setActiveTab('trains')}
            >
              Trains
            </button>
            <button
              className={`tab ${activeTab === 'stations' ? 'active' : ''}`}
              onClick={() => setActiveTab('stations')}
            >
              Stations
            </button>
            <button
              className={`tab ${activeTab === 'passengers' ? 'active' : ''}`}
              onClick={() => setActiveTab('passengers')}
            >
              Passengers
            </button>
            <button
              className={`tab ${activeTab === 'trips' ? 'active' : ''}`}
              onClick={() => setActiveTab('trips')}
            >
              Trips
            </button>
          </div>
          
          <div className="panel-content">
            {activeTab === 'trips' && (
              <TripMatrixDisplay
                tripMatrix={gameState.currentTripMatrix}
                neighborhoods={gameState.city.config.neighborhoods}
              />
            )}
            {activeTab === 'lines' && (
              <LinesList
                lines={gameState.railNetwork.lines}
                stations={gameState.railNetwork.stations}
              />
            )}
            {activeTab === 'trains' && (
              <TrainsList
                trains={gameState.railNetwork.trains}
                lines={gameState.railNetwork.lines}
                stations={gameState.railNetwork.stations}
                budget={gameState.city.budget}
                trainCost={gameState.city.config.costPerTrain}
                onPurchaseTrain={handlePurchaseTrain}
                onAssignTrainToLine={handleAssignTrainToLine}
              />
            )}
            {activeTab === 'stations' && (
              <StationsList
                stations={gameState.railNetwork.stations}
                lines={gameState.railNetwork.lines}
              />
            )}
            {activeTab === 'passengers' && (
              <PassengersList
                citizens={gameState.citizens}
                neighborhoods={gameState.city.config.neighborhoods}
              />
            )}
          </div>
        </div>
        
        <div className="map-panel">
          <LeafletMap 
            gridWidth={gameState.city.config.gridWidth}
            gridHeight={gameState.city.config.gridHeight}
          >
            <CityGrid config={gameState.city.config} />
            <MapClickHandler
              onMapClick={(buildTrackState.isBuilding || buildStationState.isBuilding) ? handleMapClick : undefined}
            />
            <NeighborhoodMarkers
              neighborhoods={gameState.city.config.neighborhoods}
              activeNeighborhoodCount={gameState.activeNeighborhoodCount}
            />
            <StationMarkers
              stations={gameState.railNetwork.stations}
              lines={gameState.railNetwork.lines}
              citizens={gameState.citizens}
              neighborhoods={gameState.city.config.neighborhoods}
              onStationClick={(!buildTrackState.isBuilding && !buildStationState.isBuilding && !gameState.isSimulating) ? setSelectedStationForAssignment : undefined}
            />
            <TrackOverlay
              tracks={gameState.railNetwork.tracks}
              lines={gameState.railNetwork.lines}
            />
            {buildTrackState.isBuilding && (
              <DraftTrackOverlay
                points={buildTrackState.points}
              />
            )}
            {buildStationState.isBuilding && (
              <StationPlacementOverlay
                tracks={gameState.railNetwork.tracks}
                stations={gameState.railNetwork.stations}
              />
            )}
            <TrainMarkers
              trains={gameState.railNetwork.trains}
              lines={gameState.railNetwork.lines}
              citizens={gameState.citizens}
              neighborhoods={gameState.city.config.neighborhoods}
            />
          </LeafletMap>
        </div>
      </div>
      
        {/* Day Result Modal */}
        {dayResult && (
          <DayResultModal
            result={dayResult}
            onContinue={handleContinueDay}
            onGameOver={handleGameOver}
          />
        )}

        {/* Station Assignment Modal */}
        {selectedStationForAssignment && gameState.railNetwork.stations.get(selectedStationForAssignment) && (
          <StationAssignmentModal
            station={gameState.railNetwork.stations.get(selectedStationForAssignment)!}
            railNetwork={gameState.railNetwork}
            onClose={() => setSelectedStationForAssignment(null)}
            onAssignLine={handleAssignStationToLine}
            onUnassignLine={handleUnassignStationFromLine}
            onCreateNewLine={handleCreateNewLine}
          />
        )}
      </div>
    </SelectionProvider>
  );
}

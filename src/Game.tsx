import { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameStats,
  CityGrid,
  TrackOverlay,
  DraftTrackOverlay,
  TrainMarkers,
  NeighborhoodMarkers,
  StationMarkers,
  MapClickHandler,
  LinesList,
  DayResultModal,
  GameOverModal,
  StationAssignmentModal,
  LeafletMap,
  PlaybackControl
} from './components';
import { SelectionProvider } from './contexts/SelectionContext';
import type { GameState, DayResult, Neighborhood } from './models';
import { 
  tickSimulation, 
  calculateDayResult, 
  MINUTES_PER_DAY,
  calculateDistance,
  calculateCitizenRoutes,
  generateLineColor
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

export function Game({ gameState: initialGameState, onGameStateChange }: GameProps) {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [dayResult, setDayResult] = useState<DayResult | null>(null);
  const [buildTrackState, setBuildTrackState] = useState<BuildTrackState>({
    isBuilding: false,
    points: [],
    totalDistance: 0,
    totalCost: 0,
  });
  const [selectedStationForAssignment, setSelectedStationForAssignment] = useState<string | null>(null);
  const [drawingLineId, setDrawingLineId] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
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

  // Set initial map bounds on game start
  useEffect(() => {
    const activeCount = gameState.activeNeighborhoodCount;
    const neighborhoods = gameState.city.config.neighborhoods;
    const relevantNeighborhoods = neighborhoods.slice(0, Math.min(activeCount + 5, neighborhoods.length));
    
    if (relevantNeighborhoods.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      relevantNeighborhoods.forEach(n => {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x);
        maxY = Math.max(maxY, n.position.y);
      });
      
      // Add 0.5 units padding in each direction
      setMapBounds({
        minX: minX - 0.5,
        minY: minY - 0.5,
        maxX: maxX + 0.5,
        maxY: maxY + 0.5,
      });
    }
  }, []); // Run only once on mount

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

  // Stop simulation when game is over
  useEffect(() => {
    if (gameState.status === 'game-over' && gameState.isSimulating) {
      setGameState((prevState) => ({
        ...prevState,
        isSimulating: false,
      }));
    }
  }, [gameState.status, gameState.isSimulating]);

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
      
      const updatedStats = {
        ...prevState.stats,
        totalMoneyEarned: prevState.stats.totalMoneyEarned + budgetEarned,
      };
      
      const newDay = prevState.city.currentDay + 1;
      
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
        tripsGeneratedToday: 0,
      };
    });
    
    // Update map bounds to fit active neighborhoods + next 5
    const activeCount = gameState.activeNeighborhoodCount;
    const neighborhoods = gameState.city.config.neighborhoods;
    const relevantNeighborhoods = neighborhoods.slice(0, Math.min(activeCount + 5, neighborhoods.length));
    
    if (relevantNeighborhoods.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      relevantNeighborhoods.forEach(n => {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x);
        maxY = Math.max(maxY, n.position.y);
      });
      
      // Add 0.5 units padding in each direction
      setMapBounds({
        minX: minX - 0.5,
        minY: minY - 0.5,
        maxX: maxX + 0.5,
        maxY: maxY + 0.5,
      });
    }
  }, [dayResult, gameState.activeNeighborhoodCount, gameState.city.config.neighborhoods]);

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
        currentNeighborhoodIndex: 0,
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
      
      // Check if line has at least 2 neighborhoods
      if (line.neighborhoodIds.length < 2) {
        console.warn('Cannot assign train to line with less than 2 neighborhoods');
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
      const numNeighborhoods = line.neighborhoodIds.length;
      
      // Initialize train properties based on existing trains
      let neighborhoodIndex: number;
      let direction: 'forward' | 'backward';
      
      if (numExistingTrains === 0) {
        // First train on the line: start at beginning, going forward
        neighborhoodIndex = 0;
        direction = 'forward';
      } else if (numExistingTrains === 1) {
        // Second train: start at end going backward (opposite direction)
        neighborhoodIndex = numNeighborhoods - 1;
        direction = 'backward';
      } else {
        // Multiple trains: distribute evenly
        // Alternate between forward and backward directions
        const isForward = numExistingTrains % 2 === 0;
        
        if (isForward) {
          // Forward trains: space them evenly along the line
          const forwardCount = Math.ceil((numExistingTrains + 1) / 2);
          const forwardIdx = Math.floor(numExistingTrains / 2);
          const spacing = Math.max(1, Math.floor(numNeighborhoods / forwardCount));
          neighborhoodIndex = Math.min(forwardIdx * spacing, numNeighborhoods - 1);
          direction = 'forward';
        } else {
          // Backward trains: space them evenly from the end
          const backwardCount = Math.floor((numExistingTrains + 1) / 2);
          const backwardIdx = Math.floor(numExistingTrains / 2);
          const spacing = Math.max(1, Math.floor(numNeighborhoods / backwardCount));
          neighborhoodIndex = Math.max(numNeighborhoods - 1 - backwardIdx * spacing, 0);
          direction = 'backward';
        }
      }
      
      // Get current and next neighborhood
      const currentNeighborhoodId = line.neighborhoodIds[neighborhoodIndex];
      const currentNeighborhood = prevState.city.config.neighborhoods.find(n => n.id === currentNeighborhoodId);
      
      if (!currentNeighborhood) {
        return prevState;
      }
      
      // Calculate next neighborhood arrival time
      const nextIndex = direction === 'forward' ? neighborhoodIndex + 1 : neighborhoodIndex - 1;
      let nextNeighborhoodArrivalTime: number | undefined;
      
      if (nextIndex >= 0 && nextIndex < numNeighborhoods) {
        const nextNeighborhoodId = line.neighborhoodIds[nextIndex];
        const nextNeighborhood = prevState.city.config.neighborhoods.find(n => n.id === nextNeighborhoodId);
        
        if (nextNeighborhood) {
          // Calculate distance and travel time
          const distance = calculateDistance(currentNeighborhood.position, nextNeighborhood.position);
          const travelTime = distance / train.speed;
          // Add time per neighborhood stop from config
          nextNeighborhoodArrivalTime = prevState.simulationTime + travelTime + prevState.city.config.timePerStationStop;
        }
      }
      
      // Update train with new line assignment and calculated properties
      const updatedTrains = new Map(prevState.railNetwork.trains);
      updatedTrains.set(trainId, {
        ...train,
        lineId: lineId,
        currentNeighborhoodIndex: neighborhoodIndex,
        direction: direction,
        position: { x: currentNeighborhood.position.x, y: currentNeighborhood.position.y },
        passengerIds: [], // Clear passengers when reassigning
        nextNeighborhoodArrivalTime: nextNeighborhoodArrivalTime,
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

  const handleRemoveTrainFromLine = useCallback((trainId: string) => {
    setGameState((prevState) => {
      const train = prevState.railNetwork.trains.get(trainId);
      
      if (!train || train.lineId === 'unassigned') {
        return prevState;
      }
      
      const line = prevState.railNetwork.lines.get(train.lineId);
      
      // Remove train from line's trainIds
      const updatedLines = new Map(prevState.railNetwork.lines);
      if (line) {
        const updatedLine = {
          ...line,
          trainIds: line.trainIds.filter(id => id !== trainId),
        };
        // Deactivate line if no trains remain
        if (updatedLine.trainIds.length === 0) {
          updatedLine.isActive = false;
        }
        updatedLines.set(line.id, updatedLine);
      }
      
      // Update train to unassigned
      const updatedTrains = new Map(prevState.railNetwork.trains);
      updatedTrains.set(trainId, {
        ...train,
        lineId: 'unassigned',
        passengerIds: [], // Clear passengers when unassigning
        currentNeighborhoodIndex: 0,
        direction: 'forward',
        position: { x: 0, y: 0 },
        nextNeighborhoodArrivalTime: undefined,
        currentPath: undefined,
        currentPathIndex: undefined,
      });
      
      const updatedRailNetwork = {
        ...prevState.railNetwork,
        trains: updatedTrains,
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

  const handleMapClick = useCallback((x: number, y: number) => {    
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
  }, [buildTrackState.isBuilding, gameState.city.config, gameState.city.budget, gameState.railNetwork.tracks]);

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

  const handleAssignNeighborhoodToLine = useCallback((neighborhoodId: string, lineId: string, trackIds: string[]) => {
    setGameState((prevState) => {
      const neighborhood = prevState.city.config.neighborhoods.find(n => n.id === neighborhoodId);
      const line = prevState.railNetwork.lines.get(lineId);
      
      if (!neighborhood || !line) {
        return prevState;
      }

      // Update neighborhood to include line
      const updatedNeighborhoods = prevState.city.config.neighborhoods.map(n => 
        n.id === neighborhoodId ? { ...n, lineIds: [...(n.lineIds ?? []), lineId] } : n
      );

      // Find where to insert the neighborhood in the line's neighborhood list
      // Insert it next to the neighborhood it's connected to
      let insertIndex = line.neighborhoodIds.length;
      for (let i = 0; i < line.neighborhoodIds.length; i++) {
        const existingNeighborhoodId = line.neighborhoodIds[i];
        const existingNeighborhood = prevState.city.config.neighborhoods.find(n => n.id === existingNeighborhoodId);
        if (existingNeighborhood && trackIds.length > 0) {
          // Check if this neighborhood is connected via our track path
          const firstTrack = prevState.railNetwork.tracks.get(trackIds[0]);
          if (firstTrack) {
            const isConnected = 
              (firstTrack.from.x === existingNeighborhood.position.x && firstTrack.from.y === existingNeighborhood.position.y) ||
              (firstTrack.to.x === existingNeighborhood.position.x && firstTrack.to.y === existingNeighborhood.position.y);
            
            if (isConnected) {
              insertIndex = i + 1;
              break;
            }
          }
        }
      }

      // Update line to include neighborhood
      const updatedLines = new Map(prevState.railNetwork.lines);
      const newNeighborhoodIds = [...line.neighborhoodIds];
      newNeighborhoodIds.splice(insertIndex, 0, neighborhoodId);
      
      updatedLines.set(lineId, {
        ...line,
        neighborhoodIds: newNeighborhoodIds,
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
        lines: updatedLines,
        tracks: updatedTracks,
      };
      
      // Recalculate citizen routes with updated network
      const updatedCitizens = calculateCitizenRoutes(
        prevState.citizens,
        updatedNeighborhoods,
        prevState.city.config,
        updatedRailNetwork
      );
      
      return {
        ...prevState,
        city: {
          ...prevState.city,
          config: {
            ...prevState.city.config,
            neighborhoods: updatedNeighborhoods,
          },
        },
        railNetwork: updatedRailNetwork,
        citizens: updatedCitizens,
      };
    });
  }, []);

  const handleUnassignNeighborhoodFromLine = useCallback((neighborhoodId: string, lineId: string) => {
    setGameState((prevState) => {
      const neighborhood = prevState.city.config.neighborhoods.find(n => n.id === neighborhoodId);
      const line = prevState.railNetwork.lines.get(lineId);
      
      if (!neighborhood || !line) {
        return prevState;
      }

      // Update neighborhood to remove line
      const updatedNeighborhoods = prevState.city.config.neighborhoods.map(n =>
        n.id === neighborhoodId ? { ...n, lineIds: (n.lineIds ?? []).filter((id: string) => id !== lineId) } : n
      );

      // Update line to remove neighborhood
      const updatedLines = new Map(prevState.railNetwork.lines);
      updatedLines.set(lineId, {
        ...line,
        neighborhoodIds: line.neighborhoodIds.filter((id: string) => id !== neighborhoodId),
      });

      // Note: We don't remove the line from tracks because other neighborhoods might still use them

      const updatedRailNetwork = {
        ...prevState.railNetwork,
        lines: updatedLines,
      };
      
      // Recalculate citizen routes with updated network
      const updatedCitizens = calculateCitizenRoutes(
        prevState.citizens,
        updatedNeighborhoods,
        prevState.city.config,
        updatedRailNetwork
      );
      
      return {
        ...prevState,
        city: {
          ...prevState.city,
          config: {
            ...prevState.city.config,
            neighborhoods: updatedNeighborhoods,
          },
        },
        railNetwork: updatedRailNetwork,
        citizens: updatedCitizens,
      };
    });
  }, []);

  const handleDrawNewLine = useCallback(() => {
    setGameState((prevState) => {
      const newLineId = `line-${Date.now()}`;

      const existingColors = Array.from(prevState.railNetwork.lines.values()).map(line => line.color);
      const newColor = generateLineColor(existingColors);

      const name = `${prevState.railNetwork.lines.size + 1}`;
      
      const newLine = {
        id: newLineId,
        name: name,
        color: newColor,
        neighborhoodIds: [],
        trainIds: [],
        isActive: false,
      };
      const updatedLines = new Map(prevState.railNetwork.lines);
      updatedLines.set(newLineId, newLine);

      const updatedRailNetwork = {
        ...prevState.railNetwork,
        lines: updatedLines,
      };
      
      return {
        ...prevState,
        railNetwork: updatedRailNetwork,
      };
    });
  }, []);

  const handleCreateNewLine = useCallback((neighborhoodId: string, lineName: string, lineColor: string) => {
    setGameState((prevState) => {
      const neighborhood = prevState.city.config.neighborhoods.find(n => n.id === neighborhoodId);
      
      if (!neighborhood) {
        return prevState;
      }

      const newLineId = `line-${Date.now()}`;
      const newLine = {
        id: newLineId,
        name: lineName,
        color: lineColor,
        neighborhoodIds: [neighborhoodId],
        trainIds: [],
        isActive: false,
      };

      // Update neighborhood to include new line
      const updatedNeighborhoods = prevState.city.config.neighborhoods.map(n =>
        n.id === neighborhoodId ? { ...n, lineIds: [...(n.lineIds ?? []), newLineId] } : n
      );

      // Add new line
      const updatedLines = new Map(prevState.railNetwork.lines);
      updatedLines.set(newLineId, newLine);

      const updatedRailNetwork = {
        ...prevState.railNetwork,
        lines: updatedLines,
      };
      
      // Recalculate citizen routes with updated network
      const updatedCitizens = calculateCitizenRoutes(
        prevState.citizens,
        updatedNeighborhoods,
        prevState.city.config,
        updatedRailNetwork
      );
      
      return {
        ...prevState,
        city: {
          ...prevState.city,
          config: {
            ...prevState.city.config,
            neighborhoods: updatedNeighborhoods,
          },
        },
        railNetwork: updatedRailNetwork,
        citizens: updatedCitizens,
      };
    });
  }, []);

  const handleStartDrawLine = useCallback((lineId: string) => {
    setDrawingLineId(lineId);
    // Remove current stops from line
    // Remove line from neighborhoods and tracks
    setGameState((prevState) => {
      const line = prevState.railNetwork.lines.get(lineId);
      if (!line) return prevState;
      const updatedLines = new Map(prevState.railNetwork.lines);
      updatedLines.set(lineId, {
        ...line,
        neighborhoodIds: [],
      });

      const updatedNeighborhoods = prevState.city.config.neighborhoods.map(n => ({
        ...n,
        lineIds: (n.lineIds ?? []).filter(id => id !== lineId),
      }));
      
      const updatedTracks = new Map(prevState.railNetwork.tracks);
      updatedTracks.forEach((track, trackId) => {
        if (track.lineIds.includes(lineId)) {
          updatedTracks.set(trackId, {
            ...track,
            lineIds: track.lineIds.filter(id => id !== lineId),
          });
        }
      });

      const updatedRailNetwork = {
        ...prevState.railNetwork,
        lines: updatedLines,
        tracks: updatedTracks,
      };

      return {
        ...prevState,
        city: {
          ...prevState.city,
          config: {
            ...prevState.city.config,
            neighborhoods: updatedNeighborhoods,
          },
        },
        railNetwork: updatedRailNetwork,
      };
    });
  }, []);

  const handleStopDrawLine = useCallback(() => {
    setDrawingLineId(null);
  }, []);

  const currentDay = gameState.city.currentDay;
  const dayStartTime = currentDay * MINUTES_PER_DAY;
  const timeIntoCurrentDay = gameState.simulationTime - dayStartTime;
  const dayProgress = (timeIntoCurrentDay / MINUTES_PER_DAY);
  const neighborhoodMap: Map<string, Neighborhood> = new Map(gameState.city.config.neighborhoods.slice(0,gameState.activeNeighborhoodCount).map(n => [n.id, n]));
  return (
    <SelectionProvider>
      <div className="game-container">
        <div className="game-header">
          <h1 onContextMenu={() => console.log(gameState)}>Rails Game</h1>
        </div>
      
      <div className="game-content">
        <div className="left-panel">
          <GameStats 
            stats={gameState.stats}
            budget={gameState.city.budget}
          />
          
          {/* Build Track Controls */}
          <div className="panel build-track-panel">
            {!buildTrackState.isBuilding ? (
              <button 
                className="btn-primary" 
                onClick={handleStartBuildTrack}
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
          
          <div className="panel-content">
            <LinesList
              lines={gameState.railNetwork.lines}
              trains={gameState.railNetwork.trains}
              neighborhoods={gameState.city.config.neighborhoods}
              budget={gameState.city.budget}
              trainCost={gameState.city.config.costPerTrain}
              drawingLineId={drawingLineId}
              onPurchaseTrain={handlePurchaseTrain}
              onAssignTrainToLine={handleAssignTrainToLine}
              onRemoveTrainFromLine={handleRemoveTrainFromLine}
              onStartDrawLine={handleStartDrawLine}
              onStopDrawLine={handleStopDrawLine}
              onDrawNewLine={handleDrawNewLine}
            />
          </div>
        </div>
        
        <div className="map-panel">
          <LeafletMap 
            gridWidth={gameState.city.config.gridWidth}
            gridHeight={gameState.city.config.gridHeight}
            fitBounds={mapBounds}
          >
            <PlaybackControl
              currentDay={gameState.city.currentDay}
              dayProgress={dayProgress}
              isSimulating={gameState.isSimulating}
              simulationSpeed={gameState.simulationSpeed}
              onStartPause={handleStartPause}
              onSpeedChange={handleSpeedChange}
            />
            <CityGrid config={gameState.city.config} />
            <MapClickHandler
              onMapClick={buildTrackState.isBuilding ? handleMapClick : undefined}
            />
            <NeighborhoodMarkers
              neighborhoods={gameState.city.config.neighborhoods}
              activeNeighborhoodCount={gameState.activeNeighborhoodCount}
            />
            <StationMarkers
              neighborhoods={neighborhoodMap}
              lines={gameState.railNetwork.lines}
              citizens={gameState.citizens}
              tracks={gameState.railNetwork.tracks}
              drawingLineId={drawingLineId}
              onStationClick={!buildTrackState.isBuilding && !drawingLineId ? setSelectedStationForAssignment : undefined}
              onStationClickForDraw={drawingLineId ? handleAssignNeighborhoodToLine : undefined}
              stationCrowdingTimeLimit={gameState.city.config.stationCrowdingTimeLimit}
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
            <TrainMarkers
              trains={gameState.railNetwork.trains}
              lines={gameState.railNetwork.lines}
              citizens={gameState.citizens}
              neighborhoods={neighborhoodMap}
            />
          </LeafletMap>
        </div>
      </div>
      
        {/* Day Result Modal */}
        {dayResult && (
          <DayResultModal
            result={dayResult}
            onContinue={handleContinueDay}
          />
        )}

        {/* Game Over Modal */}
        {gameState.status === 'game-over' && (
          <GameOverModal
            gameState={gameState}
          />
        )}

        {/* Neighborhood Assignment Modal */}
        {selectedStationForAssignment && neighborhoodMap.has(selectedStationForAssignment) && (
          <StationAssignmentModal
            neighborhood={neighborhoodMap.get(selectedStationForAssignment)!}
            neighborhoods={neighborhoodMap}
            railNetwork={gameState.railNetwork}
            onClose={() => setSelectedStationForAssignment(null)}
            onAssignLine={handleAssignNeighborhoodToLine}
            onUnassignLine={handleUnassignNeighborhoodFromLine}
            onCreateNewLine={handleCreateNewLine}
          />
        )}
      </div>
    </SelectionProvider>
  );
}

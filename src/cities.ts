import type { CityState, TileType } from "./models";
import neighborhoods from "./transformed-neighborhoods";

export const SeattleTiles : TileType[][] = [
  [ "w", "w", "w", "w", "w", "w", "w", "w", "w", "w", "w", "w", "l", "w", "w", "w", "w", "w", "w", "w" ],
  [ "w", "w", "w", "w", "w", "w", "l", "w", "w", "w", "w", "l", "l", "w", "w", "w", "w", "w", "w", "w" ],
  [ "w", "w", "l", "l", "l", "l", "l", "l", "w", "w", "l", "l", "l", "l", "l", "l", "w", "w", "w", "l" ],
  [ "w", "l", "l", "l", "l", "l", "l", "w", "w", "w", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "w", "l", "l", "l", "l", "w", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "w", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "w", "w", "l", "l", "w", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "w", "w", "w", "w", "w", "w", "w", "w", "l", "w", "w", "w", "w", "w", "l" ],
  [ "l", "l", "w", "w", "w", "w", "l", "l", "w", "l", "l", "w", "w", "w", "w", "l", "l", "l", "l", "l" ],
  [ "l", "l", "w", "w", "l", "l", "l", "w", "w", "l", "l", "l", "w", "w", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "w", "w", "w", "w", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "w", "w", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "w", "w", "w", "w", "w", "w", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
  [ "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l", "l" ],
];

export const SeattleConfig : CityState = {
  config: {
      id: 'seattle',
      name: 'Seattle',
      gridWidth: 20,
      gridHeight: 20,
      tiles: SeattleTiles,
      neighborhoods: neighborhoods,
      // Total number of trips grows quadratically, so that trips per day grows linearly
      totalTripsStartedAtTime: (elapsedMinutes: number) => {
        // at 300 minutes, 50 total trips
        // at 600 minutes, 150 total trips
        // at 900 minutes, 300 total trips
        return elapsedMinutes * elapsedMinutes / 3600 + elapsedMinutes / 12;
      },
      activeNeighborhoodsAtTime : (elapsedMinutes: number) => Math.min(3 + Math.floor(elapsedMinutes / 100), 400),
      initialBudget: 20,
      budgetBaseline: 3,
      trainSpeed: 0.25,
      timePerStationStop: 1,
      stationCapacity: 5,
      stationCrowdingTimeLimit: 60,
      costPerStation: 1,
      costPerTrackMileLand: 1,
      costPerTrackMileWater: 2,
      costPerTrain: 1,
      trainCapacity: 6,
    },
    currentDay: 0,
    budget: 20,
  };
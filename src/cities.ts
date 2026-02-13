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
      water: [
        "M0 0 v20 h4 v-1 h-1 v-1 h-1 v-4 h-1 v-1 h1 v-1 h1 v1 h1 v-1 h1 v-1 h-1 v-1 h-2 v-1 h-1 v-1 h-1 v-1 h2 v-3 h1 v-3 h-1 v-1 z", // Puget Sound
        "M4 6 v1 h1 v-1 z", // Green Lake
        "M5 9 v1 h1 v-1 z", // Lake Union
        "M8 1 v5 h1 v1 h-1 v1 h-1 v1 h1 v2 h-1 v2 h1 v2 h1 v3 h2 v-1 h1 v-4 h-1 v3 h-1 v-2 h-1 v-2 h1 v1 h1 v-2 h-2 v-2 h1 v-1 h1 v-2 h-1 v-1 h-1 v-4 z", // Lake Washington
        "M16 8 v3 h-1 v2 h1 v1 h1 v-6 z", // Lake Sammamish
      ],
      neighborhoods: neighborhoods,
      // Total number of trips grows quadratically, so that trips per day grows linearly
      totalTripsStartedAtTime: (elapsedMinutes: number) => {
        // at 300 minutes, 50 total trips
        // at 600 minutes, 150 total trips
        // at 900 minutes, 300 total trips
        return elapsedMinutes * elapsedMinutes / 3600 + elapsedMinutes / 12;
      },
      activeNeighborhoodsAtTime : (elapsedMinutes: number) => Math.min(Math.floor(3.1 + elapsedMinutes / 100), 400),
      initialBudget: 20,
      initialEngines: 3,
      initialLines: 3,
      initialTrainCapacity: 4,
      initialTrainSpeed: 0.25,
      reward: (_dayCompleted: number) => {
        // Always earn $6 and 1 engine per day
        // Equal chance of earning one of: 1 line, 2 train capacity, or 0.05 train speed
        const roll = Math.floor(Math.random() * 3);
        return {
          budgetEarned: 6,
          enginesEarned: 1,
          linesEarned: roll === 0 ? 1 : 0,
          trainCapacityEarned: roll === 1 ? 2 : 0,
          trainSpeedEarned: roll === 2 ? 0.05 : 0,
        };
      },
      timePerStationStop: 1,
      stationCapacity: 5,
      stationCrowdingTimeLimit: 60,
      costPerStation: 1,
      costPerTrackMileLand: 1,
      costPerTrackMileWater: 2,
      costPerTrain: 1,
    },
    currentDay: 0,
    budget: 20,
  };
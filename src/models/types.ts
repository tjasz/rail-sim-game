// Basic types used across models

export interface Position {
  x: number;
  y: number;
}

export interface GridCell {
  position: Position;
  isWater: boolean;
}

export type TileType = 'land' | 'water';

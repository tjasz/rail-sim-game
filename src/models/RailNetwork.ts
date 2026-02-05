import type { Line } from './Line';
import type { Train } from './Train';

export interface RailNetwork {
  lines: Map<string, Line>;
  trains: Map<string, Train>;
}

export interface RailNetworkStats {
  totalStations: number;
  totalTrains: number;
  totalLines: number;
  activeLines: number;
}

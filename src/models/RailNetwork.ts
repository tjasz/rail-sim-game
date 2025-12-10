import type { Track } from './Track';
import type { Line } from './Line';
import type { Train } from './Train';

export interface RailNetwork {
  tracks: Map<string, Track>;
  lines: Map<string, Line>;
  trains: Map<string, Train>;
}

export interface RailNetworkStats {
  totalStations: number;
  totalTrackMiles: number;
  totalTrains: number;
  totalLines: number;
  activeLines: number;
}

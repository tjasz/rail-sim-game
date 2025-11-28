import type { Station } from './Station';
import type { Track } from './Track';
import type { Line } from './Line';
import type { Train } from './Train';

export interface RailNetwork {
  stations: Map<string, Station>;
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

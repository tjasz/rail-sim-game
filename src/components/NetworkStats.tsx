import type { RailNetwork } from '../models';

interface NetworkStatsProps {
  network: RailNetwork;
}

export function NetworkStats({ network }: NetworkStatsProps) {
  const activeLines = Array.from(network.lines.values()).filter(line => line.isActive).length;
  const totalTrackMiles = Array.from(network.tracks.values())
    .reduce((sum, track) => sum + track.distance, 0);
  
  return (
    <div className="network-stats">
      <h3>Network</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Stations</span>
          <span className="stat-value">{network.stations.size}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Track Miles</span>
          <span className="stat-value">{totalTrackMiles.toFixed(1)}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Lines</span>
          <span className="stat-value">{network.lines.size}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Active Lines</span>
          <span className="stat-value">{activeLines}</span>
        </div>
        
        <div className="stat-item">
          <span className="stat-label">Trains</span>
          <span className="stat-value">{network.trains.size}</span>
        </div>
      </div>
    </div>
  );
}

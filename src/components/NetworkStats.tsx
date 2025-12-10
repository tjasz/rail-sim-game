import { useState } from 'react';
import type { RailNetwork } from '../models';

interface NetworkStatsProps {
  network: RailNetwork;
}

export function NetworkStats({ network }: NetworkStatsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const activeLines = Array.from(network.lines.values()).filter(line => line.isActive).length;
  const totalTrackMiles = Array.from(network.tracks.values())
    .reduce((sum, track) => sum + track.distance, 0);
  
  return (
    <div className="network-stats" onContextMenu={() => console.log(network)}>
      <h3>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            marginRight: '8px',
            padding: 0,
            fontSize: 'inherit'
          }}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
        Network
      </h3>
      {!isCollapsed && <div className="stats-grid">
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
      </div>}
    </div>
  );
}

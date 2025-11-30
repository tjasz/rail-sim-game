import type { TripMatrix, Neighborhood } from '../models';

interface TripMatrixDisplayProps {
  tripMatrix?: TripMatrix;
  neighborhoods: Neighborhood[];
}

export function TripMatrixDisplay({ tripMatrix, neighborhoods }: TripMatrixDisplayProps) {
  if (!tripMatrix) {
    return (
      <div className="trip-matrix-display">
        <h3>Today's Trips</h3>
        <p className="empty-state">No trips generated yet</p>
      </div>
    );
  }
  
  // Get list of neighborhoods that have trips originating from them
  const origins = neighborhoods.filter(n => tripMatrix.trips.has(n.id));
  const destinations = neighborhoods;

  return (
    <div className="trip-matrix-display">
      <h3>Today's Trip Matrix</h3>
      <div className="matrix-summary">
        <span className="summary-label">Total Trips:</span>
        <span className="summary-value">{tripMatrix.totalTrips}</span>
      </div>
      
      <div className="matrix-table-container">
        <table className="trip-matrix-table">
          <thead>
            <tr>
              <th>Origin / Destination</th>
              {destinations.map(dest => (
                <th key={dest.id} title={dest.name}>
                  {dest.name.substring(0, 8)}
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {origins.map(origin => {
              const originTrips = tripMatrix.trips.get(origin.id);
              const rowTotal = originTrips 
                ? Array.from(originTrips.values()).reduce((sum, count) => sum + count, 0)
                : 0;
              
              return (
                <tr key={origin.id}>
                  <td className="origin-cell">{origin.name}</td>
                  {destinations.map(dest => {
                    const count = originTrips?.get(dest.id) || 0;
                    return (
                      <td key={dest.id} className={count > 0 ? 'has-trips' : ''}>
                        {count > 0 ? count : '-'}
                      </td>
                    );
                  })}
                  <td className="total-cell">{rowTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

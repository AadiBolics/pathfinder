import React from 'react';
import './Sidebar.css';

// We now accept an onTimeChange prop
function Sidebar({ warehouse, stops, onDeleteStop, onCalculateRoute, isLoading, onTimeChange }) {
  const formatCoords = (point) => {
    if (!point) return "Not set";
    return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
  };

  return (
    <div className="sidebar">
      <h2>Pathfinder Control</h2>
      
      <div className="location-list">
        <h3>Warehouse</h3>
        <p className="warehouse-item">{formatCoords(warehouse)}</p>
        
        <h3>Delivery Stops ({stops.length})</h3>
        <ul>
          {stops.map((stop, index) => (
            <li key={`stop-item-${index}`}>
              <div className="stop-header">
                <span>Stop {index + 1}: {formatCoords(stop)}</span>
                <button onClick={() => onDeleteStop(index)} className="delete-btn">
                  X
                </button>
              </div>
              {/* --- NEW: Time Window Inputs --- */}
              <div className="time-window-inputs">
                <span>Deliver between:</span>
                <input
                  type="time"
                  value={stop.startTime || ''}
                  onChange={(e) => onTimeChange(index, 'startTime', e.target.value)}
                />
                <span>and</span>
                <input
                  type="time"
                  value={stop.endTime || ''}
                  onChange={(e) => onTimeChange(index, 'endTime', e.target.value)}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <button
        className="calculate-btn"
        onClick={onCalculateRoute}
        disabled={!warehouse || stops.length === 0 || isLoading}
      >
        {isLoading ? 'Calculating...' : 'Calculate Route'}
      </button>
    </div>
  );
}

export default Sidebar;
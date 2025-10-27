import React from "react";
import "./Sidebar.css";

// We now accept an onTimeChange prop
function Sidebar({
  warehouse,
  stops,
  onDeleteStop,
  onCalculateRoute,
  isLoading,
  onTimeChange,
  routeSummary,
  clickedAddress,
}) {
  const formatAddress = (point) => {
    if (!point || !point.address) return "Not set";
    return point.address;
  };

  const formatSummary = (summary) => {
    if (!summary) return { distance: "0 Km", duration: "0 mins" };

    // Your .toFixed(2) is a great choice!
    const distanceKm = (summary.distance / 1000).toFixed(2);
    const durationMins = Math.round(summary.duration / 60);

    return {
      distance: `${distanceKm} Km`,
      duration: `${durationMins} mins`,
    };
  };

  const summary = formatSummary(routeSummary);

  return (
    <div className="sidebar">
      <h2>Pathfinder Control</h2>

      {routeSummary && (
        <div className="route-summary">
          <h3> Route Summary</h3>
          <div className="summary-item">
            <span>Total Distance:</span>
            <strong>{summary.distance}</strong>
          </div>
          <div className="summary-item">
            {/* TYPO FIX: Changed "Est: duration:" to "Est. Duration:" */}
            <span>Est. Duration:</span>
            <strong>{summary.duration}</strong>
          </div>
        </div>
      )}

      <div className="location-list">
        <h3>Warehouse</h3>
        <p className="warehouse-item">{formatAddress(warehouse)}</p>
        <h3>Delivery Stops ({stops.length})</h3>
        <ul>
          {stops.map((stop, index) => (
            <li key={`stop-item-${index}`}>
              <div className="stop-header">
                <span>Stop {index + 1}: {formatAddress(stop)}</span>

                <button
                  onClick={() => onDeleteStop(index)}
                  className="delete-btn"
                >
                  X
                </button>
              </div>
              {/* --- NEW: Time Window Inputs --- */}
              <div className="time-window-inputs">
                <span>Deliver between:</span>
                <input
                  type="time"
                  value={stop.startTime || ""}
                  onChange={(e) =>
                    onTimeChange(index, "startTime", e.target.value)
                  }
                />
                <span>and</span>
                <input
                  type="time"
                  value={stop.endTime || ""}
                  onChange={(e) =>
                    onTimeChange(index, "endTime", e.target.value)
                  }
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
        {isLoading ? "Calculating..." : "Calculate Route"}
      </button>
    </div>
  );
}

export default Sidebar;

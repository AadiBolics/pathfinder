import React from 'react';
import './NumberedMarker.css';

// This component takes a number and color to display on the pin
function NumberedMarker({ number, color }) {
  return (
    <div className="marker-container">
      <svg
        height="40"
        viewBox="0 0 24 24"
        style={{ fill: color, stroke: '#fff', strokeWidth: 1 }}
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
      </svg>
      <div className="marker-number">{number}</div>
    </div>
  );
}

export default NumberedMarker;
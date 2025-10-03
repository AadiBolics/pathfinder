import React, { useState } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import Sidebar from './Sidebar';
import NumberedMarker from './NumberedMarker';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

function App() {
  const [viewState, setViewState] = useState({
    longitude: 76.33,
    latitude: 9.68,
    zoom: 12,
  });

  const [warehouse, setWarehouse] = useState(null);
  const [stops, setStops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [optimizedPath, setOptimizedPath] = useState([]);
  const [routeGeometry, setRouteGeometry] = useState(null);

  const handleMapClick = (event) => {
    if (isLoading) return;
    const { lng, lat } = event.lngLat;
    
    // NEW: Stop object now includes time windows
    const newPoint = { lng, lat, startTime: '', endTime: '' };

    if (!warehouse) {
      setWarehouse(newPoint);
    } else {
      setStops([...stops, newPoint]);
    }
  };

  const handleDeleteStop = (indexToDelete) => {
    setStops(stops.filter((_, index) => index !== indexToDelete));
  };

  // NEW: This function updates the time for a specific stop
  const handleTimeChange = (index, field, value) => {
    const updatedStops = [...stops];
    updatedStops[index][field] = value;
    setStops(updatedStops);
  };
  
  const handleCalculateRoute = async () => {
    setIsLoading(true);
    setRouteGeometry(null);
    setOptimizedPath([]);
    
    try {
      // The stops array now automatically includes the time data
      const response = await axios.post('http://localhost:5000/api/optimize-route', {
        warehouse,
        stops,
      });
      setOptimizedPath(response.data.optimizedPath);
      setRouteGeometry(response.data.routeGeometry);
    } catch (error) {
      console.error("Error calculating route:", error.response ? error.response.data : error.message);
      alert(`Failed to calculate route: ${error.response ? error.response.data.error : error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const markersToDisplay = optimizedPath.length > 0 ? optimizedPath.slice(0, -1) : [warehouse, ...stops].filter(Boolean);

  return (
    <div className="app-container">
      <Sidebar
        warehouse={warehouse}
        stops={stops}
        onDeleteStop={handleDeleteStop}
        onCalculateRoute={handleCalculateRoute}
        isLoading={isLoading}
        onTimeChange={handleTimeChange} // <-- Pass the new handler down
      />
      <div className="map-container">
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          onClick={handleMapClick}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/streets-v11"
          cursor="crosshair"
        >
          {optimizedPath.length === 0 ? (
            <>
              {warehouse && <Marker longitude={warehouse.lng} latitude={warehouse.lat} color="red" />}
              {stops.map((stop, index) => (
                <Marker key={`stop-${index}`} longitude={stop.lng} latitude={stop.lat} color="blue" />
              ))}
            </>
          ) : (
            optimizedPath.slice(0, -1).map((point, index) => (
              <Marker key={`optimized-marker-${index}`} longitude={point.lng} latitude={point.lat}>
                <NumberedMarker
                  color={index === 0 ? '#dc3545' : '#007bff'}
                  number={index > 0 ? index : null}
                />
              </Marker>
            ))
          )}

          {routeGeometry && (
            <Source id="route" type="geojson" data={routeGeometry}>
              <Layer
                id="route"
                type="line"
                paint={{ 'line-color': '#007cbf', 'line-width': 5, 'line-opacity': 0.85 }}
              />
            </Source>
          )}
        </Map>
      </div>
    </div>
  );
}

export default App;
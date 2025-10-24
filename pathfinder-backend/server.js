// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// A simple constant for average travel speed in km/h, used for time estimations
const AVERAGE_SPEED_KMH = 40;

// --- CORE HELPER FUNCTIONS ---

/**
 * Calculates the distance between two lat/lng points in kilometers using the Haversine formula.
 */
function calculateDistance(point1, point2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
  const dLng = (point2.lng - point1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * (Math.PI / 180)) *
      Math.cos(point2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the total distance of a given path.
 */
function calculatePathDistance(path) {
    let totalDistance = 0;
    for (let i = 0; i < path.length - 1; i++) {
        totalDistance += calculateDistance(path[i], path[i+1]);
    }
    return totalDistance;
}


/**
 * Checks if a given path is valid according to all time window constraints.
 * Returns true if valid, false otherwise.
 */
function isPathTimeValid(path, startTime = '09:00') {
  let currentTime = new Date(`1970-01-01T${startTime}:00Z`); // Use Z for UTC to be safe
  for (let i = 0; i < path.length - 1; i++) {
    const currentStop = path[i];
    const nextStop = path[i + 1];

    const distance = calculateDistance(currentStop, nextStop);
    const travelTimeMillis = (distance / AVERAGE_SPEED_KMH) * 60 * 60 * 1000;
    currentTime.setTime(currentTime.getTime() + travelTimeMillis);

    const stopStartTime = nextStop.startTime ? new Date(`1970-01-01T${nextStop.startTime}:00Z`) : null;
    const stopEndTime = nextStop.endTime ? new Date(`1970-01-01T${nextStop.endTime}:00Z`) : null;
    
    // Check for lateness
    if (stopEndTime && currentTime > stopEndTime) {
      return false; // This path is invalid because we arrived too late.
    }
    
    // Account for waiting time if we arrive early
    if (stopStartTime && currentTime < stopStartTime) {
      currentTime = stopStartTime;
    }
  }
  return true; // If we made it through the whole loop, the path is valid!
}


// --- PHASE 1: GENERATE A VALID ROUTE ---

/**
 * Solves the TSP using a time-aware Nearest Neighbor greedy algorithm.
 * Its goal is to find a *valid* initial solution.
 */
function solveTspWithTimeWindows(warehouse, stops, startTime = '09:00') {
  if (!warehouse) return [];
  
  const allStops = [warehouse, ...stops];
  const numStops = allStops.length;
  if (numStops <= 1) return allStops;

  const visited = new Array(numStops).fill(false);
  const path = [];
  
  let currentTime = new Date(`1970-01-01T${startTime}:00Z`);
  
  let currentStopIndex = 0;
  path.push(allStops[currentStopIndex]);
  visited[currentStopIndex] = true;

  while (path.length < numStops) {
    let bestNextStopIndex = -1;
    let bestCost = Infinity;

    for (let j = 0; j < numStops; j++) {
      if (!visited[j]) {
        const nextStop = allStops[j];
        const distance = calculateDistance(allStops[currentStopIndex], nextStop);
        const travelTimeMillis = (distance / AVERAGE_SPEED_KMH) * 60 * 60 * 1000;
        const estimatedArrivalTime = new Date(currentTime.getTime() + travelTimeMillis);

        const stopStartTime = nextStop.startTime ? new Date(`1970-01-01T${nextStop.startTime}:00Z`) : null;
        const stopEndTime = nextStop.endTime ? new Date(`1970-01-01T${nextStop.endTime}:00Z`) : null;

        if (stopEndTime && estimatedArrivalTime > stopEndTime) {
          continue; // Skip invalid stop
        }

        let waitTimeMillis = 0;
        if (stopStartTime && estimatedArrivalTime < stopStartTime) {
          waitTimeMillis = stopStartTime.getTime() - estimatedArrivalTime.getTime();
        }
        
        const totalCost = travelTimeMillis + waitTimeMillis;
        if (totalCost < bestCost) {
          bestCost = totalCost;
          bestNextStopIndex = j;
        }
      }
    }
    
    if (bestNextStopIndex === -1) {
        // No valid unvisited stop could be found from the current location.
        // This means the time constraints might be impossible to meet.
        return []; // Return empty path to indicate failure
    }
    
    // Update clock and move to the best valid stop
    const distance = calculateDistance(allStops[currentStopIndex], allStops[bestNextStopIndex]);
    const travelTimeMillis = (distance / AVERAGE_SPEED_KMH) * 60 * 60 * 1000;
    currentTime.setTime(currentTime.getTime() + travelTimeMillis);

    const stopStartTime = allStops[bestNextStopIndex].startTime ? new Date(`1970-01-01T${allStops[bestNextStopIndex].startTime}:00Z`) : null;
    if(stopStartTime && currentTime < stopStartTime){
        currentTime = stopStartTime;
    }

    currentStopIndex = bestNextStopIndex;
    path.push(allStops[currentStopIndex]);
    visited[currentStopIndex] = true;
  }
  
  path.push(warehouse); // Complete the round trip
  return path;
}


// --- PHASE 2: REFINE THE VALID ROUTE ---

/**
 * Improves a given path using a time-aware 2-Opt algorithm.
 * Its goal is to make a *valid* path *shorter*, without breaking time rules.
 */
function improveWithTimeAware2Opt(path) {
    if (path.length <= 3) return path; // Cannot optimize a path with 1 stop or less

    let bestPath = [...path];
    let improvementMade = true;

    while (improvementMade) {
        improvementMade = false;
        let bestDistance = calculatePathDistance(bestPath);

        for (let i = 1; i < bestPath.length - 2; i++) {
            for (let k = i + 1; k < bestPath.length - 1; k++) {
                const newPath = [...bestPath.slice(0, i), ...bestPath.slice(i, k + 1).reverse(), ...bestPath.slice(k + 1)];
                const newDistance = calculatePathDistance(newPath);

                // CRITICAL: Check both distance AND time validity
                if (newDistance < bestDistance && isPathTimeValid(newPath)) {
                    bestPath = newPath;
                    bestDistance = newDistance;
                    improvementMade = true;
                }
            }
        }
    }
    return bestPath;
}


// --- MAIN API ENDPOINT ---

app.get('/', (req, res) => res.send('Pathfinder Backend is running!'));

app.post('/api/optimize-route', async (req, res) => {
  try {
    const { warehouse, stops } = req.body;
    const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

    if (!warehouse || !stops) {
      return res.status(400).json({ error: 'Warehouse and stops are required.' });
    }

    // --- The Two-Phase Optimization Strategy ---
    // 1. Generate an initial VALID route that respects time windows.
    const initialValidPath = solveTspWithTimeWindows(warehouse, stops);

    if (initialValidPath.length === 0) {
        return res.status(400).json({ error: 'Could not find a valid route that meets all time window constraints. The constraints might be impossible.' });
    }

    // 2. Refine that valid route to make it shorter, without breaking time rules.
    const finalOptimizedPath = improveWithTimeAware2Opt(initialValidPath);

    // 3. Fetch the actual route geometry from Mapbox for the final, refined path.
    const coordinatesString = finalOptimizedPath.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const routeData = data.routes[0]; // Get the whole route object
      const routeGeometry = routeData.geometry;
      const routeDistance = routeData.distance; // in meters
      const routeDuration = routeData.duration;
      res.json({
        message: 'Route optimized and fetched successfully!',
        optimizedPath: finalOptimizedPath,
        routeGeometry: routeGeometry,
        totalDistance: routeDistance,  // <-- ADD THIS
        totalDuration: routeDuration,  // <-- ADD THIS
      });
    } else {
      // If Mapbox fails, still send back the path so the user can see the order
      res.status(500).json({ 
        message: 'Path optimized, but failed to fetch route geometry from Mapbox.',
        optimizedPath: finalOptimizedPath,
        routeGeometry: null,
       });
    }
  } catch (error) {
    console.error('Error in /api/optimize-route:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});


// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT} in India.`);
});
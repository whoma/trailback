import { useState, useCallback, useRef, useEffect } from 'react';
import MapView from './components/MapView';
import StatusBar from './components/StatusBar';
import Controls from './components/Controls';
import BacktrackPanel from './components/BacktrackPanel';
import HistoryPanel from './components/HistoryPanel';
import SaveDialog from './components/SaveDialog';
import { useGeolocation } from './hooks/useGeolocation';
import { getDistance, getTotalDistance } from './utils/geo';
import { getSavedRoutes, saveRoute, deleteRoute } from './utils/storage';
import './App.css';

const MIN_DISTANCE = 3; // minimum meters between recorded points
const BACKTRACK_ARRIVE_DISTANCE = 8; // meters to consider "arrived" at waypoint

export default function App() {
  const {
    position,
    accuracy,
    heading,
    startWatching,
    stopWatching,
    requestOrientationPermission,
  } = useGeolocation();

  const [recording, setRecording] = useState(false);
  const [path, setPath] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const [showHistory, setShowHistory] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routes, setRoutes] = useState(() => getSavedRoutes());

  const [backtracking, setBacktracking] = useState(false);
  const [backtrackRoute, setBacktrackRoute] = useState(null);
  const [backtrackIndex, setBacktrackIndex] = useState(0);

  // View-only mode (show a saved route on map)
  const [viewPath, setViewPath] = useState(null);

  const mapRef = useRef(null);
  const pendingPathRef = useRef([]);

  // Timer for elapsed time
  useEffect(() => {
    if (!recording || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [recording, startTime]);

  // Record positions into path
  useEffect(() => {
    if (!recording || !position) return;

    const currentPath = pendingPathRef.current;
    if (currentPath.length === 0) {
      currentPath.push(position);
      setPath([...currentPath]);
      return;
    }

    const lastPoint = currentPath[currentPath.length - 1];
    const dist = getDistance(lastPoint, position);
    if (dist >= MIN_DISTANCE) {
      currentPath.push(position);
      setPath([...currentPath]);
      setTotalDistance(getTotalDistance(currentPath));
    }
  }, [recording, position]);

  // Auto-advance backtrack waypoint
  useEffect(() => {
    if (!backtracking || !position || !backtrackRoute) return;

    const target = backtrackRoute[backtrackIndex];
    if (!target) return;

    const dist = getDistance(position, target);
    if (dist < BACKTRACK_ARRIVE_DISTANCE && backtrackIndex < backtrackRoute.length - 1) {
      setBacktrackIndex((i) => i + 1);
    }
  }, [backtracking, position, backtrackRoute, backtrackIndex]);

  // Center map on backtrack target changes
  useEffect(() => {
    if (!backtracking || !backtrackRoute || !mapRef.current) return;
    const target = backtrackRoute[backtrackIndex];
    if (target && position) {
      mapRef.current.fitBounds([position, target], { padding: [80, 80] });
    }
  }, [backtrackIndex, backtracking]);

  const handleToggleRecord = useCallback(() => {
    if (recording) {
      // Stop recording
      setRecording(false);
      if (pendingPathRef.current.length >= 2) {
        setShowSaveDialog(true);
      } else {
        pendingPathRef.current = [];
        setPath([]);
        setTotalDistance(0);
      }
    } else {
      // Start recording
      startWatching();
      requestOrientationPermission();
      pendingPathRef.current = [];
      setPath([]);
      setTotalDistance(0);
      setStartTime(Date.now());
      setElapsed(0);
      setRecording(true);
      setViewPath(null);
    }
  }, [recording, startWatching, requestOrientationPermission]);

  const handleLocate = useCallback(() => {
    startWatching();
    requestOrientationPermission();
    if (position && mapRef.current) {
      mapRef.current.setView(position, 17, { animate: true });
    }
  }, [position, startWatching, requestOrientationPermission]);

  const handleSave = useCallback(
    (name) => {
      const route = {
        id: Date.now().toString(),
        name,
        points: pendingPathRef.current,
        distance: totalDistance,
        duration: elapsed,
        createdAt: Date.now(),
      };
      saveRoute(route);
      setRoutes(getSavedRoutes());
      setShowSaveDialog(false);
      pendingPathRef.current = [];
      setPath([]);
      setTotalDistance(0);
    },
    [totalDistance, elapsed]
  );

  const handleCancelSave = useCallback(() => {
    setShowSaveDialog(false);
    pendingPathRef.current = [];
    setPath([]);
    setTotalDistance(0);
  }, []);

  const handleDelete = useCallback((id) => {
    deleteRoute(id);
    setRoutes(getSavedRoutes());
  }, []);

  const handleView = useCallback((route) => {
    setShowHistory(false);
    setViewPath(route.points);
    if (mapRef.current && route.points.length > 0) {
      const bounds = route.points.map((p) => p);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, []);

  const handleBacktrack = useCallback(
    (route) => {
      startWatching();
      requestOrientationPermission();
      setShowHistory(false);
      // Reverse the path so we walk back
      const reversed = [...route.points].reverse();
      setBacktrackRoute(reversed);
      setBacktrackIndex(0);
      setBacktracking(true);
      setViewPath(null);
      setPath([]);

      if (mapRef.current && reversed.length > 0 && position) {
        mapRef.current.fitBounds([position, reversed[0]], { padding: [80, 80] });
      }
    },
    [startWatching, requestOrientationPermission, position]
  );

  const handleStopBacktrack = useCallback(() => {
    setBacktracking(false);
    setBacktrackRoute(null);
    setBacktrackIndex(0);
  }, []);

  const backtrackTarget = backtracking && backtrackRoute ? backtrackRoute[backtrackIndex] : null;
  const backtrackRemaining = backtracking && backtrackRoute
    ? backtrackRoute.slice(backtrackIndex)
    : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapView
        position={position}
        heading={heading}
        path={viewPath || (path.length >= 2 ? path : null)}
        backtrackPath={backtrackRemaining}
        backtrackTarget={backtrackTarget}
        onMapReady={(map) => { mapRef.current = map; }}
      />

      <StatusBar
        accuracy={accuracy}
        distance={totalDistance}
        points={path.length}
        duration={elapsed}
      />

      {backtracking && backtrackTarget && (
        <BacktrackPanel
          position={position}
          heading={heading}
          targetPoint={backtrackTarget}
          remainingPath={backtrackRemaining}
          onStop={handleStopBacktrack}
        />
      )}

      <Controls
        recording={recording}
        onToggleRecord={handleToggleRecord}
        onLocate={handleLocate}
        onHistory={() => setShowHistory(true)}
      />

      {showHistory && (
        <HistoryPanel
          routes={routes}
          onClose={() => setShowHistory(false)}
          onBacktrack={handleBacktrack}
          onView={handleView}
          onDelete={handleDelete}
        />
      )}

      {showSaveDialog && (
        <SaveDialog onSave={handleSave} onCancel={handleCancelSave} />
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import MapView from './components/MapView';
import StatusBar from './components/StatusBar';
import Controls from './components/Controls';
import BacktrackPanel from './components/BacktrackPanel';
import HistoryPanel from './components/HistoryPanel';
import SaveDialog from './components/SaveDialog';
import { useGeolocation } from './hooks/useGeolocation';
import { useWakeLock } from './hooks/useWakeLock';
import { getDistance, getTotalDistance } from './utils/geo';
import { getSavedRoutes, saveRoute, deleteRoute, getSavedPin, savePin, deletePin } from './utils/storage';
import './App.css';

const MIN_DISTANCE = 3; // minimum meters between recorded points
const BACKTRACK_ARRIVE_DISTANCE = 8; // meters to consider "arrived" at waypoint

export default function App() {
  const {
    position,
    accuracy,
    heading,
    speed,
    startWatching,
    stopWatching,
    requestOrientationPermission,
  } = useGeolocation();

  const { requestWakeLock, releaseWakeLock } = useWakeLock();

  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [path, setPath] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [elapsedAtPause, setElapsedAtPause] = useState(0);

  const [showHistory, setShowHistory] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routes, setRoutes] = useState(() => getSavedRoutes());

  const [backtracking, setBacktracking] = useState(false);
  const [backtrackRoute, setBacktrackRoute] = useState(null);
  const [backtrackIndex, setBacktrackIndex] = useState(0);
  const [backtrackArrived, setBacktrackArrived] = useState(false);

  // View-only mode (show a saved route on map)
  const [viewPath, setViewPath] = useState(null);

  // Auto-follow mode
  const [autoFollow, setAutoFollow] = useState(false);

  // Car pin
  const [carPin, setCarPin] = useState(() => getSavedPin());

  const mapRef = useRef(null);
  const pendingPathRef = useRef([]);

  // Timer for elapsed time (pauses when paused)
  useEffect(() => {
    if (!recording || paused || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(elapsedAtPause + (Date.now() - startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [recording, paused, startTime, elapsedAtPause]);

  // Record positions into path (skip when paused)
  useEffect(() => {
    if (!recording || paused || !position) return;

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
  }, [recording, paused, position]);

  // Auto-advance backtrack waypoint with vibration
  useEffect(() => {
    if (!backtracking || !position || !backtrackRoute || backtrackArrived) return;

    const target = backtrackRoute[backtrackIndex];
    if (!target) return;

    const dist = getDistance(position, target);
    if (dist < BACKTRACK_ARRIVE_DISTANCE) {
      if (backtrackIndex < backtrackRoute.length - 1) {
        // Reached intermediate waypoint - short vibration
        if (navigator.vibrate) navigator.vibrate(200);
        setBacktrackIndex((i) => i + 1);
      } else {
        // Reached final destination - celebration vibration
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
        setBacktrackArrived(true);
      }
    }
  }, [backtracking, position, backtrackRoute, backtrackIndex, backtrackArrived]);

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
      if (paused) {
        // Resume recording
        setPaused(false);
        setStartTime(Date.now());
      } else {
        // Pause recording
        setPaused(true);
        setElapsedAtPause(elapsed);
      }
    } else {
      // Start recording
      startWatching();
      requestOrientationPermission();
      requestWakeLock();
      pendingPathRef.current = [];
      setPath([]);
      setTotalDistance(0);
      setStartTime(Date.now());
      setElapsed(0);
      setElapsedAtPause(0);
      setPaused(false);
      setRecording(true);
      setAutoFollow(true);
      setViewPath(null);
    }
  }, [recording, paused, elapsed, startWatching, requestOrientationPermission, requestWakeLock]);

  const handleStopRecord = useCallback(() => {
    setRecording(false);
    setPaused(false);
    releaseWakeLock();
    if (pendingPathRef.current.length >= 2) {
      setShowSaveDialog(true);
    } else {
      pendingPathRef.current = [];
      setPath([]);
      setTotalDistance(0);
    }
  }, [releaseWakeLock]);

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
    setBacktrackArrived(false);
  }, []);

  const handleSavePin = useCallback(() => {
    if (!position) return;
    const pin = [...position];
    savePin(pin);
    setCarPin(pin);
  }, [position]);

  const handleDeletePin = useCallback(() => {
    deletePin();
    setCarPin(null);
  }, []);

  const handleNavigatePin = useCallback(() => {
    if (!carPin) return;
    startWatching();
    requestOrientationPermission();
    // Create a simple single-point "route" for straight-line navigation
    setBacktrackRoute([carPin]);
    setBacktrackIndex(0);
    setBacktracking(true);
    setBacktrackArrived(false);
    setViewPath(null);
    setPath([]);

    if (mapRef.current && position) {
      mapRef.current.fitBounds([position, carPin], { padding: [80, 80] });
    }
  }, [carPin, position, startWatching, requestOrientationPermission]);

  const carPinDistance = carPin && position ? getDistance(position, carPin) : null;

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
        carPin={carPin}
        onMapReady={(map) => { mapRef.current = map; }}
        autoFollow={autoFollow}
        onAutoFollowChange={setAutoFollow}
      />

      <StatusBar
        accuracy={accuracy}
        distance={totalDistance}
        points={path.length}
        duration={elapsed}
        speed={speed}
        carPinDistance={carPinDistance}
      />

      {backtracking && (backtrackTarget || backtrackArrived) && (
        <BacktrackPanel
          position={position}
          heading={heading}
          targetPoint={backtrackTarget}
          remainingPath={backtrackRemaining}
          onStop={handleStopBacktrack}
          currentIndex={backtrackIndex}
          totalPoints={backtrackRoute ? backtrackRoute.length : 0}
          arrived={backtrackArrived}
        />
      )}

      <Controls
        recording={recording}
        paused={paused}
        onToggleRecord={handleToggleRecord}
        onStopRecord={handleStopRecord}
        onLocate={handleLocate}
        onHistory={() => setShowHistory(true)}
        carPin={carPin}
        onSavePin={handleSavePin}
        onNavigatePin={handleNavigatePin}
        onDeletePin={handleDeletePin}
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

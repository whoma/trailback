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
import { vibrate } from './utils/vibrate';
import { getSavedRoutes, saveRoute, deleteRoute, getSavedPin, savePin, deletePin } from './utils/storage';
import type { LatLng, Route } from './types';
import './App.css';

const MIN_DISTANCE = 3;
const BACKTRACK_ARRIVE_DISTANCE = 8;

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
  const [path, setPath] = useState<LatLng[]>([]);
  const [totalDistance, setTotalDistance] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [elapsedAtPause, setElapsedAtPause] = useState(0);

  const [showHistory, setShowHistory] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routes, setRoutes] = useState<Route[]>(() => getSavedRoutes());

  const [backtracking, setBacktracking] = useState(false);
  const [backtrackRoute, setBacktrackRoute] = useState<LatLng[] | null>(null);
  const [backtrackIndex, setBacktrackIndex] = useState(0);
  const [backtrackArrived, setBacktrackArrived] = useState(false);

  const [viewPath, setViewPath] = useState<LatLng[] | null>(null);
  const [autoFollow, setAutoFollow] = useState(false);
  const [carPin, setCarPin] = useState<LatLng | null>(() => getSavedPin());

  const mapRef = useRef<L.Map | null>(null);
  const pendingPathRef = useRef<LatLng[]>([]);

  // Timer for elapsed time
  useEffect(() => {
    if (!recording || paused || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(elapsedAtPause + (Date.now() - startTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [recording, paused, startTime, elapsedAtPause]);

  // Record positions into path
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
        vibrate(200);
        setBacktrackIndex((i) => i + 1);
      } else {
        vibrate([200, 100, 200, 100, 400]);
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
        vibrate(25);
        setPaused(false);
        setStartTime(Date.now());
      } else {
        vibrate([20, 15, 20]);
        setPaused(true);
        setElapsedAtPause(elapsed);
      }
    } else {
      vibrate(40);
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
    (name: string) => {
      const route: Route = {
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

  const handleDelete = useCallback((id: string) => {
    deleteRoute(id);
    setRoutes(getSavedRoutes());
  }, []);

  const handleView = useCallback((route: Route) => {
    setShowHistory(false);
    setViewPath(route.points);
    if (mapRef.current && route.points.length > 0) {
      mapRef.current.fitBounds(route.points, { padding: [50, 50] });
    }
  }, []);

  const handleBacktrack = useCallback(
    (route: Route) => {
      vibrate(40);
      startWatching();
      requestOrientationPermission();
      setShowHistory(false);
      const reversed: LatLng[] = [...route.points].reverse();
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
    vibrate([30, 20, 30]);
    setBacktracking(false);
    setBacktrackRoute(null);
    setBacktrackIndex(0);
    setBacktrackArrived(false);
  }, []);

  const handleSavePin = useCallback(() => {
    if (!position) return;
    vibrate(30);
    const pin: LatLng = [...position] as LatLng;
    savePin(pin);
    setCarPin(pin);
  }, [position]);

  const handleDeletePin = useCallback(() => {
    vibrate([30, 20, 30]);
    deletePin();
    setCarPin(null);
  }, []);

  const handleNavigatePin = useCallback(() => {
    if (!carPin) return;
    vibrate(30);
    startWatching();
    requestOrientationPermission();
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

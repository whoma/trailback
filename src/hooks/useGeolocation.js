import { useState, useEffect, useRef, useCallback } from 'react';

export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);
  const [heading, setHeading] = useState(null);
  const [speed, setSpeed] = useState(null);
  const watchIdRef = useRef(null);
  const orientationListenerRef = useRef(null);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      return;
    }

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setAccuracy(pos.coords.accuracy);
        if (pos.coords.speed !== null && !isNaN(pos.coords.speed)) {
          setSpeed(pos.coords.speed);
        }
        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
          setHeading(pos.coords.heading);
        }
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    );
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.webkitCompassHeading !== undefined) {
        setHeading(e.webkitCompassHeading);
      } else if (e.alpha !== null) {
        setHeading((360 - e.alpha) % 360);
      }
    };

    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS - will be requested on user gesture
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
      orientationListenerRef.current = handleOrientation;
    }

    return () => {
      if (orientationListenerRef.current) {
        window.removeEventListener('deviceorientation', orientationListenerRef.current);
      }
    };
  }, []);

  const requestOrientationPermission = useCallback(async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          const handler = (e) => {
            if (e.webkitCompassHeading !== undefined) {
              setHeading(e.webkitCompassHeading);
            } else if (e.alpha !== null) {
              setHeading((360 - e.alpha) % 360);
            }
          };
          window.addEventListener('deviceorientation', handler);
          orientationListenerRef.current = handler;
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  return {
    position,
    accuracy,
    error,
    heading,
    speed,
    startWatching,
    stopWatching,
    requestOrientationPermission,
  };
}

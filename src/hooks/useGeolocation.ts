import { useState, useEffect, useRef, useCallback } from 'react';
import type { LatLng } from '../types';

interface GeolocationState {
  position: LatLng | null;
  accuracy: number | null;
  error: string | null;
  heading: number | null;
  speed: number | null;
  startWatching: () => void;
  stopWatching: () => void;
  requestOrientationPermission: () => Promise<void>;
}

export function useGeolocation(): GeolocationState {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

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
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if ((e as any).webkitCompassHeading !== undefined) {
        setHeading((e as any).webkitCompassHeading);
      } else if (e.alpha !== null) {
        setHeading((360 - e.alpha) % 360);
      }
    };

    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
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
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          const handler = (e: DeviceOrientationEvent) => {
            if ((e as any).webkitCompassHeading !== undefined) {
              setHeading((e as any).webkitCompassHeading);
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

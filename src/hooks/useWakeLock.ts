import { useRef, useCallback } from 'react';

interface WakeLockState {
  requestWakeLock: () => Promise<void>;
  releaseWakeLock: () => Promise<void>;
}

export function useWakeLock(): WakeLockState {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // ignore - user may have denied or not supported
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // ignore
      }
      wakeLockRef.current = null;
    }
  }, []);

  return { requestWakeLock, releaseWakeLock };
}

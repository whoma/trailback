import { useState, useRef, useCallback } from 'react';
import { vibrate } from '../utils/vibrate';
import styles from './Controls.module.css';
import type { LatLng } from '../types';

const LONG_PRESS_MS = 600;

interface ControlsProps {
  recording: boolean;
  paused: boolean;
  onToggleRecord: () => void;
  onStopRecord: () => void;
  onLocate: () => void;
  onHistory: () => void;
  carPin: LatLng | null;
  onSavePin?: () => void;
  onNavigatePin?: () => void;
  onDeletePin?: () => void;
}

export default function Controls({
  recording,
  paused,
  onToggleRecord,
  onStopRecord,
  onLocate,
  onHistory,
  carPin,
  onSavePin,
  onNavigatePin,
  onDeletePin,
}: ControlsProps) {
  const [showPinMenu, setShowPinMenu] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const handlePinClick = () => {
    vibrate(20);
    if (carPin) {
      setShowPinMenu((v) => !v);
    } else {
      onSavePin?.();
    }
  };

  const handlePointerDown = useCallback(() => {
    if (!recording) return;
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      vibrate([50, 30, 50]);
      onStopRecord();
    }, LONG_PRESS_MS);
  }, [recording, onStopRecord]);

  const handlePointerUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (firedRef.current) return;
    vibrate(25);
    onToggleRecord();
  }, [onToggleRecord]);

  const getLabel = () => {
    if (!recording) return '开始';
    return paused ? '继续' : '暂停';
  };

  return (
    <div className={styles.controls}>
      <button className={styles.secondary} onClick={() => { vibrate(15); onHistory(); }}>
        <svg viewBox="0 0 24 24" width="26" height="26">
          <path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
        </svg>
        <span>历史</span>
      </button>

      <button
        className={`${styles.primary} ${recording ? (paused ? styles.paused : styles.recording) : ''}`}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className={styles.recordIcon} />
        <span>{getLabel()}</span>
        {recording && <span className={styles.hint}>长按停止</span>}
      </button>

      <div className={styles.rightStack}>
        <div className={styles.pinWrapper}>
          <button
            className={`${styles.secondary} ${carPin ? styles.pinActive : ''}`}
            onClick={handlePinClick}
          >
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
            <span>{carPin ? '车位' : '标记'}</span>
          </button>
          {showPinMenu && (
            <div className={styles.pinMenu}>
              <button
                className={styles.pinMenuItem}
                onClick={() => { vibrate(20); setShowPinMenu(false); onNavigatePin?.(); }}
              >
                导航到车位
              </button>
              <button
                className={`${styles.pinMenuItem} ${styles.pinMenuDanger}`}
                onClick={() => { vibrate([30, 20, 30]); setShowPinMenu(false); onDeletePin?.(); }}
              >
                清除车位
              </button>
            </div>
          )}
        </div>

        <button className={styles.secondary} onClick={() => { vibrate(15); onLocate(); }}>
          <svg viewBox="0 0 24 24" width="26" height="26">
            <path fill="currentColor" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
          </svg>
          <span>定位</span>
        </button>
      </div>
    </div>
  );
}

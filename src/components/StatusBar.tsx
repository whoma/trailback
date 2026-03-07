import { formatDistance } from '../utils/geo';
import styles from './StatusBar.module.css';

interface StatusBarProps {
  accuracy: number | null;
  distance: number;
  points: number;
  duration: number;
  speed: number | null;
  carPinDistance: number | null;
}

export default function StatusBar({ accuracy, distance, points, duration, speed, carPinDistance }: StatusBarProps) {
  const speedKmh = speed != null ? (speed * 3.6).toFixed(1) : null;

  return (
    <div className={styles.bar}>
      <span>精度: {accuracy ? `${Math.round(accuracy)}m` : '--'}</span>
      <span>距离: {formatDistance(distance)}</span>
      <span>速度: {speedKmh != null ? `${speedKmh} km/h` : '--'}</span>
      <span>点数: {points}</span>
      {duration > 0 && <span>时长: {formatDuration(duration)}</span>}
      {carPinDistance != null && (
        <span style={{ color: '#ef4444' }}>车位: {formatDistance(carPinDistance)}</span>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

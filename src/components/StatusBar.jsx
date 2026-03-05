import { formatDistance } from '../utils/geo';
import styles from './StatusBar.module.css';

export default function StatusBar({ accuracy, distance, points, duration }) {
  return (
    <div className={styles.bar}>
      <span>精度: {accuracy ? `${Math.round(accuracy)}m` : '--'}</span>
      <span>距离: {formatDistance(distance)}</span>
      <span>点数: {points}</span>
      {duration > 0 && <span>时长: {formatDuration(duration)}</span>}
    </div>
  );
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

import { useMemo } from 'react';
import { getDistance, getBearing, formatDistance } from '../utils/geo';
import styles from './BacktrackPanel.module.css';
import type { LatLng } from '../types';

interface BacktrackPanelProps {
  position: LatLng | null;
  heading: number | null;
  targetPoint: LatLng | null;
  remainingPath: LatLng[] | null;
  onStop: () => void;
  currentIndex: number;
  totalPoints: number;
  arrived: boolean;
}

export default function BacktrackPanel({
  position,
  heading,
  targetPoint,
  remainingPath,
  onStop,
  currentIndex,
  totalPoints,
  arrived,
}: BacktrackPanelProps) {
  const distToTarget = useMemo(() => {
    if (!position || !targetPoint) return null;
    return getDistance(position, targetPoint);
  }, [position, targetPoint]);

  const remainingDist = useMemo(() => {
    if (!remainingPath || remainingPath.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < remainingPath.length; i++) {
      d += getDistance(remainingPath[i - 1], remainingPath[i]);
    }
    return d;
  }, [remainingPath]);

  const arrowRotation = useMemo(() => {
    if (!position || !targetPoint || heading === null) return 0;
    const bearing = getBearing(position, targetPoint);
    return bearing - heading;
  }, [position, targetPoint, heading]);

  const progress = totalPoints > 0 ? (currentIndex / totalPoints) * 100 : 0;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>
          {arrived ? '已到达目的地!' : '回溯导航中'}
        </span>
        <button className={styles.stopBtn} onClick={onStop}>停止</button>
      </div>
      <div className={styles.progressRow}>
        <span className={styles.progressText}>
          进度: {currentIndex}/{totalPoints}
        </span>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>
      {!arrived && (
        <div className={styles.info}>
          <div className={styles.compass}>
            <div
              className={styles.arrow}
              style={{ transform: `rotate(${arrowRotation}deg)` }}
            />
          </div>
          <div className={styles.details}>
            <div className={styles.distance}>
              距下一点: {distToTarget !== null ? formatDistance(distToTarget) : '--'}
            </div>
            <div className={styles.remaining}>
              剩余路程: {formatDistance(remainingDist)}
            </div>
            {distToTarget !== null && distToTarget < 5 && (
              <div className={styles.nearbyHint}>已到达附近!</div>
            )}
          </div>
        </div>
      )}
      {arrived && (
        <div className={styles.celebration}>
          恭喜! 你已成功回溯到起点。
        </div>
      )}
    </div>
  );
}

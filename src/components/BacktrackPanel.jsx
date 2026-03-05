import { useMemo } from 'react';
import { getDistance, getBearing, formatDistance } from '../utils/geo';
import styles from './BacktrackPanel.module.css';

export default function BacktrackPanel({
  position,
  heading,
  targetPoint,
  remainingPath,
  onStop,
}) {
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

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>回溯导航中</span>
        <button className={styles.stopBtn} onClick={onStop}>停止</button>
      </div>
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
            <div className={styles.arrived}>已到达附近!</div>
          )}
        </div>
      </div>
    </div>
  );
}

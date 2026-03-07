import { useCallback } from 'react';
import { formatDistance, formatTime } from '../utils/geo';
import { vibrate } from '../utils/vibrate';
import styles from './HistoryPanel.module.css';
import type { Route } from '../types';

function generateGPX(route: Route): string {
  const trkpts = route.points
    .map((p) => `      <trkpt lat="${p[0]}" lon="${p[1]}"/>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trailback">
  <trk><name>${route.name}</name><trkseg>
${trkpts}
  </trkseg></trk>
</gpx>`;
}

function formatAvgSpeed(distance: number, duration: number): string {
  if (!duration || duration <= 0) return '--';
  const speedMs = distance / (duration / 1000);
  const speedKmh = speedMs * 3.6;
  if (speedKmh < 1) return `${speedMs.toFixed(1)}m/s`;
  return `${speedKmh.toFixed(1)}km/h`;
}

interface HistoryPanelProps {
  routes: Route[];
  onClose: () => void;
  onBacktrack: (route: Route) => void;
  onView: (route: Route) => void;
  onDelete: (id: string) => void;
}

export default function HistoryPanel({ routes, onClose, onBacktrack, onView, onDelete }: HistoryPanelProps) {
  const handleExport = useCallback((route: Route) => {
    vibrate(15);
    const gpx = generateGPX(route);
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${route.name}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleShare = useCallback(async (route: Route) => {
    vibrate(15);
    const gpx = generateGPX(route);
    const file = new File([gpx], `${route.name}.gpx`, { type: 'application/gpx+xml' });
    try {
      await navigator.share({ title: route.name, files: [file] });
    } catch {
      // User cancelled or share not supported
    }
  }, []);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>历史路径</h2>
        <button className={styles.closeBtn} onClick={onClose}>&times;</button>
      </div>
      <div className={styles.body}>
        {routes.length === 0 ? (
          <p className={styles.empty}>暂无保存的路径</p>
        ) : (
          routes.map((route) => (
            <div key={route.id} className={styles.item}>
              <div className={styles.itemInfo}>
                <h3>{route.name}</h3>
                <p>
                  {new Date(route.createdAt).toLocaleString('zh-CN')} |{' '}
                  {formatDistance(route.distance)} |{' '}
                  {route.points.length}个点
                </p>
                <p className={styles.stats}>
                  {route.duration ? `时长: ${formatTime(route.duration)}` : ''}
                  {route.duration ? ` | 均速: ${formatAvgSpeed(route.distance, route.duration)}` : ''}
                </p>
              </div>
              <div className={styles.actions}>
                <button className={styles.viewBtn} onClick={() => { vibrate(15); onView(route); }}>查看</button>
                <button className={styles.backtrackBtn} onClick={() => { vibrate(25); onBacktrack(route); }}>回溯</button>
                <button className={styles.exportBtn} onClick={() => handleExport(route)}>导出</button>
                {navigator.share && (
                  <button className={styles.shareBtn} onClick={() => handleShare(route)}>分享</button>
                )}
                <button className={styles.deleteBtn} onClick={() => { vibrate([30, 20, 30]); onDelete(route.id); }}>删除</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

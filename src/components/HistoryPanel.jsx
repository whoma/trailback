import { formatDistance, formatTime } from '../utils/geo';
import styles from './HistoryPanel.module.css';

export default function HistoryPanel({ routes, onClose, onBacktrack, onView, onDelete }) {
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
              </div>
              <div className={styles.actions}>
                <button className={styles.viewBtn} onClick={() => onView(route)}>查看</button>
                <button className={styles.backtrackBtn} onClick={() => onBacktrack(route)}>回溯</button>
                <button className={styles.deleteBtn} onClick={() => onDelete(route.id)}>删除</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

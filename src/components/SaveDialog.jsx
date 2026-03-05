import { useState } from 'react';
import styles from './SaveDialog.module.css';

export default function SaveDialog({ onSave, onCancel }) {
  const [name, setName] = useState('');

  const handleSave = () => {
    const finalName = name.trim() || `路径 ${new Date().toLocaleString('zh-CN')}`;
    onSave(finalName);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h3>保存路径</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="给这条路径起个名字..."
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>取消</button>
          <button className={styles.saveBtn} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}

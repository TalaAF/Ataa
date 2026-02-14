// ===== Field App - Sync Page =====
import { useState, useEffect } from 'react';
import { Upload, Download } from 'lucide-react';
import { getSyncQueue, getPendingSyncCount } from '../db/offlineDb';
import { syncService } from '../services/syncService';

export default function SyncPage() {
  const [pendingCount, setPendingCount] = useState(0);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    refresh();
    setLastSync(syncService.getLastSyncTime());

    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const refresh = async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
    const items = await getSyncQueue();
    setQueueItems(items.slice(0, 20));
  };

  const handleSync = async () => {
    if (!isOnline) {
      setMessage('لا يوجد اتصال بالإنترنت');
      return;
    }
    setSyncing(true);
    setMessage('');

    const result = await syncService.sync();
    setMessage(result.message);
    setSyncing(false);
    setLastSync(syncService.getLastSyncTime());
    await refresh();
  };

  const handlePull = async () => {
    if (!isOnline) {
      setMessage('لا يوجد اتصال بالإنترنت');
      return;
    }
    setSyncing(true);
    setMessage('');

    const result = await syncService.pullUpdates();
    setMessage(result.message);
    setSyncing(false);
    setLastSync(syncService.getLastSyncTime());
  };

  const ENTITY_LABELS: Record<string, string> = {
    household: 'اسرة',
    member: 'فرد',
    need: 'احتياج',
    distribution: 'توزيع',
  };

  return (
    <div>
      <h1 className="page-title">المزامنة</h1>

      {/* Status */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title">الحالة</div>
          <span className={`badge ${isOnline ? 'badge-green' : 'badge-red'}`}>
            {isOnline ? 'متصل' : 'غير متصل'}
          </span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          <div>عناصر قيد الانتظار: <strong>{pendingCount}</strong></div>
          <div>اخر مزامنة: {lastSync ? new Date(lastSync).toLocaleString('ar-SA') : 'لم يتم بعد'}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncing || !isOnline || pendingCount === 0}
          style={{ flex: 1 }}
        >
          <Upload size={18} />
          {syncing ? 'جاري...' : 'ارسال البيانات'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handlePull}
          disabled={syncing || !isOnline}
          style={{ flex: 1 }}
        >
          <Download size={18} />
          استلام التحديثات
        </button>
      </div>

      {message && (
        <div className="card" style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary)' }}>
          <div style={{ fontSize: '0.85rem' }}>{message}</div>
        </div>
      )}

      {/* Queue */}
      {queueItems.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>قائمة الانتظار</div>
          {queueItems.map(item => (
            <div key={item.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid var(--color-border-light)',
              fontSize: '0.82rem',
            }}>
              <div>
                <span className="badge badge-gray">{ENTITY_LABELS[item.entity_type] || item.entity_type}</span>
                <span style={{ marginRight: 8, color: 'var(--color-text-muted)' }}>{item.action}</span>
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                {new Date(item.timestamp).toLocaleTimeString('ar-SA')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

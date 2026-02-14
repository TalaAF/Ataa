// ===== عطاء - Sync Page =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { RefreshCw, Upload, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function SyncPage() {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncLog, setSyncLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [pullZone, setPullZone] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusRes, logRes, zonesRes] = await Promise.all([
        api.getSyncStatus(),
        api.getSyncLog(),
        api.getZones(),
      ]);
      setSyncStatus(statusRes.data);
      setSyncLog(logRes.data);
      setZones(zonesRes.data || []);
      if (!pullZone && zonesRes.data?.length > 0) {
        setPullZone(zonesRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    setPushing(true);
    try {
      const res = await api.pushSync();
      alert(res.message || 'تمت المزامنة بنجاح');
      loadData();
    } catch (err: any) {
      alert('فشل الارسال: ' + (err.message || 'خطا غير معروف'));
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    if (!pullZone) {
      alert('اختر المنطقة اولا');
      return;
    }
    setPulling(true);
    try {
      const res = await api.pullSync(pullZone);
      alert(res.message || 'تم السحب بنجاح');
      loadData();
    } catch (err: any) {
      alert('فشل السحب: ' + (err.message || 'خطا غير معروف'));
    } finally {
      setPulling(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>;

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">
          <RefreshCw size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          المزامنة
        </h1>
      </div>

      {/* Sync Status */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><Clock size={24} /></div>
          <div className="stat-value">{syncStatus?.total_pending || 0}</div>
          <div className="stat-label">سجل بانتظار المزامنة</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={24} /></div>
          <div className="stat-value">{syncStatus?.last_sync ? 'متصل' : 'لم تتم'}</div>
          <div className="stat-label">آخر مزامنة</div>
        </div>
      </div>

      {/* Push Section */}
      {syncStatus?.pending && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">ارسال للمركز (Push)</h3>
            <button className="btn btn-primary" onClick={handlePush} disabled={pushing}>
              <Upload size={16} />
              {pushing ? 'جاري الارسال...' : 'ارسال الآن'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {Object.entries(syncStatus.pending as Record<string, number>).map(([key, count]) => (
              <div key={key} style={{
                background: 'var(--color-surface)', padding: 12, borderRadius: 'var(--radius-md)', textAlign: 'center',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: count > 0 ? 'var(--color-orange)' : 'var(--color-green)' }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {{ households: 'أسر', needs: 'احتياجات', distributions: 'توزيعات', offers: 'عروض', requests: 'طلبات' }[key] || key}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pull Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 className="card-title">سحب من المركز (Pull)</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={pullZone}
              onChange={e => setPullZone(e.target.value)}
              className="form-input"
              style={{ minWidth: 140, padding: '6px 10px' }}
            >
              {zones.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <button className="btn btn-secondary" onClick={handlePull} disabled={pulling}>
              <Download size={16} />
              {pulling ? 'جاري السحب...' : 'سحب الآن'}
            </button>
          </div>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
          سحب التحديثات من الخادم المركزي لمنطقة محددة
        </p>
      </div>

      {/* Sync Log */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">سجل المزامنة</h3>
        </div>
        {syncLog.length === 0 ? (
          <div className="empty-state">
            <RefreshCw size={48} />
            <div className="empty-state-title">لا يوجد سجل مزامنة</div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>الاتجاه</th>
                  <th>الحالة</th>
                  <th>مرسلة</th>
                  <th>مستلمة</th>
                  <th>الاخطاء</th>
                  <th>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {syncLog.map(log => (
                  <tr key={log.id}>
                    <td>
                      {log.direction === 'push' ? (
                        <span className="badge badge-primary"><Upload size={12} style={{ marginLeft: 4 }} /> إرسال</span>
                      ) : (
                        <span className="badge badge-green"><Download size={12} style={{ marginLeft: 4 }} /> سحب</span>
                      )}
                    </td>
                    <td>
                      {log.status === 'ok' ? (
                        <span style={{ color: 'var(--color-green)' }}><CheckCircle size={14} style={{ verticalAlign: 'middle' }} /> نجح</span>
                      ) : log.status === 'partial' ? (
                        <span style={{ color: 'var(--color-orange)' }}><AlertCircle size={14} style={{ verticalAlign: 'middle' }} /> جزئي</span>
                      ) : (
                        <span style={{ color: 'var(--color-red)' }}><AlertCircle size={14} style={{ verticalAlign: 'middle' }} /> فشل</span>
                      )}
                    </td>
                    <td>{log.records_pushed || 0}</td>
                    <td>{log.records_pulled || 0}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-red)' }}>{log.errors || '-'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString('ar')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

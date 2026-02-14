// ===== Field App - Home Page =====
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Package, BarChart3, RefreshCw } from 'lucide-react';
import { getPendingSyncCount } from '../db/offlineDb';
import { syncService } from '../services/syncService';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingSync, setPendingSync] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const updatePending = async () => {
      const count = await getPendingSyncCount();
      setPendingSync(count);
    };
    updatePending();
    setLastSync(syncService.getLastSyncTime());
  }, []);

  return (
    <div>
      <h1 className="page-title">مرحبا، {user?.full_name}</h1>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{pendingSync}</div>
          <div className="stat-label">قيد المزامنة</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: '0.85rem' }}>
            {lastSync ? new Date(lastSync).toLocaleString('ar-SA') : 'لم يتم بعد'}
          </div>
          <div className="stat-label">اخر مزامنة</div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="action-grid">
        <div className="action-card" onClick={() => navigate('/register')}>
          <div className="action-card-icon">
            <UserPlus size={24} />
          </div>
          <div className="action-card-title">تسجيل اسرة</div>
          <div className="action-card-desc">تسجيل اسرة نازحة جديدة</div>
        </div>

        <div className="action-card" onClick={() => navigate('/distribute')}>
          <div className="action-card-icon">
            <Package size={24} />
          </div>
          <div className="action-card-title">توزيع مساعدات</div>
          <div className="action-card-desc">تسجيل توزيع جديد</div>
        </div>

        <div className="action-card" onClick={() => navigate('/sync')}>
          <div className="action-card-icon">
            <RefreshCw size={24} />
          </div>
          <div className="action-card-title">المزامنة</div>
          <div className="action-card-desc">مزامنة البيانات مع الخادم</div>
        </div>

        <div className="action-card" style={{ opacity: 0.6 }}>
          <div className="action-card-icon">
            <BarChart3 size={24} />
          </div>
          <div className="action-card-title">التقارير</div>
          <div className="action-card-desc">عرض الاحصائيات</div>
        </div>
      </div>

      {/* Zone Info */}
      <div className="card">
        <div className="card-title">معلومات الحساب</div>
        <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          <div>المنطقة: {user?.zone_id || 'غير محدد'}</div>
          <div>الدور: عامل ميداني</div>
        </div>
      </div>
    </div>
  );
}

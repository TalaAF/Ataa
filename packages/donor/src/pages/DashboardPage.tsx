// ===== Donor Portal - Dashboard Page =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Heart, AlertTriangle, Package } from 'lucide-react';
import { NeedCategoryLabel } from '@ataa/shared';

interface DashboardData {
  total_pledges: number;
  fulfilled_pledges: number;
  total_needs: number;
  critical_needs: number;
  zones: number;
}

interface NeedSummary {
  zone_name: string;
  category: string;
  urgency: string;
  total_quantity: number;
  household_count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [topNeeds, setTopNeeds] = useState<NeedSummary[]>([]);

  useEffect(() => {
    fetchDashboard();
    fetchTopNeeds();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.getDashboard();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  };

  const fetchTopNeeds = async () => {
    try {
      const res = await api.getAggregatedNeeds();
      if (res.success) setTopNeeds(res.data?.slice(0, 5) || []);
    } catch (err) {
      console.error('Error fetching needs:', err);
    }
  };

  const urgencyBadge = (urgency: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      critical: { cls: 'badge-red', label: 'حرج' },
      high: { cls: 'badge-orange', label: 'عالي' },
      medium: { cls: 'badge-yellow', label: 'متوسط' },
      low: { cls: 'badge-green', label: 'منخفض' },
    };
    const b = map[urgency] || { cls: 'badge-gray', label: urgency };
    return <span className={`badge ${b.cls}`}>{b.label}</span>;
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">لوحة التحكم</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><Heart size={22} /></div>
          <div className="stat-value">{stats?.total_pledges ?? '-'}</div>
          <div className="stat-label">اجمالي التعهدات</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Package size={22} /></div>
          <div className="stat-value">{stats?.fulfilled_pledges ?? '-'}</div>
          <div className="stat-label">التعهدات المنفذة</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><AlertTriangle size={22} /></div>
          <div className="stat-value">{stats?.total_needs ?? '-'}</div>
          <div className="stat-label">اجمالي الاحتياجات</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={22} /></div>
          <div className="stat-value">{stats?.critical_needs ?? '-'}</div>
          <div className="stat-label">احتياجات حرجة</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">اهم الاحتياجات</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>المنطقة</th>
                <th>الفئة</th>
                <th>الاستعجال</th>
                <th>الكمية</th>
                <th>عدد الاسر</th>
              </tr>
            </thead>
            <tbody>
              {topNeeds.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
                    لا توجد احتياجات حاليا
                  </td>
                </tr>
              ) : (
                topNeeds.map((need, i) => (
                  <tr key={i}>
                    <td>{need.zone_name}</td>
                    <td>{NeedCategoryLabel[need.category as keyof typeof NeedCategoryLabel] || need.category}</td>
                    <td>{urgencyBadge(need.urgency)}</td>
                    <td style={{ fontWeight: 600 }}>{need.total_quantity}</td>
                    <td>{need.household_count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

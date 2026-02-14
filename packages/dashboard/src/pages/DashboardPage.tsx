// ===== عطاء - Dashboard Page =====
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  Users, AlertTriangle, Package, Truck,
  Heart, HeartHandshake, RefreshCw, TrendingUp, Brain,
} from 'lucide-react';

interface Stats {
  totalHouseholds: number;
  totalMembers: number;
  totalNeeds: number;
  criticalNeeds: number;
  totalDistributions: number;
  activeOffers: number;
  activeRequests: number;
  pendingMatches: number;
  pendingSync: number;
}

interface AIAnalytics {
  priority_distribution: { priority_level: string; count: number }[];
  needs_by_category: { category: string; total_qty: number; total_needs: number; critical_qty: number }[];
  inventory_coverage: { category: string; available: number; needed: number; coverage_pct: number }[];
  underserved_households: number;
  top_priority_households: { id: string; token: string; head_of_household_name: string; priority_score: number; family_size: number; zone_name: string; open_needs: number }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام', water: 'مياه', hygiene: 'نظافة', medicine: 'ادوية', shelter: 'ماوى', clothing: 'ملابس',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [aiData, setAiData] = useState<AIAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [statsRes, aiRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getAIAnalytics().catch(() => null),
      ]);
      setStats(statsRes.data);
      if (aiRes?.data) setAiData(aiRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>جاري التحميل...</div>;
  }

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">لوحة التحكم</h1>
        <button className="btn btn-secondary btn-sm" onClick={loadStats}>
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('/households')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green"><Users size={24} /></div>
          <div className="stat-value">{stats?.totalHouseholds || 0}</div>
          <div className="stat-label">أسرة مسجلة</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={24} /></div>
          <div className="stat-value">{stats?.totalMembers || 0}</div>
          <div className="stat-label">إجمالي الأفراد</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/needs')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon orange"><AlertTriangle size={24} /></div>
          <div className="stat-value">{stats?.totalNeeds || 0}</div>
          <div className="stat-label">احتياج مفتوح</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={24} /></div>
          <div className="stat-value">{stats?.criticalNeeds || 0}</div>
          <div className="stat-label">احتياج حرج</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/distributions')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green"><Truck size={24} /></div>
          <div className="stat-value">{stats?.totalDistributions || 0}</div>
          <div className="stat-label">عملية توزيع</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/offers')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon yellow"><Heart size={24} /></div>
          <div className="stat-value">{stats?.activeOffers || 0}</div>
          <div className="stat-label">عرض نشط</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/requests')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon orange"><HeartHandshake size={24} /></div>
          <div className="stat-value">{stats?.activeRequests || 0}</div>
          <div className="stat-label">طلب نشط</div>
        </div>

        <div className="stat-card" onClick={() => navigate('/matches')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon green"><Package size={24} /></div>
          <div className="stat-value">{stats?.pendingMatches || 0}</div>
          <div className="stat-label">مطابقة معلقة</div>
        </div>
      </div>

      {/* Sync Status */}
      {stats?.pendingSync ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="sync-indicator">
              <span className="sync-dot pending"></span>
              <span style={{ color: 'var(--color-orange)', fontWeight: 600 }}>
                {stats.pendingSync} سجل بانتظار المزامنة
              </span>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/sync')}
            >
              <RefreshCw size={14} />
              مزامنة
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="sync-indicator">
            <span className="sync-dot online"></span>
            <span style={{ color: 'var(--color-green)', fontWeight: 600 }}>
              جميع البيانات متزامنة
            </span>
          </div>
        </div>
      )}

      {/* AI Insights Section */}
      {aiData && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 8 }}>
            <Brain size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>رؤى الذكاء الاصطناعي</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Priority Distribution */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>توزيع الاولوية</div>
              {aiData.priority_distribution.map(p => (
                <div key={p.priority_level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                  <span className={`badge badge-${p.priority_level === 'critical' ? 'red' : p.priority_level === 'high' ? 'orange' : p.priority_level === 'medium' ? 'yellow' : 'green'}`}>
                    {PRIORITY_LABELS[p.priority_level] || p.priority_level}
                  </span>
                  <span style={{ fontWeight: 600 }}>{p.count} اسرة</span>
                </div>
              ))}
              {aiData.underserved_households > 0 && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fce8e4', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--color-red)' }}>
                  {aiData.underserved_households} اسرة لم تتلق مساعدات منذ 14+ يوم
                </div>
              )}
            </div>

            {/* Inventory Coverage */}
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>تغطية المخزون</div>
              {aiData.inventory_coverage.map(ic => (
                <div key={ic.category} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 2 }}>
                    <span>{CATEGORY_LABELS[ic.category] || ic.category}</span>
                    <span style={{ fontWeight: 600, color: ic.coverage_pct < 50 ? 'var(--color-red)' : ic.coverage_pct < 80 ? 'var(--color-orange)' : 'var(--color-green)' }}>
                      {ic.coverage_pct}%
                    </span>
                  </div>
                  <div className="priority-bar">
                    <div className="priority-fill" style={{
                      width: `${Math.min(100, ic.coverage_pct)}%`,
                      background: ic.coverage_pct < 50 ? 'var(--color-red)' : ic.coverage_pct < 80 ? 'var(--color-orange)' : 'var(--color-green)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Priority Households */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">اعلى 10 اسر من حيث الاولوية</div>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                try {
                  await api.recalculatePriorities();
                  loadStats();
                } catch {}
              }}>
                <Brain size={14} />
                اعادة حساب
              </button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>الرمز</th>
                    <th>اسم رب الاسرة</th>
                    <th>المنطقة</th>
                    <th>حجم الاسرة</th>
                    <th>احتياجات مفتوحة</th>
                    <th>درجة الاولوية</th>
                  </tr>
                </thead>
                <tbody>
                  {aiData.top_priority_households.map(hh => (
                    <tr key={hh.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/households/${hh.id}`)}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{hh.token}</td>
                      <td>{hh.head_of_household_name || '-'}</td>
                      <td>{hh.zone_name}</td>
                      <td>{hh.family_size}</td>
                      <td>
                        <span className={`badge ${hh.open_needs > 3 ? 'badge-red' : hh.open_needs > 0 ? 'badge-orange' : 'badge-green'}`}>
                          {hh.open_needs}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="priority-bar" style={{ width: 60 }}>
                            <div className="priority-fill" style={{
                              width: `${(hh.priority_score / 30) * 100}%`,
                              background: hh.priority_score >= 20 ? 'var(--color-red)' : hh.priority_score >= 13 ? 'var(--color-orange)' : 'var(--color-green)',
                            }} />
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{hh.priority_score}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

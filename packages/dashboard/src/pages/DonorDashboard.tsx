// ===== عطاء - Donor Dashboard =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, Users, AlertTriangle, Package, TrendingUp, RefreshCw,
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام', water: 'مياه', hygiene: 'نظافة شخصية', baby_items: 'مستلزمات أطفال',
  medicine: 'أدوية', shelter: 'مأوى', clothing: 'ملابس', education: 'تعليم', other: 'أخرى',
};

const URGENCY_COLORS: Record<string, string> = {
  critical: 'var(--color-red)',
  high: 'var(--color-orange)',
  medium: 'var(--color-yellow)',
  low: 'var(--color-green)',
};

export default function DonorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [needsByZone, setNeedsByZone] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, needsRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getNeedsByZone(),
      ]);
      setStats(summaryRes.data);
      setNeedsByZone(needsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate needs by zone (no personal data)
  const zoneAggregation = needsByZone.reduce((acc: Record<string, any>, row: any) => {
    if (!row.zone_id) return acc;
    if (!acc[row.zone_id]) {
      acc[row.zone_id] = {
        zone_name: row.zone_name,
        total_households: row.total_households || 0,
        total_members: row.total_members || 0,
        needs: {} as Record<string, number>,
        urgency: {} as Record<string, number>,
      };
    }
    if (row.category) {
      acc[row.zone_id].needs[row.category] = (acc[row.zone_id].needs[row.category] || 0) + (row.need_count || 0);
    }
    if (row.urgency) {
      acc[row.zone_id].urgency[row.urgency] = (acc[row.zone_id].urgency[row.urgency] || 0) + (row.need_count || 0);
    }
    return acc;
  }, {});

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1 className="page-title">
            <BarChart3 size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
            بوابة المتبرعين
          </h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            مرحباً {user?.full_name} — عرض مُجمّع للاحتياجات (بدون بيانات شخصية)
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>
          <RefreshCw size={16} /> تحديث
        </button>
      </div>

      {/* Overview Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><Users size={24} /></div>
          <div className="stat-value">{stats?.totalHouseholds || 0}</div>
          <div className="stat-label">أسرة مسجلة</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><TrendingUp size={24} /></div>
          <div className="stat-value">{stats?.totalMembers || 0}</div>
          <div className="stat-label">إجمالي المستفيدين</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><AlertTriangle size={24} /></div>
          <div className="stat-value">{stats?.totalNeeds || 0}</div>
          <div className="stat-label">احتياج مفتوح</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><AlertTriangle size={24} /></div>
          <div className="stat-value">{stats?.criticalNeeds || 0}</div>
          <div className="stat-label">احتياج حرج</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Package size={24} /></div>
          <div className="stat-value">{stats?.totalDistributions || 0}</div>
          <div className="stat-label">عملية توزيع تمت</div>
        </div>
      </div>

      {/* Needs by Zone - Aggregated */}
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 16 }}>الاحتياجات حسب المنطقة</h2>
      {Object.entries(zoneAggregation).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <BarChart3 size={48} />
            <div className="empty-state-title">لا توجد بيانات بعد</div>
            <div className="empty-state-text">ستظهر البيانات المُجمّعة عند تسجيل أسر واحتياجات</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {Object.entries(zoneAggregation).map(([zoneId, zone]: [string, any]) => (
            <div key={zoneId} className="card">
              <div className="card-header">
                <h3 className="card-title">{zone.zone_name}</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="badge badge-primary">{zone.total_households} أسرة</span>
                  <span className="badge badge-gray">{zone.total_members} فرد</span>
                </div>
              </div>

              {/* Needs breakdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  الاحتياجات حسب الفئة
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(zone.needs).filter(([_, c]) => (c as number) > 0).map(([cat, count]) => (
                    <div key={cat} style={{
                      background: 'var(--color-surface)', padding: '8px 16px',
                      borderRadius: 'var(--radius-md)', textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{count as number}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        {CATEGORY_LABELS[cat] || cat}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Urgency breakdown */}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  حسب الاستعجال
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['critical', 'high', 'medium', 'low'].map(urgency => {
                    const count = zone.urgency[urgency] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={urgency} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: URGENCY_COLORS[urgency],
                        }}></div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{count}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {{ critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' }[urgency]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Privacy Notice */}
      <div style={{
        marginTop: 24, padding: 16, background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--color-text-muted)',
        border: '1px solid var(--color-border-light)',
      }}>
        <strong>ملاحظة الخصوصية:</strong> البيانات المعروضة هي بيانات مُجمّعة على مستوى المنطقة. لا يتم مشاركة أي بيانات شخصية مع المتبرعين وفقاً لسياسة حماية البيانات الإنسانية.
      </div>
    </div>
  );
}

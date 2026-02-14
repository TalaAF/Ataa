// ===== عطاء - Matches Page =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ArrowLeftRight, Check, X as XIcon } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام', water: 'مياه', hygiene: 'نظافة شخصية', baby_items: 'مستلزمات أطفال',
  medicine: 'أدوية', shelter: 'مأوى', clothing: 'ملابس', education: 'تعليم', other: 'أخرى',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار', accepted: 'مقبولة', picked_up: 'تم الاستلام', completed: 'مكتملة', cancelled: 'ملغاة',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'badge-orange', accepted: 'badge-primary', picked_up: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-gray',
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const res = await api.getMatches();
      setMatches(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.updateMatchStatus(id, status);
      loadMatches();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">
          <ArrowLeftRight size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          المطابقات
        </h1>
        <span className="badge badge-primary">{matches.length} مطابقة</span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>
      ) : matches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ArrowLeftRight size={48} />
            <div className="empty-state-title">لا توجد مطابقات</div>
            <div className="empty-state-text">عندما يتم مطابقة عرض مع طلب في نفس المنطقة، ستظهر هنا</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {matches.map(m => (
            <div key={m.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span className="badge badge-primary" style={{ marginLeft: 8 }}>
                    {CATEGORY_LABELS[m.category] || m.category}
                  </span>
                  <span className={`badge ${STATUS_BADGE[m.status]}`}>
                    {STATUS_LABELS[m.status]}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {new Date(m.created_at).toLocaleDateString('ar')}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                {/* Offer */}
                <div style={{ background: 'var(--color-surface)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>العرض</div>
                  <div style={{ fontWeight: 600 }}>كمية: {m.offer_qty}</div>
                  {m.offer_desc && <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{m.offer_desc}</div>}
                </div>

                <ArrowLeftRight size={24} style={{ color: 'var(--color-primary)' }} />

                {/* Request */}
                <div style={{ background: 'var(--color-surface)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>الطلب</div>
                  <div style={{ fontWeight: 600 }}>كمية: {m.request_qty}</div>
                  {m.request_desc && <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{m.request_desc}</div>}
                </div>
              </div>

              {m.pickup_point_name && (
                <div style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  نقطة الاستلام: <strong>{m.pickup_point_name}</strong>
                </div>
              )}

              {m.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => updateStatus(m.id, 'accepted')}>
                    <Check size={14} /> قبول
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => updateStatus(m.id, 'cancelled')}>
                    <XIcon size={14} /> رفض
                  </button>
                </div>
              )}
              {m.status === 'accepted' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => updateStatus(m.id, 'completed')}>
                    <Check size={14} /> تم الاستلام
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

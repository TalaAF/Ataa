// ===== عطاء - Needs Page =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AlertTriangle } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام', water: 'مياه', hygiene: 'نظافة شخصية', baby_items: 'مستلزمات أطفال',
  medicine: 'أدوية', shelter: 'مأوى', clothing: 'ملابس', education: 'تعليم', other: 'أخرى',
};

const URGENCY_LABELS: Record<string, string> = {
  low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة',
};

const URGENCY_BADGE: Record<string, string> = {
  low: 'badge-gray', medium: 'badge-yellow', high: 'badge-orange', critical: 'badge-red',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوح', partially_met: 'مغطى جزئياً', met: 'مغطى', cancelled: 'ملغى',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'badge-orange', partially_met: 'badge-yellow', met: 'badge-green', cancelled: 'badge-gray',
};

export default function NeedsPage() {
  const [needs, setNeeds] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category: '', urgency: '', status: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNeeds();
  }, [page, filters]);

  const loadNeeds = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (filters.category) params.category = filters.category;
      if (filters.urgency) params.urgency = filters.urgency;
      if (filters.status) params.status = filters.status;
      const res = await api.getNeeds(params);
      setNeeds(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.updateNeedStatus(id, status);
      loadNeeds();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">
          <AlertTriangle size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          الاحتياجات
        </h1>
        <span className="badge badge-primary">{total} احتياج</span>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <select className="filter-input" value={filters.category}
          onChange={e => { setFilters({ ...filters, category: e.target.value }); setPage(1); }}>
          <option value="">كل الفئات</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-input" value={filters.urgency}
          onChange={e => { setFilters({ ...filters, urgency: e.target.value }); setPage(1); }}>
          <option value="">كل مستويات الاستعجال</option>
          {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="filter-input" value={filters.status}
          onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>رمز الأسرة</th>
                <th>رب الأسرة</th>
                <th>المنطقة</th>
                <th>الفئة</th>
                <th>الكمية</th>
                <th>الاستعجال</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</td></tr>
              ) : needs.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>لا توجد احتياجات</td></tr>
              ) : needs.map(n => (
                <tr key={n.id}>
                  <td><code style={{ fontSize: '0.75rem', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: 4 }}>{n.household_token}</code></td>
                  <td>{n.head_of_household_name || '—'}</td>
                  <td>{n.zone_name || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{CATEGORY_LABELS[n.category] || n.category}</td>
                  <td>{n.quantity}</td>
                  <td><span className={`badge ${URGENCY_BADGE[n.urgency]}`}>{URGENCY_LABELS[n.urgency]}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[n.status]}`}>{STATUS_LABELS[n.status]}</span></td>
                  <td>
                    {n.status === 'open' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => updateStatus(n.id, 'met')}>تغطية</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(n.id, 'partially_met')}>جزئياً</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</button>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>صفحة {page} من {Math.ceil(total / 20)}</span>
          <button className="pagination-btn" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>التالي</button>
        </div>
      )}
    </div>
  );
}

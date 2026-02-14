// ===== عطاء - Distributions Page =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Truck, Plus, X, Search } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام', water: 'مياه', hygiene: 'نظافة شخصية', baby_items: 'مستلزمات أطفال',
  medicine: 'أدوية', shelter: 'مأوى', clothing: 'ملابس', education: 'تعليم', other: 'أخرى',
};

export default function DistributionsPage() {
  const { user } = useAuth();
  const [distributions, setDistributions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [shelters, setShelters] = useState<any[]>([]);

  // Distribution form
  const [tokenSearch, setTokenSearch] = useState('');
  const [foundHousehold, setFoundHousehold] = useState<any>(null);
  const [searchError, setSearchError] = useState('');
  const [distForm, setDistForm] = useState({
    location_id: '',
    items: [{ category: 'food', item_name: '', quantity: 1 }],
  });

  useEffect(() => {
    loadDistributions();
    loadShelters();
  }, [page]);

  const loadDistributions = async () => {
    setLoading(true);
    try {
      const res = await api.getDistributions({ page: String(page), limit: '20' });
      setDistributions(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadShelters = async () => {
    try {
      const res = await api.getShelters();
      setShelters(res.data);
    } catch (err) { console.error(err); }
  };

  const searchByToken = async () => {
    setSearchError('');
    setFoundHousehold(null);
    if (!tokenSearch.trim()) return;
    try {
      const res = await api.getHouseholdByToken(tokenSearch.trim());
      setFoundHousehold(res.data);
    } catch {
      setSearchError('لم يتم العثور على الأسرة بهذا الرمز');
    }
  };

  const addDistItem = () => {
    setDistForm({
      ...distForm,
      items: [...distForm.items, { category: 'food', item_name: '', quantity: 1 }],
    });
  };

  const removeDistItem = (index: number) => {
    setDistForm({ ...distForm, items: distForm.items.filter((_, i) => i !== index) });
  };

  const updateDistItem = (index: number, field: string, value: any) => {
    const items = [...distForm.items];
    items[index] = { ...items[index], [field]: value };
    setDistForm({ ...distForm, items });
  };

  const handleDistribute = async () => {
    if (!foundHousehold || !distForm.location_id || distForm.items.length === 0) {
      alert('يرجى تعبئة جميع الحقول المطلوبة');
      return;
    }
    try {
      await api.createDistribution({
        household_id: foundHousehold.id,
        location_id: distForm.location_id,
        items: distForm.items,
      });
      setShowModal(false);
      setFoundHousehold(null);
      setTokenSearch('');
      setDistForm({ location_id: '', items: [{ category: 'food', item_name: '', quantity: 1 }] });
      loadDistributions();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const canCreate = user?.role === 'admin' || user?.role === 'field_worker';

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">
          <Truck size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          التوزيع
        </h1>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> توزيع جديد
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>رمز الأسرة</th>
                <th>رب الأسرة</th>
                <th>المواد</th>
                <th>الموزع</th>
                <th>التاريخ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</td></tr>
              ) : distributions.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>لا توجد عمليات توزيع</td></tr>
              ) : distributions.map(d => (
                <tr key={d.id}>
                  <td><code style={{ fontSize: '0.75rem', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: 4 }}>{d.household_token}</code></td>
                  <td>{d.head_of_household_name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {d.items?.map((item: any, i: number) => (
                        <span key={i} className="badge badge-primary">
                          {CATEGORY_LABELS[item.category] || item.category} ({item.quantity})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{d.distributed_by_name || '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {d.distributed_at ? new Date(d.distributed_at).toLocaleDateString('ar') : '—'}
                  </td>
                  <td><span className="badge badge-green">مكتمل</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</button>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>صفحة {page}</span>
          <button className="pagination-btn" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>التالي</button>
        </div>
      )}

      {/* Distribution Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2 className="modal-title">توزيع مساعدات</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            {/* Token Search */}
            <div className="form-group">
              <label className="form-label">رمز الأسرة *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={tokenSearch}
                  onChange={e => setTokenSearch(e.target.value)}
                  placeholder="أدخل رمز الأسرة (QR)"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchByToken())} />
                <button type="button" className="btn btn-secondary" onClick={searchByToken}>
                  <Search size={16} />
                </button>
              </div>
              {searchError && <div style={{ color: 'var(--color-red)', fontSize: '0.78rem', marginTop: 4 }}>{searchError}</div>}
            </div>

            {foundHousehold && (
              <div style={{
                background: 'var(--color-primary-50)', padding: 14, borderRadius: 'var(--radius-md)',
                marginBottom: 16, border: '1px solid var(--color-primary)',
              }}>
                <div style={{ fontWeight: 600 }}>{foundHousehold.head_of_household_name || 'أسرة'} — {foundHousehold.token}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                  أفراد: {foundHousehold.family_size} | أولوية: {foundHousehold.priority_score}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">موقع التوزيع *</label>
              <select className="form-input" value={distForm.location_id}
                onChange={e => setDistForm({ ...distForm, location_id: e.target.value })} required>
                <option value="">اختر الموقع</option>
                {shelters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>المواد الموزعة</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addDistItem}>
                  <Plus size={14} /> إضافة
                </button>
              </div>
              {distForm.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select className="form-input" style={{ flex: 1 }} value={item.category}
                    onChange={e => updateDistItem(i, 'category', e.target.value)}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className="form-input" style={{ flex: 1 }} value={item.item_name}
                    onChange={e => updateDistItem(i, 'item_name', e.target.value)}
                    placeholder="اسم الصنف" />
                  <input type="number" min="1" className="form-input" style={{ width: 80 }} value={item.quantity}
                    onChange={e => updateDistItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                  {distForm.items.length > 1 && (
                    <button type="button" className="btn-icon" style={{ color: 'var(--color-red)' }}
                      onClick={() => removeDistItem(i)}><X size={16} /></button>
                  )}
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleDistribute} disabled={!foundHousehold}>
                <Truck size={16} /> تأكيد التوزيع
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

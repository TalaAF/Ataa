// ===== عطاء - Offers Page =====
import { useState, useEffect, FormEvent } from 'react';
import { api } from '../api/client';
import { Heart, Plus, X } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام', water: 'مياه', hygiene: 'نظافة شخصية', baby_items: 'مستلزمات أطفال',
  medicine: 'أدوية', shelter: 'مأوى', clothing: 'ملابس', education: 'تعليم', other: 'أخرى',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'متاح', matched: 'تمت المطابقة', completed: 'مكتمل', expired: 'منتهي', cancelled: 'ملغى',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'badge-green', matched: 'badge-primary', completed: 'badge-gray', expired: 'badge-yellow', cancelled: 'badge-gray',
};

export default function OffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [form, setForm] = useState({ zone_id: '', category: 'food', description: '', quantity: 1, expiry: '' });

  useEffect(() => {
    loadOffers();
    loadZones();
  }, []);

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await api.getOffers({ status: '' });
      setOffers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async () => {
    try {
      const res = await api.getZones();
      setZones(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createOffer(form);
      setShowModal(false);
      setForm({ zone_id: '', category: 'food', description: '', quantity: 1, expiry: '' });
      loadOffers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">
          <Heart size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          العروض
        </h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> عرض جديد
        </button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>الفئة</th>
                <th>الوصف</th>
                <th>الكمية</th>
                <th>المنطقة</th>
                <th>مقدم العرض</th>
                <th>الانتهاء</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</td></tr>
              ) : offers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>لا توجد عروض</td></tr>
              ) : offers.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 600 }}>{CATEGORY_LABELS[o.category] || o.category}</td>
                  <td>{o.description || '—'}</td>
                  <td>{o.quantity}</td>
                  <td>{o.zone_name || '—'}</td>
                  <td>{o.created_by_name || '—'}</td>
                  <td style={{ fontSize: '0.78rem' }}>{o.expiry || '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[o.status]}`}>{STATUS_LABELS[o.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Offer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">عرض مساعدة جديد</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">الفئة *</label>
                  <select className="form-input" value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">الكمية</label>
                  <input type="number" min="1" className="form-input" value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">المنطقة</label>
                <select className="form-input" value={form.zone_id}
                  onChange={e => setForm({ ...form, zone_id: e.target.value })}>
                  <option value="">المنطقة الحالية</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">وصف العرض</label>
                <textarea className="form-input" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف المواد المعروضة..." />
              </div>
              <div className="form-group">
                <label className="form-label">تاريخ الانتهاء</label>
                <input type="date" className="form-input" value={form.expiry}
                  onChange={e => setForm({ ...form, expiry: e.target.value })} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">نشر العرض</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

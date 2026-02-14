// ===== عطاء - Requests Page =====
import { useState, useEffect, FormEvent } from 'react';
import { api } from '../api/client';
import { HeartHandshake, Plus, X } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام', water: 'مياه', hygiene: 'نظافة شخصية', baby_items: 'مستلزمات أطفال',
  medicine: 'أدوية', shelter: 'مأوى', clothing: 'ملابس', education: 'تعليم', other: 'أخرى',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوح', matched: 'تمت المطابقة', completed: 'مكتمل', expired: 'منتهي', cancelled: 'ملغى',
};

const STATUS_BADGE: Record<string, string> = {
  open: 'badge-orange', matched: 'badge-primary', completed: 'badge-green', expired: 'badge-yellow', cancelled: 'badge-gray',
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [form, setForm] = useState({ zone_id: '', category: 'food', description: '', quantity: 1 });

  useEffect(() => {
    loadRequests();
    loadZones();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await api.getRequests({ status: '' });
      setRequests(res.data);
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
      await api.createRequest(form);
      setShowModal(false);
      setForm({ zone_id: '', category: 'food', description: '', quantity: 1 });
      loadRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">
          <HeartHandshake size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          الطلبات
        </h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> طلب جديد
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
                <th>التاريخ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>لا توجد طلبات</td></tr>
              ) : requests.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{CATEGORY_LABELS[r.category] || r.category}</td>
                  <td>{r.description || '—'}</td>
                  <td>{r.quantity}</td>
                  <td>{r.zone_name || '—'}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{new Date(r.created_at).toLocaleDateString('ar')}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Request Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">طلب مساعدة جديد</h2>
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
                <label className="form-label">وصف الطلب</label>
                <textarea className="form-input" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="وصف ما تحتاجه..." />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">إرسال الطلب</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== عطاء - Inventory Page =====
import { useState, useEffect, FormEvent } from 'react';
import { api } from '../api/client';
import { Package, Plus, X } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  food: 'طعام', water: 'مياه', hygiene: 'نظافة شخصية', baby_items: 'مستلزمات أطفال',
  medicine: 'أدوية', shelter: 'مأوى', clothing: 'ملابس', education: 'تعليم', other: 'أخرى',
};

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [shelters, setShelters] = useState<any[]>([]);
  const [form, setForm] = useState({
    location_id: '', location_type: 'shelter', category: 'food',
    item_name: '', qty_available: 0, batch_info: '', expiry_date: '',
  });

  useEffect(() => {
    loadInventory();
    loadShelters();
  }, []);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await api.getInventory();
      setItems(res.data);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createInventoryItem(form);
      setShowModal(false);
      setForm({ location_id: '', location_type: 'shelter', category: 'food', item_name: '', qty_available: 0, batch_info: '', expiry_date: '' });
      loadInventory();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Group by location
  const grouped = items.reduce((acc: Record<string, any[]>, item: any) => {
    const key = item.location_name || item.location_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">
          <Package size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          المخزون
        </h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> إضافة صنف
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={48} />
            <div className="empty-state-title">لا يوجد مخزون</div>
            <div className="empty-state-text">ابدأ بإضافة أصناف المخزون</div>
          </div>
        </div>
      ) : Object.entries(grouped).map(([location, locationItems]) => (
        <div key={location} className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <h3 className="card-title">{location}</h3>
            <span className="badge badge-primary">{locationItems.length} صنف</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>الصنف</th>
                  <th>الفئة</th>
                  <th>الكمية المتاحة</th>
                  <th>الكمية المحجوزة</th>
                  <th>تاريخ الانتهاء</th>
                  <th>الدفعة</th>
                </tr>
              </thead>
              <tbody>
                {locationItems.map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                    <td><span className="badge badge-primary">{CATEGORY_LABELS[item.category] || item.category}</span></td>
                    <td style={{ fontWeight: 700, color: item.qty_available < 10 ? 'var(--color-red)' : 'var(--color-green)' }}>
                      {item.qty_available}
                    </td>
                    <td>{item.qty_reserved}</td>
                    <td style={{ fontSize: '0.78rem' }}>{item.expiry_date || '—'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{item.batch_info || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Add Item Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">إضافة صنف جديد</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">الموقع *</label>
                <select className="form-input" value={form.location_id}
                  onChange={e => setForm({ ...form, location_id: e.target.value })} required>
                  <option value="">اختر الموقع</option>
                  {shelters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">اسم الصنف *</label>
                  <input className="form-input" value={form.item_name}
                    onChange={e => setForm({ ...form, item_name: e.target.value })} required
                    placeholder="مثال: أرز، حليب أطفال..." />
                </div>
                <div className="form-group">
                  <label className="form-label">الفئة *</label>
                  <select className="form-input" value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">الكمية المتاحة</label>
                  <input type="number" min="0" className="form-input" value={form.qty_available}
                    onChange={e => setForm({ ...form, qty_available: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">تاريخ الانتهاء</label>
                  <input type="date" className="form-input" value={form.expiry_date}
                    onChange={e => setForm({ ...form, expiry_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">معلومات الدفعة</label>
                <input className="form-input" value={form.batch_info}
                  onChange={e => setForm({ ...form, batch_info: e.target.value })}
                  placeholder="رقم الدفعة أو معلومات إضافية" />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">إضافة</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Donor Portal - Pledges Page =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { NeedCategoryLabel, NeedCategory } from '@ataa/shared';
import { Plus, X } from 'lucide-react';

interface Pledge {
  id: string;
  zone_id?: string;
  zone_name?: string;
  category: string;
  quantity: number;
  description?: string;
  status: string;
  created_at: string;
}

interface Zone {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pledged: { label: 'متعهد', cls: 'badge-orange' },
  fulfilled: { label: 'منفذ', cls: 'badge-green' },
  cancelled: { label: 'ملغى', cls: 'badge-red' },
};

export default function PledgesPage() {
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    zone_id: '',
    category: NeedCategory.FOOD as string,
    quantity: 1,
    description: '',
  });

  useEffect(() => {
    fetchPledges();
    fetchZones();
  }, []);

  const fetchPledges = async () => {
    try {
      const res = await api.getPledges();
      if (res.success) setPledges(res.data || []);
    } catch (err) {
      console.error('Error fetching pledges:', err);
    }
  };

  const fetchZones = async () => {
    try {
      const res = await api.getZones();
      if (res.success) setZones(res.data || []);
    } catch (err) {
      console.error('Error fetching zones:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data: any = { category: form.category, quantity: form.quantity };
      if (form.zone_id) data.zone_id = form.zone_id;
      if (form.description) data.description = form.description;

      const res = await api.createPledge(data);
      if (res.success) {
        setShowForm(false);
        setForm({ zone_id: '', category: NeedCategory.FOOD, quantity: 1, description: '' });
        fetchPledges();
      }
    } catch (err) {
      console.error('Error creating pledge:', err);
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">تعهداتي</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            تعهد جديد
          </button>
        </div>
      </div>

      {/* New Pledge Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">تعهد جديد</h2>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">المنطقة (اختياري)</label>
                <select
                  className="form-input"
                  value={form.zone_id}
                  onChange={e => setForm({ ...form, zone_id: e.target.value })}
                >
                  <option value="">جميع المناطق</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">الفئة</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  {Object.entries(NeedCategoryLabel).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">الكمية</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">الوصف (اختياري)</label>
                <textarea
                  className="form-input"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">تقديم التعهد</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>الغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pledges Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>الفئة</th>
                <th>الكمية</th>
                <th>المنطقة</th>
                <th>الوصف</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {pledges.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
                    لا توجد تعهدات بعد
                  </td>
                </tr>
              ) : (
                pledges.map(pledge => {
                  const s = STATUS_LABELS[pledge.status] || { label: pledge.status, cls: 'badge-gray' };
                  return (
                    <tr key={pledge.id}>
                      <td>{new Date(pledge.created_at).toLocaleDateString('ar-SA')}</td>
                      <td>{NeedCategoryLabel[pledge.category as keyof typeof NeedCategoryLabel] || pledge.category}</td>
                      <td style={{ fontWeight: 600 }}>{pledge.quantity}</td>
                      <td>{pledge.zone_name || 'عام'}</td>
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>{pledge.description || '-'}</td>
                      <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

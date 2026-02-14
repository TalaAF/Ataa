// ===== Donor Portal - Needs by Zone Page =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { NeedCategoryLabel, NeedCategory } from '@ataa/shared';
import { Plus, X } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
}

interface AggregatedNeed {
  zone_id: string;
  zone_name: string;
  category: string;
  urgency: string;
  total_quantity: number;
  household_count: number;
}

export default function NeedsPage() {
  const [needs, setNeeds] = useState<AggregatedNeed[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    zone_id: '',
    category: NeedCategory.FOOD as string,
    quantity: 1,
    description: '',
  });

  useEffect(() => {
    fetchZones();
  }, []);

  useEffect(() => {
    fetchNeeds();
  }, [selectedZone]);

  const fetchZones = async () => {
    try {
      const res = await api.getZones();
      if (res.success) setZones(res.data || []);
    } catch (err) {
      console.error('Error fetching zones:', err);
    }
  };

  const fetchNeeds = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await api.getAggregatedNeeds(selectedZone || undefined);
      if (res.success) setNeeds(res.data || []);
    } catch (err) {
      console.error('Error fetching needs:', err);
      setError('تعذر تحميل البيانات، حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
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
      }
    } catch (err) {
      console.error('Error creating pledge:', err);
      setError('تعذر إنشاء التعهد، حاول مرة أخرى.');
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
        <h1 className="page-title">الاحتياجات المجمعة</h1>
        <div className="topbar-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            تعهد جديد
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select
          className="form-input"
          style={{ maxWidth: 300 }}
          value={selectedZone}
          onChange={e => setSelectedZone(e.target.value)}
        >
          <option value="">جميع المناطق</option>
          {zones.map(z => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: 16, color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

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
                  onChange={e => setForm({ ...form, quantity: parseInt(e.target.value, 10) || 1 })}
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

      <div className="card">
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
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
                    جاري التحميل...
                  </td>
                </tr>
              ) : needs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
                    لا توجد احتياجات حاليا
                  </td>
                </tr>
              ) : (
                needs.map((need, i) => (
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

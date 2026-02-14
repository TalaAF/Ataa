// ===== Donor Portal - Needs by Zone Page =====
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { NeedCategoryLabel } from '@ataa/shared';

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
    try {
      const res = await api.getAggregatedNeeds(selectedZone || undefined);
      if (res.success) setNeeds(res.data || []);
    } catch (err) {
      console.error('Error fetching needs:', err);
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
              {needs.length === 0 ? (
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

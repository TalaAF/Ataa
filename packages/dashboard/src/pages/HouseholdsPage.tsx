// ===== عطاء - Households Page =====
import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Search, X } from 'lucide-react';

const DISPLACEMENT_LABELS: Record<string, string> = {
  displaced: 'نازح', returnee: 'عائد', host: 'مضيف', other: 'أخرى',
};

const VULNERABILITY_OPTIONS = [
  { value: 'pregnant', label: 'حامل' },
  { value: 'disabled', label: 'ذوي إعاقة' },
  { value: 'chronic_illness', label: 'مرض مزمن' },
  { value: 'elderly_alone', label: 'مسن بدون معيل' },
  { value: 'orphans', label: 'أيتام' },
  { value: 'female_headed', label: 'أسرة ترأسها أنثى' },
  { value: 'large_family', label: 'أسرة كبيرة' },
];

const AGE_BANDS = [
  { value: '0-2', label: 'رضيع (0-2)' },
  { value: '3-12', label: 'طفل (3-12)' },
  { value: '13-17', label: 'مراهق (13-17)' },
  { value: '18-59', label: 'بالغ (18-59)' },
  { value: '60+', label: 'مسن (60+)' },
];

export default function HouseholdsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    zone_id: '',
    shelter_id: '',
    head_of_household_name: '',
    family_size: 1,
    displacement_status: 'displaced',
    vulnerability_flags: [] as string[],
    notes: '',
    members: [] as any[],
  });

  useEffect(() => {
    loadHouseholds();
    loadZones();
  }, [page, search]);

  const loadHouseholds = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '15' };
      if (search) params.search = search;
      const res = await api.getHouseholds(params);
      setHouseholds(res.data.items);
      setTotal(res.data.total);
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

  const loadShelters = async (zoneId: string) => {
    try {
      const res = await api.getShelters(zoneId);
      setShelters(res.data);
    } catch (err) { console.error(err); }
  };

  const handleZoneChange = (zoneId: string) => {
    setForm({ ...form, zone_id: zoneId, shelter_id: '' });
    if (zoneId) loadShelters(zoneId);
    else setShelters([]);
  };

  const toggleVulnerability = (flag: string) => {
    const flags = form.vulnerability_flags.includes(flag)
      ? form.vulnerability_flags.filter(f => f !== flag)
      : [...form.vulnerability_flags, flag];
    setForm({ ...form, vulnerability_flags: flags });
  };

  const addMember = () => {
    setForm({
      ...form,
      members: [...form.members, { age_band: '18-59', sex: '', special_needs_flags: [] }],
    });
  };

  const removeMember = (index: number) => {
    setForm({ ...form, members: form.members.filter((_, i) => i !== index) });
  };

  const updateMember = (index: number, field: string, value: any) => {
    const members = [...form.members];
    members[index] = { ...members[index], [field]: value };
    setForm({ ...form, members });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createHousehold(form);
      setShowModal(false);
      resetForm();
      loadHouseholds();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const resetForm = () => {
    setForm({
      zone_id: '', shelter_id: '', head_of_household_name: '',
      family_size: 1, displacement_status: 'displaced',
      vulnerability_flags: [], notes: '', members: [],
    });
  };

  const getPriorityColor = (score: number) => {
    if (score >= 20) return 'var(--color-red)';
    if (score >= 12) return 'var(--color-orange)';
    if (score >= 6) return 'var(--color-yellow)';
    return 'var(--color-green)';
  };

  const canCreate = user?.role === 'admin' || user?.role === 'field_worker';

  return (
    <div>
      <div className="topbar">
        <h1 className="page-title">
          <Users size={28} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
          سجل الأسر
        </h1>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} />
            تسجيل أسرة جديدة
          </button>
        )}
      </div>

      {/* Search */}
      <div className="filters-bar">
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="filter-input"
            style={{ width: '100%', paddingRight: 38 }}
            placeholder="بحث بالاسم أو الرمز..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <span className="badge badge-gray">{total} أسرة</span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>الرمز</th>
                <th>رب الأسرة</th>
                <th>المنطقة</th>
                <th>المركز</th>
                <th>عدد الأفراد</th>
                <th>حالة النزوح</th>
                <th>الأولوية</th>
                <th>المزامنة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</td></tr>
              ) : households.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>لا توجد أسر مسجلة</td></tr>
              ) : households.map(h => (
                <tr key={h.id} onClick={() => navigate(`/households/${h.id}`)} style={{ cursor: 'pointer' }}>
                  <td><code style={{ fontSize: '0.78rem', background: 'var(--color-surface)', padding: '2px 8px', borderRadius: 4 }}>{h.token}</code></td>
                  <td style={{ fontWeight: 600 }}>{h.head_of_household_name || '—'}</td>
                  <td>{h.zone_name || h.zone_id}</td>
                  <td>{h.shelter_name || '—'}</td>
                  <td>{h.family_size}</td>
                  <td><span className="badge badge-gray">{DISPLACEMENT_LABELS[h.displacement_status] || h.displacement_status}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="priority-bar" style={{ width: 60 }}>
                        <div className="priority-fill" style={{ width: `${Math.min(100, (h.priority_score / 30) * 100)}%`, background: getPriorityColor(h.priority_score) }}></div>
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: getPriorityColor(h.priority_score) }}>{h.priority_score}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`sync-dot ${h.sync_status === 'synced' ? 'online' : h.sync_status === 'pending' ? 'pending' : 'offline'}`}
                      style={{ display: 'inline-block' }}></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div className="pagination">
          <button className="pagination-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</button>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>صفحة {page} من {Math.ceil(total / 15)}</span>
          <button className="pagination-btn" disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)}>التالي</button>
        </div>
      )}

      {/* Create Household Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h2 className="modal-title">تسجيل أسرة جديدة</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">اسم رب الأسرة</label>
                  <input className="form-input" value={form.head_of_household_name}
                    onChange={e => setForm({ ...form, head_of_household_name: e.target.value })}
                    placeholder="الاسم (اختياري)" />
                </div>
                <div className="form-group">
                  <label className="form-label">عدد أفراد الأسرة *</label>
                  <input type="number" min="1" className="form-input" value={form.family_size}
                    onChange={e => setForm({ ...form, family_size: parseInt(e.target.value) || 1 })} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">المنطقة *</label>
                  <select className="form-input" value={form.zone_id} onChange={e => handleZoneChange(e.target.value)} required>
                    <option value="">اختر المنطقة</option>
                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">المركز/المأوى</label>
                  <select className="form-input" value={form.shelter_id} onChange={e => setForm({ ...form, shelter_id: e.target.value })}>
                    <option value="">اختر المركز</option>
                    {shelters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">حالة النزوح</label>
                <select className="form-input" value={form.displacement_status}
                  onChange={e => setForm({ ...form, displacement_status: e.target.value })}>
                  <option value="displaced">نازح</option>
                  <option value="returnee">عائد</option>
                  <option value="host">مضيف</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">مؤشرات الضعف</label>
                <div className="tag-group">
                  {VULNERABILITY_OPTIONS.map(opt => (
                    <label key={opt.value}>
                      <input type="checkbox" className="tag-checkbox"
                        checked={form.vulnerability_flags.includes(opt.value)}
                        onChange={() => toggleVulnerability(opt.value)} />
                      <span className="tag-label">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Members */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>أفراد الأسرة</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addMember}>
                    <Plus size={14} /> إضافة فرد
                  </button>
                </div>
                {form.members.map((member, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                    <select className="form-input" style={{ flex: 1 }} value={member.age_band}
                      onChange={e => updateMember(i, 'age_band', e.target.value)}>
                      {AGE_BANDS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                    <select className="form-input" style={{ width: 100 }} value={member.sex}
                      onChange={e => updateMember(i, 'sex', e.target.value)}>
                      <option value="">الجنس</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                    <button type="button" className="btn-icon" style={{ color: 'var(--color-red)' }}
                      onClick={() => removeMember(i)}><X size={16} /></button>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات</label>
                <textarea className="form-input" value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="ملاحظات إضافية..." />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">حفظ الأسرة</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

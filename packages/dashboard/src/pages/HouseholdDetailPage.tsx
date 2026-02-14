// ===== عطاء - Household Detail Page =====
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ArrowRight, Users, AlertTriangle, Truck, Plus, X, Brain } from 'lucide-react';

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

export default function HouseholdDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [household, setHousehold] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showNeedModal, setShowNeedModal] = useState(false);
  const [needForm, setNeedForm] = useState({ category: 'food', quantity: 1, urgency: 'medium', description: '' });
  const [predictions, setPredictions] = useState<any[] | null>(null);
  const [aiPriority, setAiPriority] = useState<any>(null);

  useEffect(() => {
    loadHousehold();
    loadAI();
  }, [id]);

  const loadHousehold = async () => {
    try {
      const res = await api.getHousehold(id!);
      setHousehold(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAI = async () => {
    try {
      const [predRes, priorityRes] = await Promise.all([
        api.predictNeeds(id!).catch(() => null),
        api.getAIPriorityScore(id!).catch(() => null),
      ]);
      if (predRes?.data) setPredictions(predRes.data);
      if (priorityRes?.data) setAiPriority(priorityRes.data);
    } catch {}
  };

  const handleAddNeed = async () => {
    try {
      await api.createNeed({ household_id: id, ...needForm });
      setShowNeedModal(false);
      setNeedForm({ category: 'food', quantity: 1, urgency: 'medium', description: '' });
      loadHousehold();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>جاري التحميل...</div>;
  if (!household) return <div style={{ padding: 40, textAlign: 'center' }}>الأسرة غير موجودة</div>;

  return (
    <div>
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/households')}>
            <ArrowRight size={16} />
            رجوع
          </button>
          <h1 className="page-title">بيانات الأسرة</h1>
        </div>
      </div>

      {/* Household Info Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>رمز الأسرة</div>
            <code style={{ fontSize: '1rem', fontWeight: 700, background: 'var(--color-primary-50)', padding: '4px 12px', borderRadius: 6, color: 'var(--color-primary-dark)' }}>
              {household.token}
            </code>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>رب الأسرة</div>
            <div style={{ fontWeight: 600 }}>{household.head_of_household_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>عدد الأفراد</div>
            <div style={{ fontWeight: 600 }}>{household.family_size}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>المنطقة</div>
            <div>{household.zone_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>المركز</div>
            <div>{household.shelter_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>درجة الأولوية</div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: household.priority_score >= 15 ? 'var(--color-red)' : 'var(--color-primary)' }}>
              {household.priority_score}
            </div>
          </div>
        </div>

        {household.vulnerability_flags?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>مؤشرات الضعف</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {household.vulnerability_flags.map((f: string) => (
                <span key={f} className="badge badge-orange">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      {household.members?.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title"><Users size={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />أفراد الأسرة ({household.members.length})</h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>الفئة العمرية</th>
                  <th>الجنس</th>
                  <th>احتياجات خاصة</th>
                </tr>
              </thead>
              <tbody>
                {household.members.map((m: any) => (
                  <tr key={m.id}>
                    <td>{m.age_band}</td>
                    <td>{m.sex === 'male' ? 'ذكر' : m.sex === 'female' ? 'أنثى' : '—'}</td>
                    <td>{m.special_needs_flags?.length > 0 ? m.special_needs_flags.join(', ') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Needs */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3 className="card-title"><AlertTriangle size={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />الاحتياجات ({household.needs?.length || 0})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowNeedModal(true)}>
            <Plus size={14} /> تسجيل احتياج
          </button>
        </div>
        {household.needs?.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>الفئة</th>
                  <th>الكمية</th>
                  <th>الاستعجال</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {household.needs.map((n: any) => (
                  <tr key={n.id}>
                    <td style={{ fontWeight: 600 }}>{CATEGORY_LABELS[n.category] || n.category}</td>
                    <td>{n.quantity}</td>
                    <td><span className={`badge ${URGENCY_BADGE[n.urgency]}`}>{URGENCY_LABELS[n.urgency]}</span></td>
                    <td><span className="badge badge-gray">{STATUS_LABELS[n.status] || n.status}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{new Date(n.created_at).toLocaleDateString('ar')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>لا توجد احتياجات مسجلة</div>
        )}
      </div>

      {/* AI Predicted Needs */}
      {predictions && predictions.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--color-primary)', borderWidth: 1 }}>
          <div className="card-header">
            <h3 className="card-title">
              <Brain size={18} style={{ verticalAlign: 'middle', marginLeft: 6, color: 'var(--color-primary)' }} />
              احتياجات متوقعة (ذكاء اصطناعي)
            </h3>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>الفئة</th>
                  <th>الكمية المقترحة</th>
                  <th>الاستعجال</th>
                  <th>الثقة</th>
                  <th>السبب</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{CATEGORY_LABELS[p.category] || p.category}</td>
                    <td>{p.suggested_quantity}</td>
                    <td><span className={`badge ${URGENCY_BADGE[p.suggested_urgency]}`}>{URGENCY_LABELS[p.suggested_urgency]}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="priority-bar" style={{ width: 50 }}>
                          <div className="priority-fill" style={{ width: `${p.confidence * 100}%`, background: 'var(--color-primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.78rem' }}>{Math.round(p.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{p.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Priority Breakdown */}
      {aiPriority && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">
              <Brain size={18} style={{ verticalAlign: 'middle', marginLeft: 6, color: 'var(--color-primary)' }} />
              تحليل الاولوية (درجة: {aiPriority.total_score}/30)
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            <div className="stat-card" style={{ padding: 12 }}>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{aiPriority.vulnerability_score}</div>
              <div className="stat-label">الهشاشة</div>
            </div>
            <div className="stat-card" style={{ padding: 12 }}>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{aiPriority.family_composition_score}</div>
              <div className="stat-label">تركيبة الاسرة</div>
            </div>
            <div className="stat-card" style={{ padding: 12 }}>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{aiPriority.unmet_needs_score}</div>
              <div className="stat-label">احتياجات غير ملباة</div>
            </div>
            <div className="stat-card" style={{ padding: 12 }}>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{aiPriority.time_since_distribution_score}</div>
              <div className="stat-label">مدة بدون توزيع</div>
            </div>
            <div className="stat-card" style={{ padding: 12 }}>
              <div className="stat-value" style={{ fontSize: '1.2rem' }}>{aiPriority.displacement_score}</div>
              <div className="stat-label">حالة النزوح</div>
            </div>
          </div>
        </div>
      )}

      {/* Distributions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title"><Truck size={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />سجل التوزيع ({household.distributions?.length || 0})</h3>
        </div>
        {household.distributions?.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>المواد</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {household.distributions.map((d: any) => (
                  <tr key={d.id}>
                    <td>{d.distributed_at ? new Date(d.distributed_at).toLocaleDateString('ar') : '—'}</td>
                    <td>
                      {d.items?.map((item: any, i: number) => (
                        <span key={i} className="badge badge-primary" style={{ marginLeft: 4 }}>
                          {CATEGORY_LABELS[item.category] || item.category} ({item.quantity})
                        </span>
                      ))}
                    </td>
                    <td><span className="badge badge-green">{d.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-text-muted)' }}>لم يتم التوزيع بعد</div>
        )}
      </div>

      {/* Add Need Modal */}
      {showNeedModal && (
        <div className="modal-overlay" onClick={() => setShowNeedModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">تسجيل احتياج جديد</h2>
              <button className="modal-close" onClick={() => setShowNeedModal(false)}><X size={20} /></button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الفئة *</label>
                <select className="form-input" value={needForm.category}
                  onChange={e => setNeedForm({ ...needForm, category: e.target.value })}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">الكمية</label>
                <input type="number" min="1" className="form-input" value={needForm.quantity}
                  onChange={e => setNeedForm({ ...needForm, quantity: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">الاستعجال</label>
              <select className="form-input" value={needForm.urgency}
                onChange={e => setNeedForm({ ...needForm, urgency: e.target.value })}>
                {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">وصف</label>
              <textarea className="form-input" value={needForm.description}
                onChange={e => setNeedForm({ ...needForm, description: e.target.value })}
                placeholder="وصف تفصيلي (اختياري)" />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleAddNeed}>حفظ</button>
              <button className="btn btn-secondary" onClick={() => setShowNeedModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Field App - Self Registration Page (Public - No Login Required) =====
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { UserPlus, ChevronRight, ChevronLeft, CheckCircle, Search } from 'lucide-react';
import {
  DisplacementStatus, AgeBand, NeedCategory, Urgency,
} from '@ataa/shared';

const VULNERABILITY_OPTIONS = [
  { key: 'pregnant', label: 'حامل' },
  { key: 'disabled', label: 'ذوي اعاقة' },
  { key: 'chronic_illness', label: 'مرض مزمن' },
  { key: 'elderly_alone', label: 'مسن وحيد' },
  { key: 'orphans', label: 'ايتام' },
  { key: 'female_headed', label: 'ترأسها امرأة' },
  { key: 'large_family', label: 'اسرة كبيرة' },
];

export default function SelfRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ token: string } | null>(null);

  // Lookup state
  const [lookupToken, setLookupToken] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState('');
  const [showLookup, setShowLookup] = useState(false);

  // Zones & shelters
  const [zones, setZones] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);

  // Step 1: Household Info
  const [headName, setHeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [familySize, setFamilySize] = useState(1);
  const [zoneId, setZoneId] = useState('');
  const [shelterId, setShelterId] = useState('');
  const [displacement, setDisplacement] = useState(DisplacementStatus.DISPLACED);
  const [vulnFlags, setVulnFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Step 2: Members
  const [members, setMembers] = useState<{ age_band: string; sex: string }[]>([]);

  // Step 3: Needs
  const [needs, setNeeds] = useState<{ category: string; quantity: number; urgency: string }[]>([]);

  useEffect(() => {
    api.getPublicZones().then(res => {
      setZones(res.data || []);
      if (res.data?.length > 0) setZoneId(res.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (zoneId) {
      api.getPublicShelters(zoneId).then(res => {
        setShelters(res.data || []);
      }).catch(() => {});
    }
  }, [zoneId]);

  const toggleFlag = (key: string) => {
    setVulnFlags(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  };

  const addMember = () => setMembers([...members, { age_band: AgeBand.ADULT, sex: '' }]);
  const removeMember = (i: number) => setMembers(members.filter((_, idx) => idx !== i));
  const addNeed = () => setNeeds([...needs, { category: NeedCategory.FOOD, quantity: 1, urgency: Urgency.MEDIUM }]);
  const removeNeed = (i: number) => setNeeds(needs.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!headName.trim()) {
      alert('يرجى ادخال اسم رب الاسرة');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.selfRegister({
        zone_id: zoneId,
        shelter_id: shelterId || undefined,
        head_of_household_name: headName,
        family_size: familySize,
        displacement_status: displacement,
        vulnerability_flags: vulnFlags,
        notes,
        phone,
        members,
        needs,
      });
      setResult({ token: res.data.token });
      setStep(4);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ اثناء التسجيل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupToken.trim()) return;
    setLookupError('');
    setLookupResult(null);
    try {
      const res = await api.checkStatus(lookupToken.trim());
      setLookupResult(res.data);
    } catch {
      setLookupError('رمز الاسرة غير موجود');
    }
  };

  // Success screen
  if (step === 4 && result) {
    return (
      <div className="self-register-container">
        <div className="card" style={{ textAlign: 'center', padding: 32 }}>
          <CheckCircle size={64} style={{ color: 'var(--color-green)', margin: '0 auto 16px' }} />
          <h2 style={{ color: 'var(--color-green)', marginBottom: 8 }}>تم التسجيل بنجاح</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
            يرجى الاحتفاظ بالرمز التالي لمتابعة حالة طلبك
          </p>
          <div style={{
            background: 'var(--color-surface)',
            border: '2px dashed var(--color-primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: 24,
          }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>رمز الاسرة</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-primary)', letterSpacing: 2 }}>
              {result.token}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => {
              setStep(1);
              setResult(null);
              setHeadName('');
              setPhone('');
              setFamilySize(1);
              setVulnFlags([]);
              setNotes('');
              setMembers([]);
              setNeeds([]);
            }}>
              تسجيل اسرة اخرى
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="self-register-container">
      {/* Header */}
      <div style={{
        background: 'var(--color-primary)',
        color: 'white',
        padding: '24px 20px',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 20,
        textAlign: 'center',
      }}>
        <UserPlus size={36} style={{ marginBottom: 8 }} />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>تسجيل اسرة جديدة</h1>
        <p style={{ fontSize: '0.85rem', opacity: 0.85, margin: '6px 0 0' }}>
          سجل اسرتك للحصول على المساعدات
        </p>
      </div>

      {/* Toggle: Register / Check Status */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${!showLookup ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setShowLookup(false)}
        >
          <UserPlus size={16} />
          تسجيل جديد
        </button>
        <button
          className={`btn ${showLookup ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setShowLookup(true)}
        >
          <Search size={16} />
          متابعة حالة
        </button>
      </div>

      {/* Lookup Mode */}
      {showLookup && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>متابعة حالة التسجيل</div>
          <div className="form-group">
            <label className="form-label">ادخل رمز الاسرة</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                value={lookupToken}
                onChange={e => setLookupToken(e.target.value)}
                placeholder="ATQ-XXXX-XXXX"
                style={{ flex: 1, fontFamily: 'monospace' }}
              />
              <button className="btn btn-primary" onClick={handleLookup}>بحث</button>
            </div>
          </div>
          {lookupError && (
            <div style={{ color: 'var(--color-red)', fontSize: '0.85rem', marginTop: 8 }}>{lookupError}</div>
          )}
          {lookupResult && (
            <div style={{ marginTop: 16, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem' }}>
                <div><span style={{ color: 'var(--color-text-muted)' }}>الاسم:</span> <strong>{lookupResult.name}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>عدد الافراد:</span> <strong>{lookupResult.family_size}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>المنطقة:</span> <strong>{lookupResult.zone}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>تاريخ التسجيل:</span> <strong>{new Date(lookupResult.registered_at).toLocaleDateString('ar')}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>احتياجات مفتوحة:</span> <strong>{lookupResult.open_needs}</strong></div>
                <div>
                  <span style={{ color: 'var(--color-text-muted)' }}>آخر توزيع:</span>{' '}
                  <strong>{lookupResult.last_distribution ? new Date(lookupResult.last_distribution).toLocaleDateString('ar') : 'لم يتم بعد'}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Registration Form */}
      {!showLookup && (
        <>
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className={`step-dot ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`} />
            <div className={`step-dot ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}`} />
            <div className={`step-dot ${step >= 3 ? 'active' : ''}`} />
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>معلومات الاسرة</div>

              <div className="form-group">
                <label className="form-label">اسم رب الاسرة *</label>
                <input
                  type="text"
                  className="form-input"
                  value={headName}
                  onChange={e => setHeadName(e.target.value)}
                  placeholder="الاسم الكامل"
                />
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف</label>
                <input
                  type="tel"
                  className="form-input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="اختياري"
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label className="form-label">عدد افراد الاسرة *</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="30"
                  value={familySize}
                  onChange={e => setFamilySize(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">المنطقة *</label>
                <select className="form-input" value={zoneId} onChange={e => setZoneId(e.target.value)}>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              {shelters.length > 0 && (
                <div className="form-group">
                  <label className="form-label">المركز / المأوى</label>
                  <select className="form-input" value={shelterId} onChange={e => setShelterId(e.target.value)}>
                    <option value="">-- اختياري --</option>
                    {shelters.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">حالة النزوح</label>
                <select className="form-input" value={displacement} onChange={e => setDisplacement(e.target.value as any)}>
                  <option value={DisplacementStatus.DISPLACED}>نازح</option>
                  <option value={DisplacementStatus.RETURNEE}>عائد</option>
                  <option value={DisplacementStatus.HOST}>مضيف</option>
                  <option value={DisplacementStatus.OTHER}>اخرى</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">عوامل الهشاشة</label>
                <div className="tag-group">
                  {VULNERABILITY_OPTIONS.map(opt => (
                    <label key={opt.key}>
                      <input
                        type="checkbox"
                        className="tag-checkbox"
                        checked={vulnFlags.includes(opt.key)}
                        onChange={() => toggleFlag(opt.key)}
                      />
                      <span className="tag-label">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات</label>
                <textarea
                  className="form-input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="اي معلومات اضافية"
                />
              </div>

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => {
                if (!headName.trim()) { alert('يرجى ادخال اسم رب الاسرة'); return; }
                setStep(2);
              }}>
                <span>التالي</span>
                <ChevronLeft size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Members */}
          {step === 2 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>افراد الاسرة (اختياري)</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                اضف تفاصيل افراد الاسرة لتحديد الاحتياجات بشكل ادق
              </p>

              {members.map((m, i) => (
                <div key={i} style={{
                  padding: 12,
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 10,
                  position: 'relative',
                }}>
                  <button
                    onClick={() => removeMember(i)}
                    style={{
                      position: 'absolute', top: 8, left: 8,
                      background: 'none', border: 'none', color: 'var(--color-red)',
                      cursor: 'pointer', fontSize: '1.1rem', padding: 4,
                    }}
                  >x</button>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 8 }}>فرد {i + 1}</div>
                  <div className="form-group">
                    <label className="form-label">الفئة العمرية</label>
                    <select className="form-input" value={m.age_band} onChange={e => {
                      const updated = [...members];
                      updated[i] = { ...m, age_band: e.target.value };
                      setMembers(updated);
                    }}>
                      <option value={AgeBand.INFANT}>رضيع (0-2)</option>
                      <option value={AgeBand.CHILD}>طفل (3-12)</option>
                      <option value={AgeBand.TEEN}>مراهق (13-17)</option>
                      <option value={AgeBand.ADULT}>بالغ (18-59)</option>
                      <option value={AgeBand.ELDERLY}>مسن (60+)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">الجنس</label>
                    <select className="form-input" value={m.sex} onChange={e => {
                      const updated = [...members];
                      updated[i] = { ...m, sex: e.target.value };
                      setMembers(updated);
                    }}>
                      <option value="">لم يحدد</option>
                      <option value="male">ذكر</option>
                      <option value="female">انثى</option>
                    </select>
                  </div>
                </div>
              ))}

              <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={addMember}>
                + اضافة فرد
              </button>

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  <ChevronRight size={18} />
                  رجوع
                </button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>
                  <span>التالي</span>
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Needs */}
          {step === 3 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>الاحتياجات</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                حدد ما تحتاجه اسرتك حاليا
              </p>

              {needs.map((n, i) => (
                <div key={i} style={{
                  padding: 12,
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 10,
                  position: 'relative',
                }}>
                  <button
                    onClick={() => removeNeed(i)}
                    style={{
                      position: 'absolute', top: 8, left: 8,
                      background: 'none', border: 'none', color: 'var(--color-red)',
                      cursor: 'pointer', fontSize: '1.1rem', padding: 4,
                    }}
                  >x</button>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 8 }}>احتياج {i + 1}</div>
                  <div className="form-group">
                    <label className="form-label">الفئة</label>
                    <select className="form-input" value={n.category} onChange={e => {
                      const updated = [...needs];
                      updated[i] = { ...n, category: e.target.value };
                      setNeeds(updated);
                    }}>
                      <option value={NeedCategory.FOOD}>طعام</option>
                      <option value={NeedCategory.WATER}>مياه</option>
                      <option value={NeedCategory.HYGIENE}>نظافة</option>
                      <option value={NeedCategory.MEDICINE}>ادوية</option>
                      <option value={NeedCategory.SHELTER}>ماوى</option>
                      <option value={NeedCategory.CLOTHING}>ملابس</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">الكمية</label>
                    <input type="number" className="form-input" min="1" value={n.quantity} onChange={e => {
                      const updated = [...needs];
                      updated[i] = { ...n, quantity: parseInt(e.target.value) || 1 };
                      setNeeds(updated);
                    }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">مدى الحاجة</label>
                    <select className="form-input" value={n.urgency} onChange={e => {
                      const updated = [...needs];
                      updated[i] = { ...n, urgency: e.target.value };
                      setNeeds(updated);
                    }}>
                      <option value={Urgency.LOW}>عادي</option>
                      <option value={Urgency.MEDIUM}>متوسط</option>
                      <option value={Urgency.HIGH}>عاجل</option>
                      <option value={Urgency.CRITICAL}>طارئ جدا</option>
                    </select>
                  </div>
                </div>
              ))}

              <button className="btn btn-secondary" style={{ marginBottom: 16 }} onClick={addNeed}>
                + اضافة احتياج
              </button>

              <div className="form-actions">
                <button className="btn btn-secondary" onClick={() => setStep(2)}>
                  <ChevronRight size={18} />
                  رجوع
                </button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'جاري التسجيل...' : 'تسجيل الاسرة'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Back to login link */}
      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', color: 'var(--color-text-muted)',
            fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          دخول كعامل ميداني
        </button>
      </div>
    </div>
  );
}

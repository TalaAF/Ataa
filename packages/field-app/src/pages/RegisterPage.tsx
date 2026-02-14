// ===== Field App - Register Household Page =====
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import {
  DisplacementStatus, AgeBand, NeedCategory, Urgency,
  Household, HouseholdMember, Need,
} from '@ataa/shared';
import { saveHousehold, saveHouseholdMember, saveNeed } from '../db/offlineDb';

const VULNERABILITY_OPTIONS = [
  { key: 'pregnant', label: 'حامل' },
  { key: 'disabled', label: 'ذوي إعاقة' },
  { key: 'chronic_illness', label: 'مرض مزمن' },
  { key: 'elderly_alone', label: 'مسن وحيد' },
  { key: 'orphans', label: 'أيتام' },
  { key: 'female_headed', label: 'ترأسها امرأة' },
  { key: 'large_family', label: 'أسرة كبيرة' },
];

const VULNERABILITY_WEIGHTS: Record<string, number> = {
  pregnant: 3, disabled: 4, chronic_illness: 3, elderly_alone: 4,
  orphans: 5, female_headed: 2, large_family: 2,
};

function calcPriority(flags: string[], familySize: number): number {
  let score = 0;
  for (const f of flags) score += VULNERABILITY_WEIGHTS[f] || 1;
  if (familySize > 6) score += 3;
  else if (familySize > 4) score += 2;
  else if (familySize > 2) score += 1;
  return Math.min(score, 30);
}

export default function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [headName, setHeadName] = useState('');
  const [familySize, setFamilySize] = useState(1);
  const [displacement, setDisplacement] = useState(DisplacementStatus.DISPLACED);
  const [vulnFlags, setVulnFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const [members, setMembers] = useState<{ age_band: string; sex: string }[]>([]);
  const [needs, setNeeds] = useState<{ category: string; quantity: number; urgency: string }[]>([]);

  const toggleFlag = (key: string) => {
    setVulnFlags(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
  };

  const addMember = () => setMembers([...members, { age_band: AgeBand.ADULT, sex: '' }]);
  const addNeed = () => setNeeds([...needs, { category: NeedCategory.FOOD, quantity: 1, urgency: Urgency.MEDIUM }]);

  const handleSubmit = async () => {
    try {
      const householdId = uuidv4();
      const token = `HH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const timestamp = new Date().toISOString();

      const hh: Household = {
        id: householdId,
        token,
        zone_id: user?.zone_id || '',
        shelter_id: user?.shelter_id,
        head_of_household_name: headName || undefined,
        family_size: familySize,
        displacement_status: displacement,
        vulnerability_flags: vulnFlags,
        priority_score: calcPriority(vulnFlags, familySize),
        notes: notes || undefined,
        created_by: user?.id || '',
        created_at: timestamp,
        updated_at: timestamp,
        sync_status: 'pending' as any,
      };

      await saveHousehold(hh);

      for (const m of members) {
        const mem: HouseholdMember = {
          id: uuidv4(),
          household_id: householdId,
          age_band: m.age_band as any,
          sex: (m.sex || undefined) as 'male' | 'female' | undefined,
          special_needs_flags: [],
          created_at: timestamp,
          updated_at: timestamp,
          sync_status: 'pending' as any,
        };
        await saveHouseholdMember(mem);
      }

      for (const n of needs) {
        const need: Need = {
          id: uuidv4(),
          household_id: householdId,
          category: n.category as any,
          quantity: n.quantity,
          urgency: n.urgency as any,
          status: 'open' as any,
          created_by: user?.id || '',
          created_at: timestamp,
          updated_at: timestamp,
          sync_status: 'pending' as any,
        };
        await saveNeed(need);
      }

      alert(`تم تسجيل الاسرة بنجاح\nرمز الاسرة: ${token}`);
      navigate('/');
    } catch (error) {
      console.error('Error saving household:', error);
      alert('حدث خطأ اثناء التسجيل');
    }
  };

  return (
    <div>
      <h1 className="page-title">تسجيل اسرة جديدة</h1>

      {/* Step Indicator */}
      <div className="step-indicator">
        <div className={`step-dot ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`} />
        <div className={`step-dot ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}`} />
        <div className={`step-dot ${step >= 3 ? 'active' : ''}`} />
      </div>

      {/* Step 1: Household Info */}
      {step === 1 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>معلومات الاسرة</div>

          <div className="form-group">
            <label className="form-label">اسم رب الاسرة</label>
            <input
              type="text"
              className="form-input"
              value={headName}
              onChange={e => setHeadName(e.target.value)}
              placeholder="اختياري"
            />
          </div>

          <div className="form-group">
            <label className="form-label">عدد افراد الاسرة</label>
            <input
              type="number"
              className="form-input"
              min="1"
              value={familySize}
              onChange={e => setFamilySize(parseInt(e.target.value) || 1)}
            />
          </div>

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
            />
          </div>

          <button className="btn btn-primary" onClick={() => setStep(2)}>
            التالي
          </button>
        </div>
      )}

      {/* Step 2: Members */}
      {step === 2 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>افراد الاسرة</div>

          {members.map((m, i) => (
            <div key={i} style={{ padding: 12, border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)', marginBottom: 10 }}>
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

          <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={addMember}>
            + اضافة فرد
          </button>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>رجوع</button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>التالي</button>
          </div>
        </div>
      )}

      {/* Step 3: Needs */}
      {step === 3 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>الاحتياجات</div>

          {needs.map((n, i) => (
            <div key={i} style={{ padding: 12, border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)', marginBottom: 10 }}>
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
                <label className="form-label">الاستعجال</label>
                <select className="form-input" value={n.urgency} onChange={e => {
                  const updated = [...needs];
                  updated[i] = { ...n, urgency: e.target.value };
                  setNeeds(updated);
                }}>
                  <option value={Urgency.LOW}>منخفض</option>
                  <option value={Urgency.MEDIUM}>متوسط</option>
                  <option value={Urgency.HIGH}>عالي</option>
                  <option value={Urgency.CRITICAL}>حرج</option>
                </select>
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={addNeed}>
            + اضافة احتياج
          </button>

          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setStep(2)}>رجوع</button>
            <button className="btn btn-primary" onClick={handleSubmit}>تسجيل الاسرة</button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Household, 
  HouseholdMember, 
  Need,
  DisplacementStatus,
  AgeBand,
  NeedCategory,
  Urgency,
} from '@ataa/shared';
import { saveHousehold, saveHouseholdMember, saveNeed } from '../db/offlineDb';
import { LABELS } from '@ataa/shared';

interface Props {
  onComplete: () => void;
  zoneId: string;
  shelterId?: string;
  userId: string;
}

export function HouseholdRegistration({ onComplete, zoneId, shelterId, userId }: Props) {
  const [step, setStep] = useState(1);
  const [household, setHousehold] = useState<Partial<Household>>({
    zone_id: zoneId,
    shelter_id: shelterId,
    family_size: 1,
    displacement_status: DisplacementStatus.DISPLACED,
    vulnerability_flags: [],
    priority_score: 0,
  });

  const [members, setMembers] = useState<Partial<HouseholdMember>[]>([]);
  const [needs, setNeeds] = useState<Partial<Need>[]>([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    // Generate unique token
    setToken(`HH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`);
  }, []);

  const addMember = () => {
    setMembers([...members, { 
      age_band: AgeBand.ADULT, 
      special_needs_flags: [] 
    }]);
  };

  const updateMember = (index: number, field: string, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const addNeed = () => {
    setNeeds([...needs, {
      category: NeedCategory.FOOD,
      quantity: 1,
      urgency: Urgency.MEDIUM,
    }]);
  };

  const updateNeed = (index: number, field: string, value: any) => {
    const updated = [...needs];
    updated[index] = { ...updated[index], [field]: value };
    setNeeds(updated);
  };

  const handleSubmit = async () => {
    try {
      const householdId = uuidv4();
      const timestamp = new Date().toISOString();

      // Save household
      const completeHousehold: Household = {
        id: householdId,
        token,
        zone_id: household.zone_id!,
        shelter_id: household.shelter_id,
        head_of_household_name: household.head_of_household_name,
        family_size: household.family_size!,
        displacement_status: household.displacement_status!,
        vulnerability_flags: household.vulnerability_flags!,
        priority_score: calculatePriorityScore(),
        notes: household.notes,
        created_by: userId,
        created_at: timestamp,
        updated_at: timestamp,
        sync_status: 'pending' as any,
      };

      await saveHousehold(completeHousehold);

      // Save members
      for (const member of members) {
        const completeMember: HouseholdMember = {
          id: uuidv4(),
          household_id: householdId,
          age_band: member.age_band!,
          sex: member.sex,
          special_needs_flags: member.special_needs_flags!,
          created_at: timestamp,
          updated_at: timestamp,
          sync_status: 'pending' as any,
        };
        await saveHouseholdMember(completeMember);
      }

      // Save needs
      for (const need of needs) {
        const completeNeed: Need = {
          id: uuidv4(),
          household_id: householdId,
          category: need.category!,
          description: need.description,
          quantity: need.quantity!,
          urgency: need.urgency!,
          status: 'open' as any,
          created_by: userId,
          created_at: timestamp,
          updated_at: timestamp,
          sync_status: 'pending' as any,
        };
        await saveNeed(completeNeed);
      }

      alert(`تم تسجيل الأسرة بنجاح\nرمز الأسرة: ${token}`);
      onComplete();
    } catch (error) {
      console.error('Error saving household:', error);
      alert('حدث خطأ أثناء التسجيل');
    }
  };

  const calculatePriorityScore = (): number => {
    let score = 0;
    const weights: Record<string, number> = {
      pregnant: 3,
      disabled: 4,
      chronic_illness: 3,
      elderly_alone: 4,
      orphans: 5,
      female_headed: 2,
      large_family: 2,
    };

    for (const flag of household.vulnerability_flags || []) {
      score += weights[flag] || 1;
    }

    if (household.family_size! > 6) score += 3;
    else if (household.family_size! > 4) score += 2;
    else if (household.family_size! > 2) score += 1;

    return Math.min(score, 30);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>{LABELS.household.title}</h2>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setStep(1)}
          style={{
            flex: 1,
            padding: '10px',
            background: step === 1 ? '#6B8E23' : '#e0e0e0',
            color: step === 1 ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          معلومات الأسرة
        </button>
        <button
          onClick={() => setStep(2)}
          style={{
            flex: 1,
            padding: '10px',
            background: step === 2 ? '#6B8E23' : '#e0e0e0',
            color: step === 2 ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          أفراد الأسرة
        </button>
        <button
          onClick={() => setStep(3)}
          style={{
            flex: 1,
            padding: '10px',
            background: step === 3 ? '#6B8E23' : '#e0e0e0',
            color: step === 3 ? 'white' : 'black',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          الاحتياجات
        </button>
      </div>

      {step === 1 && (
        <div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {LABELS.household.token}
            </label>
            <input
              type="text"
              value={token}
              readOnly
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                background: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {LABELS.household.headName}
            </label>
            <input
              type="text"
              value={household.head_of_household_name || ''}
              onChange={(e) =>
                setHousehold({ ...household, head_of_household_name: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {LABELS.household.familySize}
            </label>
            <input
              type="number"
              min="1"
              value={household.family_size}
              onChange={(e) =>
                setHousehold({ ...household, family_size: parseInt(e.target.value) })
              }
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {LABELS.household.displacement}
            </label>
            <select
              value={household.displacement_status}
              onChange={(e) =>
                setHousehold({ ...household, displacement_status: e.target.value as any })
              }
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <option value={DisplacementStatus.DISPLACED}>{LABELS.displacement.displaced}</option>
              <option value={DisplacementStatus.RETURNEE}>{LABELS.displacement.returnee}</option>
              <option value={DisplacementStatus.HOST}>{LABELS.displacement.host}</option>
              <option value={DisplacementStatus.OTHER}>{LABELS.displacement.other}</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              {LABELS.household.notes}
            </label>
            <textarea
              value={household.notes || ''}
              onChange={(e) => setHousehold({ ...household, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
          </div>

          <button
            onClick={() => setStep(2)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#6B8E23',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            {LABELS.common.next}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          {members.map((member, index) => (
            <div
              key={index}
              style={{
                marginBottom: '15px',
                padding: '15px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <h4>فرد {index + 1}</h4>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  {LABELS.member.ageBand}
                </label>
                <select
                  value={member.age_band}
                  onChange={(e) => updateMember(index, 'age_band', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                >
                  <option value={AgeBand.INFANT}>رضيع (0-2)</option>
                  <option value={AgeBand.CHILD}>طفل (3-12)</option>
                  <option value={AgeBand.TEEN}>مراهق (13-17)</option>
                  <option value={AgeBand.ADULT}>بالغ (18-59)</option>
                  <option value={AgeBand.ELDERLY}>مسن (60+)</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  {LABELS.member.sex}
                </label>
                <select
                  value={member.sex || ''}
                  onChange={(e) => updateMember(index, 'sex', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">لم يحدد</option>
                  <option value="male">{LABELS.member.male}</option>
                  <option value="female">{LABELS.member.female}</option>
                </select>
              </div>
            </div>
          ))}

          <button
            onClick={addMember}
            style={{
              width: '100%',
              padding: '10px',
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginBottom: '15px',
              cursor: 'pointer',
            }}
          >
            + {LABELS.household.addMember}
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setStep(1)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {LABELS.common.back}
            </button>
            <button
              onClick={() => setStep(3)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#6B8E23',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {LABELS.common.next}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          {needs.map((need, index) => (
            <div
              key={index}
              style={{
                marginBottom: '15px',
                padding: '15px',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <h4>احتياج {index + 1}</h4>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  {LABELS.need.category}
                </label>
                <select
                  value={need.category}
                  onChange={(e) => updateNeed(index, 'category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                >
                  <option value={NeedCategory.FOOD}>طعام</option>
                  <option value={NeedCategory.WATER}>مياه</option>
                  <option value={NeedCategory.HYGIENE}>نظافة</option>
                  <option value={NeedCategory.MEDICINE}>أدوية</option>
                  <option value={NeedCategory.SHELTER}>مأوى</option>
                  <option value={NeedCategory.CLOTHING}>ملابس</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  {LABELS.need.quantity}
                </label>
                <input
                  type="number"
                  min="1"
                  value={need.quantity}
                  onChange={(e) => updateNeed(index, 'quantity', parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>
                  {LABELS.need.urgency}
                </label>
                <select
                  value={need.urgency}
                  onChange={(e) => updateNeed(index, 'urgency', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                >
                  <option value={Urgency.LOW}>{LABELS.urgency.low}</option>
                  <option value={Urgency.MEDIUM}>{LABELS.urgency.medium}</option>
                  <option value={Urgency.HIGH}>{LABELS.urgency.high}</option>
                  <option value={Urgency.CRITICAL}>{LABELS.urgency.critical}</option>
                </select>
              </div>
            </div>
          ))}

          <button
            onClick={addNeed}
            style={{
              width: '100%',
              padding: '10px',
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px',
              marginBottom: '15px',
              cursor: 'pointer',
            }}
          >
            + إضافة احتياج
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setStep(2)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#e0e0e0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {LABELS.common.back}
            </button>
            <button
              onClick={handleSubmit}
              style={{
                flex: 1,
                padding: '12px',
                background: '#6B8E23',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {LABELS.common.submit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

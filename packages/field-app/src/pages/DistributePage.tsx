// ===== Field App - Record Distribution Page =====
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { NeedCategory, Distribution } from '@ataa/shared';
import { saveDistribution, getHouseholdByToken } from '../db/offlineDb';

export default function DistributePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [householdToken, setHouseholdToken] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [householdId, setHouseholdId] = useState('');
  const [items, setItems] = useState<{ category: string; item_name: string; quantity: number }[]>([]);

  const lookupHousehold = async () => {
    if (!householdToken.trim()) return;
    const hh = await getHouseholdByToken(householdToken.trim());
    if (hh) {
      setHouseholdId(hh.id);
      setHouseholdName(hh.head_of_household_name || hh.token);
    } else {
      alert('لم يتم العثور على الاسرة');
      setHouseholdId('');
      setHouseholdName('');
    }
  };

  const addItem = () => {
    setItems([...items, { category: NeedCategory.FOOD, item_name: '', quantity: 1 }]);
  };

  const handleSubmit = async () => {
    if (!householdId) {
      alert('يرجى البحث عن اسرة اولا');
      return;
    }
    if (items.length === 0) {
      alert('يرجى اضافة عنصر واحد على الاقل');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const dist: Distribution = {
        id: uuidv4(),
        household_id: householdId,
        location_id: user?.shelter_id || user?.zone_id || '',
        items: items as any,
        distributed_by: user?.id || '',
        status: 'completed' as any,
        distributed_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        sync_status: 'pending' as any,
      };

      await saveDistribution(dist);
      alert('تم تسجيل التوزيع بنجاح');
      navigate('/');
    } catch (error) {
      console.error('Error saving distribution:', error);
      alert('حدث خطأ اثناء تسجيل التوزيع');
    }
  };

  return (
    <div>
      <h1 className="page-title">تسجيل توزيع</h1>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>بحث عن اسرة</div>

        <div className="form-group">
          <label className="form-label">رمز الاسرة</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="form-input"
              value={householdToken}
              onChange={e => setHouseholdToken(e.target.value)}
              placeholder="HH-..."
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={lookupHousehold}>
              بحث
            </button>
          </div>
        </div>

        {householdName && (
          <div style={{ padding: 12, background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            الاسرة: <strong>{householdName}</strong>
          </div>
        )}
      </div>

      {householdId && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>المواد الموزعة</div>

          {items.map((item, i) => (
            <div key={i} style={{ padding: 12, border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-md)', marginBottom: 10 }}>
              <div className="form-group">
                <label className="form-label">الفئة</label>
                <select className="form-input" value={item.category} onChange={e => {
                  const updated = [...items];
                  updated[i] = { ...item, category: e.target.value };
                  setItems(updated);
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
                <label className="form-label">اسم الصنف</label>
                <input type="text" className="form-input" value={item.item_name} onChange={e => {
                  const updated = [...items];
                  updated[i] = { ...item, item_name: e.target.value };
                  setItems(updated);
                }} placeholder="مثل: ارز، بطانية..." />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">الكمية</label>
                <input type="number" className="form-input" min="1" value={item.quantity} onChange={e => {
                  const updated = [...items];
                  updated[i] = { ...item, quantity: parseInt(e.target.value) || 1 };
                  setItems(updated);
                }} />
              </div>
            </div>
          ))}

          <button className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={addItem}>
            + اضافة صنف
          </button>

          <button className="btn btn-primary" onClick={handleSubmit}>
            تسجيل التوزيع
          </button>
        </div>
      )}
    </div>
  );
}

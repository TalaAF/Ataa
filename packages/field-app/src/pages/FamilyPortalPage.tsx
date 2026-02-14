// ===== Field App - Family Portal Page =====
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useFamilyAuth } from '../context/FamilyAuthContext';

export default function FamilyPortalPage() {
  const { household } = useFamilyAuth();
  const [profile, setProfile] = useState<any>(household);
  const [needs, setNeeds] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, needsRes, distRes] = await Promise.all([
          api.getFamilyPortal(),
          api.getFamilyNeeds(),
          api.getFamilyDistributions(),
        ]);
        setProfile(profileRes.data);
        setNeeds(needsRes.data || []);
        setDistributions(distRes.data || []);
      } catch {
        // Ignore load errors for now
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">مرحبا بك</h1>

      <div className="card">
        <div className="card-title">معلومات الاسرة</div>
        <div style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
          <div>الاسم: {profile?.head_of_household_name || 'غير محدد'}</div>
          <div>رمز الاسرة: <strong style={{ fontFamily: 'monospace' }}>{profile?.token}</strong></div>
          <div>عدد الافراد: {profile?.family_size}</div>
          <div>المنطقة: {profile?.zone_name || profile?.zone_id}</div>
          {profile?.shelter_name && <div>المركز: {profile?.shelter_name}</div>}
          {profile?.area_description && <div>الوصف المكاني: {profile?.area_description}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-title">الاحتياجات الحالية</div>
        {needs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">لا توجد احتياجات مسجلة</div>
          </div>
        ) : (
          needs.map((n) => (
            <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ fontWeight: 600 }}>{n.category}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                الكمية: {n.quantity} | الاولوية: {n.urgency} | الحالة: {n.status}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-title">التوزيعات</div>
        {distributions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">لا توجد توزيعات بعد</div>
          </div>
        ) : (
          distributions.map((d) => (
            <div key={d.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ fontWeight: 600 }}>{new Date(d.created_at).toLocaleDateString('ar')}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                {Array.isArray(d.items) ? d.items.length : 0} عنصر | الحالة: {d.status}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

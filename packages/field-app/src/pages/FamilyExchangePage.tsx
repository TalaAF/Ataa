// ===== Field App - Family Exchange Page =====
import { useEffect, useState } from 'react';
import { NeedCategory } from '@ataa/shared';
import { api } from '../api/client';

export default function FamilyExchangePage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [offerForm, setOfferForm] = useState({ category: NeedCategory.FOOD, description: '', quantity: 1 });
  const [requestForm, setRequestForm] = useState({ category: NeedCategory.FOOD, description: '', quantity: 1 });

  const loadData = async () => {
    setLoading(true);
    try {
      const [offersRes, requestsRes, matchesRes] = await Promise.all([
        api.getFamilyOffers(),
        api.getFamilyRequests(),
        api.getFamilyMatches(),
      ]);
      setOffers(offersRes.data || []);
      setRequests(requestsRes.data || []);
      setMatches(matchesRes.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const submitOffer = async () => {
    try {
      await api.createFamilyOffer(offerForm);
      setOfferForm({ category: NeedCategory.FOOD, description: '', quantity: 1 });
      loadData();
    } catch (err: any) {
      alert(err.message || 'تعذر إنشاء العرض');
    }
  };

  const submitRequest = async () => {
    try {
      await api.createFamilyRequest(requestForm);
      setRequestForm({ category: NeedCategory.FOOD, description: '', quantity: 1 });
      loadData();
    } catch (err: any) {
      alert(err.message || 'تعذر إنشاء الطلب');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">التبادل</h1>

      <div className="card">
        <div className="card-title">انشاء عرض</div>
        <div className="form-group">
          <label className="form-label">الفئة</label>
          <select
            className="form-input"
            value={offerForm.category}
            onChange={e => setOfferForm({ ...offerForm, category: e.target.value as any })}
          >
            {Object.values(NeedCategory).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">الوصف</label>
          <input
            type="text"
            className="form-input"
            value={offerForm.description}
            onChange={e => setOfferForm({ ...offerForm, description: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">الكمية</label>
          <input
            type="number"
            className="form-input"
            min="1"
            value={offerForm.quantity}
            onChange={e => setOfferForm({ ...offerForm, quantity: parseInt(e.target.value) || 1 })}
          />
        </div>
        <button className="btn btn-primary" onClick={submitOffer}>ارسال العرض</button>
      </div>

      <div className="card">
        <div className="card-title">انشاء طلب</div>
        <div className="form-group">
          <label className="form-label">الفئة</label>
          <select
            className="form-input"
            value={requestForm.category}
            onChange={e => setRequestForm({ ...requestForm, category: e.target.value as any })}
          >
            {Object.values(NeedCategory).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">الوصف</label>
          <input
            type="text"
            className="form-input"
            value={requestForm.description}
            onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">الكمية</label>
          <input
            type="number"
            className="form-input"
            min="1"
            value={requestForm.quantity}
            onChange={e => setRequestForm({ ...requestForm, quantity: parseInt(e.target.value) || 1 })}
          />
        </div>
        <button className="btn btn-primary" onClick={submitRequest}>ارسال الطلب</button>
      </div>

      <div className="card">
        <div className="card-title">عروضي</div>
        {offers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">لا توجد عروض</div>
          </div>
        ) : (
          offers.map((o) => (
            <div key={o.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ fontWeight: 600 }}>{o.category}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                الكمية: {o.quantity} | الحالة: {o.status}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-title">طلباتي</div>
        {requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">لا توجد طلبات</div>
          </div>
        ) : (
          requests.map((r) => (
            <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ fontWeight: 600 }}>{r.category}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                الكمية: {r.quantity} | الحالة: {r.status}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-title">المطابقات</div>
        {matches.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-text">لا توجد مطابقات</div>
          </div>
        ) : (
          matches.map((m) => (
            <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <div style={{ fontWeight: 600 }}>{m.offer_category || m.request_category}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                الحالة: {m.status} | نقطة الاستلام: {m.pickup_point_name || 'غير محدد'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

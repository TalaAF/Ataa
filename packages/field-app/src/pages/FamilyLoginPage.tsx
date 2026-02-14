// ===== Field App - Family Login Page =====
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamilyAuth } from '../context/FamilyAuthContext';

export default function FamilyLoginPage() {
  const { login } = useFamilyAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(token.trim());
      navigate('/family/portal');
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img src="/olive.png" alt="عطاء" className="login-logo" />
        <h1 className="login-title">بوابة الاسرة</h1>
        <p className="login-subtitle">ادخل رمز الاسرة للمتابعة</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">رمز الاسرة</label>
            <input
              type="text"
              className="form-input"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ATQ-XXXX-XXXX"
              required
              autoFocus
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'دخول البوابة'}
          </button>
        </form>

        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/self-register')}
          >
            تسجيل اسرة جديدة
          </button>
        </div>
      </div>
    </div>
  );
}

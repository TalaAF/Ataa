// ===== Field App - Login Page =====
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
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
        <h1 className="login-title">عطاء</h1>
        <p className="login-subtitle">تطبيق العاملين الميدانيين</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">اسم المستخدم</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">كلمة المرور</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        {/* Self-registration button for families */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{
            borderTop: '1px solid var(--color-border-light)',
            paddingTop: 20,
            marginBottom: 12,
            fontSize: '0.88rem',
            color: 'var(--color-text-muted)',
          }}>
            هل تريد تسجيل اسرتك للحصول على مساعدات؟
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%' }}
            onClick={() => navigate('/self-register')}
          >
            تسجيل اسرة جديدة
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => navigate('/family/login')}
          >
            بوابة الاسرة
          </button>
        </div>

        <div style={{
          marginTop: 16,
          padding: 12,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          textAlign: 'right',
        }}>
          <strong>حساب تجريبي:</strong><br/>
          عامل ميداني: field1 / field123
        </div>
      </div>
    </div>
  );
}

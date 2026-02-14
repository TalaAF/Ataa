// ===== عطاء - Login Page =====
import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
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
        <p className="login-subtitle">نظام توزيع المساعدات الإنسانية</p>

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
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{
          marginTop: 24,
          padding: 16,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          textAlign: 'right',
        }}>
          <strong>حسابات تجريبية:</strong><br/>
          مدير: admin / admin123<br/>
          عامل ميداني: field1 / field123<br/>
          متبرع: donor1 / donor123
        </div>
      </div>
    </div>
  );
}

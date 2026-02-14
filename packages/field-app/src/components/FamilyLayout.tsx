// ===== Field App - Family Layout =====
import { ReactNode, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Package, LogOut } from 'lucide-react';
import { useFamilyAuth } from '../context/FamilyAuthContext';

export default function FamilyLayout({ children }: { children: ReactNode }) {
  const { logout } = useFamilyAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  return (
    <div className="app-layout">
      {!isOnline && (
        <div className="offline-banner">
          غير متصل - البيانات محفوظة محليا
        </div>
      )}

      <header className="top-bar">
        <div className="top-bar-title">بوابة الاسرة</div>
        <div className="top-bar-status">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <button
            onClick={logout}
            title="تسجيل الخروج"
            style={{ background: 'none', border: 'none', color: 'white', padding: 4 }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="main-content">{children}</main>

      <nav className="bottom-nav">
        <NavLink to="/family/portal" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Home size={22} />
          البوابة
        </NavLink>
        <NavLink to="/family/exchange" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Package size={22} />
          التبادل
        </NavLink>
      </nav>
    </div>
  );
}

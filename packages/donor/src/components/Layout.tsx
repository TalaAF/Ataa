// ===== Donor Portal - Layout with Sidebar =====
import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, AlertTriangle, HeartHandshake, LogOut } from 'lucide-react';

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: <LayoutDashboard size={20} /> },
  { to: '/needs', label: 'الاحتياجات', icon: <AlertTriangle size={20} /> },
  { to: '/pledges', label: 'تعهداتي', icon: <HeartHandshake size={20} /> },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/olive.png" alt="عطاء" className="sidebar-logo" />
          <div>
            <div className="sidebar-title">عطاء</div>
            <div className="sidebar-subtitle">بوابة المتبرعين</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">القائمة</div>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              {user?.full_name?.charAt(0) || '?'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.full_name}</div>
              <div className="user-role">متبرع</div>
            </div>
            <button
              className="btn-icon"
              onClick={logout}
              title="تسجيل الخروج"
              style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

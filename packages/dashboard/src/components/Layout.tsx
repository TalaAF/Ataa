// ===== عطاء - Layout with Sidebar =====
import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LucideHeartHandshake } from 'lucide-react';
import {
  LayoutDashboard, Users, AlertTriangle, Package, Truck,
  Heart, ArrowLeftRight, RefreshCw, LogOut,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام',
  field_worker: 'عامل ميداني',
  donor: 'متبرع',
  auditor: 'مراجع',
  beneficiary: 'مستفيد',
};

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles?: string[];
}

const mainNav: NavItem[] = [
  { to: '/', label: 'لوحة التحكم', icon: <LayoutDashboard size={20} /> },
  { to: '/households', label: 'الأسر', icon: <Users size={20} /> },
  { to: '/needs', label: 'الاحتياجات', icon: <AlertTriangle size={20} /> },
  { to: '/inventory', label: 'المخزون', icon: <Package size={20} />, roles: ['admin'] },
  { to: '/distributions', label: 'التوزيع', icon: <Truck size={20} /> },
];

const communityNav: NavItem[] = [
  { to: '/offers', label: 'العروض', icon: <Heart size={20} /> },
  { to: '/requests', label: 'الطلبات', icon: <LucideHeartHandshake size={20} /> },
  { to: '/matches', label: 'المطابقات', icon: <ArrowLeftRight size={20} /> },
];

const systemNav: NavItem[] = [
  { to: '/sync', label: 'المزامنة', icon: <RefreshCw size={20} />, roles: ['admin'] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  const canSee = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/olive.png" alt="عطاء" className="sidebar-logo" />
          <div>
            <div className="sidebar-title">عطاء</div>
            <div className="sidebar-subtitle">نظام توزيع المساعدات</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">الرئيسية</div>
            {mainNav.filter(canSee).map(item => (
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

          <div className="nav-section">
            <div className="nav-section-title">تبادل مجتمعي</div>
            {communityNav.filter(canSee).map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>

          {systemNav.filter(canSee).length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">النظام</div>
              {systemNav.filter(canSee).map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">
              {user?.full_name?.charAt(0) || '?'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.full_name}</div>
              <div className="user-role">{ROLE_LABELS[user?.role || ''] || user?.role}</div>
            </div>
            <button
              className="btn-icon"
              onClick={logout}
              title="تسجيل الخروج"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

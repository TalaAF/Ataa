// ===== Field App - Mobile Layout with Bottom Nav =====
import { ReactNode, useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, UserPlus, Package, RefreshCw, LogOut } from 'lucide-react';
import { getPendingSyncCount } from '../db/offlineDb';
import { syncService } from '../services/syncService';

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    const updatePending = async () => {
      const count = await getPendingSyncCount();
      setPendingSync(count);
    };

    updatePending();
    const interval = setInterval(updatePending, 10000);
    syncService.autoSync();

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      clearInterval(interval);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline) return;
    const result = await syncService.sync();
    if (result.success) {
      const count = await getPendingSyncCount();
      setPendingSync(count);
    }
  };

  return (
    <div className="app-layout">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          غير متصل - البيانات محفوظة محليا
        </div>
      )}

      {/* Top Bar */}
      <header className="top-bar">
        <div className="top-bar-title">عطاء</div>
        <div className="top-bar-status">
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          {pendingSync > 0 && (
            <button className="sync-badge" onClick={handleSync} style={{ border: 'none', cursor: 'pointer' }}>
              {pendingSync} قيد المزامنة
            </button>
          )}
          <button
            onClick={logout}
            title="تسجيل الخروج"
            style={{ background: 'none', border: 'none', color: 'white', padding: 4 }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Home size={22} />
          الرئيسية
        </NavLink>
        <NavLink to="/register" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <UserPlus size={22} />
          تسجيل
        </NavLink>
        <NavLink to="/distribute" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Package size={22} />
          توزيع
        </NavLink>
        <NavLink to="/sync" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <RefreshCw size={22} />
          مزامنة
        </NavLink>
      </nav>
    </div>
  );
}

// ===== Field App - App =====
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useFamilyAuth } from './context/FamilyAuthContext';
import { initDB } from './db/offlineDb';
import Layout from './components/Layout';
import FamilyLayout from './components/FamilyLayout';
import LoginPage from './pages/LoginPage';
import FamilyLoginPage from './pages/FamilyLoginPage';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import DistributePage from './pages/DistributePage';
import SyncPage from './pages/SyncPage';
import SelfRegisterPage from './pages/SelfRegisterPage';
import FamilyPortalPage from './pages/FamilyPortalPage';
import FamilyExchangePage from './pages/FamilyExchangePage';

export default function App() {
  const { user, isLoading } = useAuth();
  const { household, isLoading: isFamilyLoading } = useFamilyAuth();
  const location = useLocation();
  const isFamilyRoute = location.pathname.startsWith('/family');

  useEffect(() => {
    initDB();
  }, []);

  // Public route: self-registration (no login required)
  if (location.pathname === '/self-register') {
    return (
      <Routes>
        <Route path="/self-register" element={<SelfRegisterPage />} />
      </Routes>
    );
  }

  if (isFamilyRoute) {
    if (isFamilyLoading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--color-text-muted)',
        }}>
          جاري التحميل...
        </div>
      );
    }

    if (!household) {
      return (
        <Routes>
          <Route path="/family/login" element={<FamilyLoginPage />} />
          <Route path="*" element={<Navigate to="/family/login" replace />} />
        </Routes>
      );
    }

    return (
      <FamilyLayout>
        <Routes>
          <Route path="/family" element={<Navigate to="/family/portal" replace />} />
          <Route path="/family/portal" element={<FamilyPortalPage />} />
          <Route path="/family/exchange" element={<FamilyExchangePage />} />
          <Route path="*" element={<Navigate to="/family/portal" replace />} />
        </Routes>
      </FamilyLayout>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: 'var(--color-text-muted)',
      }}>
        جاري التحميل...
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/distribute" element={<DistributePage />} />
        <Route path="/sync" element={<SyncPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

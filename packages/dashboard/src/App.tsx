// ===== عطاء - Main App =====
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import HouseholdsPage from './pages/HouseholdsPage';
import HouseholdDetailPage from './pages/HouseholdDetailPage';
import NeedsPage from './pages/NeedsPage';
import InventoryPage from './pages/InventoryPage';
import DistributionsPage from './pages/DistributionsPage';
import OffersPage from './pages/OffersPage';
import RequestsPage from './pages/RequestsPage';
import MatchesPage from './pages/MatchesPage';
import SyncPage from './pages/SyncPage';
import DonorDashboard from './pages/DonorDashboard';

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-text-muted)',
      }}>
        جاري التحميل...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (user.role === 'donor') {
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<DonorDashboard />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/households" element={<HouseholdsPage />} />
        <Route path="/households/:id" element={<HouseholdDetailPage />} />
        <Route path="/needs" element={<NeedsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/distributions" element={<DistributionsPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/sync" element={<SyncPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

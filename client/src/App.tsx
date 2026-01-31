import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ROUTES } from './utils/constants';

function AppContent() {
  const { getCurrentUser, isAuthenticated } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== ROUTES.LOGIN && location.pathname !== ROUTES.REGISTER) {
      getCurrentUser();
    }
  }, [location.pathname]);

  return (
    <Routes>
      <Route
        path={ROUTES.LOGIN}
        element={isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <LoginPage />}
      />
      <Route
        path={ROUTES.REGISTER}
        element={isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <RegisterPage />}
      />
      <Route
        path={ROUTES.DASHBOARD}
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/dashboard/Dashboard';
import MemberList from './pages/members/MemberList';
import MemberForm from './pages/members/MemberForm';
import MemberDetail from './pages/members/MemberDetail';
import ReservationList from './pages/reservations/ReservationList';
import PassList from './pages/passes/PassList';
import SalesPage from './pages/sales/SalesPage';
import ExpensePage from './pages/expenses/ExpensePage';
import OperationsPage from './pages/operations/OperationsPage';
import SchedulePage from './pages/schedule/SchedulePage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="members" element={<MemberList />} />
        <Route path="members/new" element={<MemberForm />} />
        <Route path="members/:id" element={<MemberDetail />} />
        <Route path="members/:id/edit" element={<MemberForm />} />
        <Route path="reservations" element={<ReservationList />} />
        <Route path="passes" element={<PassList />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="expenses" element={<ExpensePage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import TopNav from './TopNav';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';

const AUTO_LOGOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function MainLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, AUTO_LOGOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'] as const;
    events.forEach(evt => window.addEventListener(evt, resetTimer));
    resetTimer();

    return () => {
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <TopNav />
      <div className="px-[60px] py-12">
        <main className="max-w-[1200px] mx-auto">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}

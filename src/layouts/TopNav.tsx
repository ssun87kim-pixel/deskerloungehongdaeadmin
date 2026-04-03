import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../utils/helpers';

const navItems = [
  { to: '/', label: '대시보드' },
  { to: '/members', label: '멤버' },
  { to: '/reservations', label: '예약' },
  { to: '/passes', label: '이용권' },
  { to: '/sales', label: '매출' },
  { to: '/operations', label: '운영' },
  { to: '/expenses', label: '지출' },
  { to: '/schedule', label: '스케줄' },
  { to: '/reports', label: '보고서' },
  { to: '/settings', label: '설정' },
];

export default function TopNav() {
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200/60">
      <div className="px-[60px]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between h-16">
          {/* Logo + Nav */}
          <div className="flex items-center gap-12">
            <NavLink to="/" className="flex-shrink-0">
              <img
                src="/logo-black.png"
                alt="DESKER LOUNGE"
                className="h-5"
              />
            </NavLink>

            <nav>
              <ul className="flex items-center gap-[20px]">
                {navItems.map(({ to, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `relative block py-5 text-[17px] transition-colors ${
                          isActive
                            ? 'text-zinc-900 font-bold'
                            : 'text-zinc-400 hover:text-zinc-700 font-medium'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {label}
                          {isActive && (
                            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#FF4D00] rounded-full" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* User info */}
          <div className="flex items-center gap-5">
            {user && (
              <span className="text-[13px] text-zinc-400">
                {user.name}
                <span className="text-zinc-300 ml-1.5">/ {getRoleLabel(user.role)}</span>
              </span>
            )}
            <button
              onClick={logout}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-300 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              title="로그아웃"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

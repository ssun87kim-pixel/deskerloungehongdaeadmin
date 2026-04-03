import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarDays, Ticket,
  TrendingUp, Wrench, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../utils/helpers';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/members', icon: Users, label: '멤버 관리' },
  { to: '/reservations', icon: CalendarDays, label: '예약 관리' },
  { to: '/passes', icon: Ticket, label: '이용권 관리' },
  { to: '/sales', icon: TrendingUp, label: '매출 관리' },
  { to: '/operations', icon: Wrench, label: '운영 관리' },
  { to: '/settings', icon: Settings, label: '설정' },
];

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-black text-white flex flex-col z-50">
      {/* Logo */}
      <div className="px-7 py-7 border-b border-white/[0.08]">
        <img src="/logo-white.png" alt="DESKER LOUNGE" className="h-[18px] opacity-90" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-[2px] overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-[13.5px] tracking-[-0.01em] ${
                isActive
                  ? 'bg-white text-black font-bold shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/[0.06] font-medium'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-white/[0.08] px-5 py-5">
        {user && (
          <div className="mb-3">
            <p className="text-[13px] font-bold text-white tracking-tight">{user.name}</p>
            <p className="text-[11px] text-white/30 mt-0.5 tracking-tight">{getRoleLabel(user.role)}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.04] transition-all text-[12px] tracking-tight"
        >
          <LogOut size={15} className="shrink-0" />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}

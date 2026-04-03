import type { UserRole, Member, Reservation } from '../types';

export function maskPhone(phone: string, role: UserRole): string {
  if (role === 'super_admin' || role === 'manager') return phone;
  return phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3');
}

export function maskEmail(email: string, role: UserRole): string {
  if (role === 'super_admin' || role === 'manager') return email;
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}. ${m}. ${day}. (${days[d.getDay()]})`;
}

export function formatTime(time: string | null): string {
  if (!time) return '-';
  return time;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    checked_in: 'bg-blue-50 text-blue-700',
    checked_out: 'bg-zinc-50 text-zinc-600',
    cancelled: 'bg-red-50 text-red-700',
    no_show: 'bg-orange-50 text-orange-700',
    active: 'bg-green-50 text-green-700',
    inactive: 'bg-zinc-50 text-zinc-600',
    dormant: 'bg-yellow-50 text-yellow-700',
    blacklist: 'bg-red-50 text-red-700',
    expired: 'bg-zinc-50 text-zinc-600',
    fully_used: 'bg-zinc-100 text-zinc-600',
  };
  return colors[status] || 'bg-zinc-100 text-zinc-600';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: '예약확정',
    checked_in: '이용중',
    checked_out: '퇴장완료',
    cancelled: '취소',
    no_show: '노쇼',
    active: '활성',
    inactive: '비활성',
    dormant: '휴면',
    blacklist: '블랙리스트',
    expired: '만료',
    fully_used: '사용완료',
  };
  return labels[status] || status;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: '슈퍼관리자',
    manager: '매니저',
    staff: '스태프',
  };
  return labels[role];
}

export function getPhoneLast4(phone: string): string {
  return phone.replace(/[^0-9]/g, '').slice(-4);
}

export function calcVisitCount(member: Member, reservations: Reservation[]): number {
  const last4 = getPhoneLast4(member.phone);
  return reservations.filter(r =>
    r.reserverName === member.name &&
    getPhoneLast4(r.phone) === last4 &&
    r.status === 'checked_out'
  ).length;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

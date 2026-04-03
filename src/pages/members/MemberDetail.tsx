import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Ticket, Calendar, Clock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { maskPhone, maskEmail, formatCurrency, calcVisitCount } from '../../utils/helpers';
import StatusBadge from '../../components/StatusBadge';

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members, reservations, passes } = useData();
  const { user } = useAuth();
  const role = user?.role || 'staff';

  const member = members.find(m => m.id === id);
  if (!member) {
    return (
      <div className="text-center py-24">
        <p className="text-[15px] text-zinc-500">멤버를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/members')} className="mt-5 text-black text-[15px] font-medium underline">목록으로 돌아가기</button>
      </div>
    );
  }

  const memberReservations = reservations.filter(r => r.phone === member.phone).sort((a, b) => b.date.localeCompare(a.date));
  const memberPasses = passes.filter(p => p.memberId === member.id);
  const totalSpent = memberReservations.reduce((sum, r) => sum + r.paymentAmount, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-zinc-100 rounded-xl transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-[28px] font-bold text-zinc-900">{member.name}</h1>
            <p className="text-[15px] text-zinc-400 mt-1">{member.job}</p>
          </div>
          <StatusBadge status={member.membershipStatus} />
        </div>
        <Link to={`/members/${member.id}/edit`}
          className="flex items-center gap-2.5 px-5 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800 transition-colors">
          <Edit size={18} /> 수정
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Info Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-7 space-y-5">
          <h2 className="text-[16px] font-bold text-zinc-900 pb-3 border-b">기본 정보</h2>
          <div className="space-y-4">
            {[
              { label: '연락처', value: maskPhone(member.phone, role), bold: true },
              { label: '이메일', value: maskEmail(member.email, role), bold: true },
              { label: '가입일', value: member.registeredAt },
              { label: '방문횟수', value: `${calcVisitCount(member, reservations)}회`, bold: true },
              { label: 'WORK MOOD', value: member.workMood || '-' },
              { label: '관심 업무', value: member.interests || '-' },
              { label: '문자 수신', value: member.smsConsent ? '동의' : '미동의' },
              { label: '마케팅 수신', value: member.marketingConsent ? '동의' : '미동의' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-[14px] text-zinc-400">{item.label}</span>
                <span className={`text-[15px] ${item.bold ? 'font-semibold' : ''}`}>{item.value}</span>
              </div>
            ))}
          </div>
          {member.notes && (
            <div className="pt-4 border-t">
              <p className="text-[13px] text-zinc-400 mb-1.5">비고</p>
              <p className="text-[15px] text-zinc-700">{member.notes}</p>
            </div>
          )}
        </div>

        {/* Stats + Passes */}
        <div className="space-y-7">
          <div className="bg-white rounded-2xl border border-zinc-200 p-7">
            <h2 className="text-[16px] font-bold text-zinc-900 pb-3 border-b mb-5">이용 통계</h2>
            <div className="grid grid-cols-2 gap-5">
              <div className="text-center p-5 bg-zinc-50 rounded-xl">
                <Calendar size={22} className="mx-auto text-zinc-600 mb-2" />
                <p className="text-[24px] font-bold text-zinc-900">{memberReservations.length}</p>
                <p className="text-[13px] text-zinc-500 mt-1">총 예약</p>
              </div>
              <div className="text-center p-5 bg-zinc-50 rounded-xl">
                <Clock size={22} className="mx-auto text-zinc-600 mb-2" />
                <p className="text-[24px] font-bold text-zinc-900">{Math.round(memberReservations.reduce((sum, r) => sum + (r.stayDuration || 0), 0) / 60)}h</p>
                <p className="text-[13px] text-zinc-500 mt-1">총 체류</p>
              </div>
            </div>
            {role !== 'staff' && (
              <div className="mt-5 p-5 bg-zinc-50 rounded-xl text-center">
                <p className="text-[24px] font-bold text-zinc-900">{formatCurrency(totalSpent)}</p>
                <p className="text-[13px] text-zinc-500 mt-1">총 결제 금액</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 p-7">
            <div className="flex items-center gap-2.5 pb-3 border-b mb-4">
              <Ticket size={18} className="text-zinc-600" />
              <h2 className="text-[16px] font-bold text-zinc-900">보유 이용권</h2>
            </div>
            {memberPasses.length > 0 ? (
              <div className="space-y-3">
                {memberPasses.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                    <div>
                      <p className="text-[15px] font-semibold">{p.type}</p>
                      <p className="text-[13px] text-zinc-400 mt-0.5">구매일: {p.purchaseDate}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold">{p.remainingUses}/{p.totalUses}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-zinc-400">보유 이용권 없음</p>
            )}
          </div>
        </div>

        {/* Recent Reservations */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-7">
          <h2 className="text-[16px] font-bold text-zinc-900 pb-3 border-b mb-4">최근 방문 이력</h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {memberReservations.slice(0, 10).map(r => (
              <div key={r.id} className="p-4 bg-zinc-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[15px] font-semibold">{r.date}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-zinc-500 text-[13px] space-y-1">
                  <p>{r.product} | {r.seat} | {r.time}</p>
                  {r.paymentAmount > 0 && <p>{formatCurrency(r.paymentAmount)} ({r.paymentMethod})</p>}
                  {r.checkInTime && <p>입장 {r.checkInTime} {r.checkOutTime ? `→ 퇴장 ${r.checkOutTime}` : ''}</p>}
                </div>
              </div>
            ))}
            {memberReservations.length === 0 && (
              <p className="text-[15px] text-zinc-400">방문 이력 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

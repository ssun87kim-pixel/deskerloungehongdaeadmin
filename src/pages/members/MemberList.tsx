import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Download } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { maskPhone, maskEmail, getStatusLabel, calcVisitCount } from '../../utils/helpers';
import StatusBadge from '../../components/StatusBadge';
import { exportToExcel } from '../../services/exportExcel';

export default function MemberList() {
  const { members, reservations } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleExport = () => {
    const today = new Date();
    const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    exportToExcel({
      filename: `데스커라운지홍대_멤버목록_${yyyymmdd}.xlsx`,
      sheets: [
        {
          name: '멤버 목록',
          headers: ['이름', '연락처', '이메일', '하는 일', '업무스타일', '방문횟수', '상태', '등록일', '문자동의', '개인정보동의', '마케팅동의', '비고'],
          rows: members.map(m => [
            m.name,
            m.phone,
            m.email,
            m.job,
            m.workMood,
            calcVisitCount(m, reservations),
            getStatusLabel(m.membershipStatus),
            m.registeredAt,
            m.smsConsent ? 'Y' : 'N',
            m.privacyConsent ? 'Y' : 'N',
            m.marketingConsent ? 'Y' : 'N',
            m.notes,
          ]),
          columnWidths: [10, 15, 25, 15, 15, 10, 10, 12, 10, 12, 12, 20],
        },
      ],
    });
  };

  const filtered = members.filter(m => {
    const matchSearch = m.name.includes(search) || m.phone.includes(search) || m.job.includes(search);
    const matchStatus = statusFilter === 'all' || m.membershipStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-zinc-900">멤버 관리</h1>
          <p className="text-[15px] text-zinc-400 mt-2">전체 {members.length}명</p>
        </div>
        <Link
          to="/members/new"
          className="flex items-center gap-2.5 px-5 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800 transition-colors"
        >
          <Plus size={18} />
          멤버 등록
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름, 연락처, 직업으로 검색..."
              className="w-full pl-11 pr-5 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 focus:border-zinc-400 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter size={18} className="text-zinc-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-zinc-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-black/10 outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="dormant">휴면</option>
              <option value="inactive">비활성</option>
              <option value="blacklist">블랙리스트</option>
            </select>
          </div>
          {user?.role === 'super_admin' && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-3 border border-zinc-200 rounded-xl text-[15px] text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Download size={16} />
              내보내기
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">이름</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">연락처</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">이메일</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">직업</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">방문횟수</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">상태</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">가입일</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(member => (
                <tr key={member.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-5 font-semibold text-[15px] text-zinc-900">{member.name}</td>
                  <td className="px-6 py-5 text-[15px] text-zinc-600">{maskPhone(member.phone, user?.role || 'staff')}</td>
                  <td className="px-6 py-5 text-[15px] text-zinc-600">{maskEmail(member.email, user?.role || 'staff')}</td>
                  <td className="px-6 py-5 text-[15px] text-zinc-600">{member.job}</td>
                  <td className="px-6 py-5 text-center text-[15px] font-semibold">{calcVisitCount(member, reservations)}회</td>
                  <td className="px-6 py-5 text-center"><StatusBadge status={member.membershipStatus} /></td>
                  <td className="px-6 py-5 text-[14px] text-zinc-400">{member.registeredAt}</td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link to={`/members/${member.id}`} className="px-3.5 py-1.5 text-[13px] bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors font-medium">
                        상세
                      </Link>
                      <Link to={`/members/${member.id}/edit`} className="px-3.5 py-1.5 text-[13px] bg-black/5 text-black rounded-lg hover:bg-black/10 transition-colors font-medium">
                        수정
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-[15px] text-zinc-400">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Search, Plus, AlertTriangle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import StatusBadge from '../../components/StatusBadge';

export default function PassList() {
  const { passes, addPass, usePass, members } = useData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const filtered = passes.filter(p => {
    const matchSearch = p.memberName.includes(search) || p.phone.includes(search);
    const matchType = typeFilter === 'all' || p.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const memberId = fd.get('memberId') as string;
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const type = fd.get('type') as any;
    const totalUses = type === '무료이용권' ? Number(fd.get('totalUses') || 3) : type.includes('10회권') ? 10 : 10;

    addPass({
      memberId,
      memberName: member.name,
      phone: member.phone,
      type,
      purchaseDate: new Date().toISOString().split('T')[0],
      totalUses,
      remainingUses: totalUses,
      usageHistory: [],
      status: 'active',
      notes: fd.get('notes') as string || '',
    });
    setShowForm(false);
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-zinc-900">이용권 관리</h1>
          <p className="text-[15px] text-zinc-400 mt-2">전체 {passes.length}건</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2.5 px-5 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800 transition-colors">
          <Plus size={18} /> 이용권 발급
        </button>
      </div>

      {/* Alert: Low remaining */}
      {passes.filter(p => p.status === 'active' && p.remainingUses <= 2).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <AlertTriangle size={18} className="text-amber-500" />
            <span className="text-[15px] font-semibold text-amber-800">잔여 횟수 부족 알림</span>
          </div>
          <div className="space-y-1.5">
            {passes.filter(p => p.status === 'active' && p.remainingUses <= 2).map(p => (
              <p key={p.id} className="text-[14px] text-amber-700">
                {p.memberName} - {p.type}: <span className="font-bold">{p.remainingUses}회 남음</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl p-6 border border-zinc-300 space-y-5">
          <h3 className="text-[16px] font-bold text-zinc-900">이용권 발급</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <select name="memberId" required className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
              <option value="">멤버 선택 *</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>)}
            </select>
            <select name="type" required className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
              <option value="4시간 10회권">4시간 10회권</option>
              <option value="종일 10회권">종일 10회권</option>
              <option value="무료이용권">무료이용권</option>
            </select>
            <input name="totalUses" type="number" placeholder="횟수 (무료이용권)" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
            <input name="notes" placeholder="비고" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800">발급</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-3 border border-zinc-200 rounded-xl text-[15px] text-zinc-600 hover:bg-zinc-50">취소</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-48">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 연락처 검색..."
            className="w-full pl-11 pr-5 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-zinc-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
          <option value="all">전체 유형</option>
          <option value="4시간 10회권">4시간 10회권</option>
          <option value="종일 10회권">종일 10회권</option>
          <option value="무료이용권">무료이용권</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">멤버</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">연락처</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">유형</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">구매일</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">사용/전체</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">잔여</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">상태</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">최근 사용</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(p => (
                <tr key={p.id} className={`hover:bg-zinc-50/50 transition-colors ${p.remainingUses <= 2 && p.status === 'active' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-6 py-5 text-[15px] font-semibold">{p.memberName}</td>
                  <td className="px-6 py-5 text-[15px] text-zinc-600">{p.phone}</td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-[13px] font-medium">{p.type}</span>
                  </td>
                  <td className="px-6 py-5 text-[15px] text-zinc-600">{p.purchaseDate}</td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-zinc-200 rounded-full h-2.5">
                        <div className="bg-black h-2.5 rounded-full" style={{ width: `${((p.totalUses - p.remainingUses) / p.totalUses) * 100}%` }} />
                      </div>
                      <span className="text-[13px] text-zinc-500">{p.totalUses - p.remainingUses}/{p.totalUses}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`text-[16px] font-bold ${p.remainingUses <= 2 ? 'text-amber-600' : 'text-zinc-900'}`}>
                      {p.remainingUses}회
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center"><StatusBadge status={p.status} /></td>
                  <td className="px-6 py-5 text-[14px] text-zinc-400">
                    {p.usageHistory.length > 0 ? p.usageHistory[p.usageHistory.length - 1].date : '-'}
                  </td>
                  <td className="px-6 py-5 text-center">
                    {p.status === 'active' && p.remainingUses > 0 && (
                      <button onClick={() => usePass(p.id, new Date().toISOString().split('T')[0])}
                        className="px-3.5 py-1.5 text-[13px] bg-black/5 text-black rounded-lg hover:bg-black/10 transition-colors font-medium">
                        사용 처리
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-16 text-[15px] text-zinc-400">이용권 데이터가 없습니다.</div>}
      </div>
    </div>
  );
}

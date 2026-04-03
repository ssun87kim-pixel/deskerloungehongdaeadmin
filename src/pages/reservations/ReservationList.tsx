import { useState } from 'react';
import { Search, Plus, LogIn, LogOut, Filter, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/helpers';
import StatusBadge from '../../components/StatusBadge';
import type { Reservation, ReservationProduct } from '../../types';

const products = ['전체', '1DAY', '워커스룸', '4시간', '2시간', '프로그램'];
const sources = ['전체', 'naver', 'walkin', 'phone', 'other'];
const sourceLabels: Record<string, string> = { naver: '네이버', walkin: '워크인', phone: '유선', other: '기타' };

export default function ReservationList() {
  const { reservations, checkIn, checkOut, addReservation, updateReservation } = useData();
  const [dateFilter, setDateFilter] = useState('2026-03-11');
  const [productFilter, setProductFilter] = useState('전체');
  const [sourceFilter, setSourceFilter] = useState('전체');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Reservation>>({});

  const openModal = (r: Reservation) => {
    setSelectedReservation(r);
    setIsEditing(false);
    setEditData({});
  };

  const closeModal = () => {
    setSelectedReservation(null);
    setIsEditing(false);
    setEditData({});
  };

  const startEditing = () => {
    if (!selectedReservation) return;
    setEditData({
      product: selectedReservation.product,
      seat: selectedReservation.seat,
      paymentAmount: selectedReservation.paymentAmount,
      notes: selectedReservation.notes,
      rentalItems: [...selectedReservation.rentalItems],
      program: selectedReservation.program,
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!selectedReservation) return;
    updateReservation(selectedReservation.id, editData);
    setSelectedReservation({ ...selectedReservation, ...editData });
    setIsEditing(false);
    setEditData({});
  };

  const filtered = reservations.filter(r => {
    const matchDate = !dateFilter || r.date === dateFilter;
    const matchProduct = productFilter === '전체' || r.product === productFilter;
    const matchSource = sourceFilter === '전체' || r.source === sourceFilter;
    const matchSearch = !search || r.reserverName.includes(search) || r.phone.includes(search);
    return matchDate && matchProduct && matchSource && matchSearch;
  }).sort((a, b) => a.time.localeCompare(b.time));

  const todayStats = {
    total: filtered.length,
    checkedIn: filtered.filter(r => r.status === 'checked_in').length,
    confirmed: filtered.filter(r => r.status === 'confirmed').length,
    revenue: filtered.reduce((sum, r) => sum + r.paymentAmount, 0),
  };

  const handleQuickAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addReservation({
      date: dateFilter,
      time: fd.get('time') as string,
      reserverName: fd.get('name') as string,
      phone: fd.get('phone') as string,
      email: '',
      visitorName: fd.get('name') as string,
      visitorPhone: fd.get('phone') as string,
      product: fd.get('product') as any,
      seat: fd.get('seat') as string,
      paymentAmount: Number(fd.get('amount') || 0),
      paymentMethod: fd.get('method') as string,
      checkInTime: null,
      checkOutTime: null,
      stayDuration: null,
      source: 'walkin',
      visitPath: '워크인',
      isRefunded: false,
      refundAmount: 0,
      rentalItems: [],
      guideTime: '',
      guideStaff: '',
      program: fd.get('program') as string || '',
      isRevisit: false,
      membershipJoined: false,
      notes: fd.get('notes') as string,
      status: 'confirmed',
    });
    setShowForm(false);
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-zinc-900">예약 관리</h1>
          <p className="text-[15px] text-zinc-400 mt-2">{dateFilter} 기준</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2.5 px-5 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800 transition-colors">
          <Plus size={18} /> 워크인 등록
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-5">
        {[
          { label: '전체 예약', value: `${todayStats.total}건` },
          { label: '이용중', value: `${todayStats.checkedIn}명` },
          { label: '대기중', value: `${todayStats.confirmed}건` },
          { label: '매출', value: formatCurrency(todayStats.revenue) },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-6 border border-zinc-200 text-center">
            <p className="text-[13px] text-zinc-400 font-medium">{s.label}</p>
            <p className="text-[22px] font-bold text-zinc-900 mt-2">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Walk-in Form */}
      {showForm && (
        <form onSubmit={handleQuickAdd} className="bg-white rounded-2xl p-6 border border-zinc-300 space-y-5">
          <h3 className="text-[16px] font-bold text-zinc-900">워크인 예약 등록</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <input name="name" required placeholder="이름 *" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
            <input name="phone" required placeholder="연락처 *" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
            <input name="time" required placeholder="시간 (ex. 14:00) *" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
            <select name="product" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
              <option value="1DAY">1DAY</option>
              <option value="4시간">4시간</option>
              <option value="2시간">2시간</option>
              <option value="워커스룸">워커스룸</option>
            </select>
            <input name="seat" placeholder="좌석" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
            <input name="amount" type="number" placeholder="결제금액" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
            <select name="method" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
              <option value="신용카드">신용카드</option>
              <option value="현금">현금</option>
              <option value="네이버페이">네이버페이</option>
              <option value="10회권">10회권</option>
              <option value="무료이용권">무료이용권</option>
            </select>
            <select name="program" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
              <option value="">참여 프로그램 (없음)</option>
              <option value="커넥트라이브러리">커넥트라이브러리</option>
              <option value="디퍼스테이지">디퍼스테이지</option>
              <option value="워크투게더">워크투게더</option>
              <option value="데일리프로그램">데일리프로그램</option>
              <option value="기타">기타</option>
            </select>
            <input name="notes" placeholder="비고" className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800">등록</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-3 border border-zinc-200 rounded-xl text-[15px] text-zinc-600 hover:bg-zinc-50">취소</button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 flex flex-wrap items-center gap-4">
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
          className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
        <div className="relative flex-1 min-w-48">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="이름, 연락처 검색..."
            className="w-full pl-11 pr-5 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
        </div>
        <Filter size={18} className="text-zinc-400" />
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)}
          className="border border-zinc-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
          {products.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="border border-zinc-200 rounded-xl px-4 py-3 text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
          {sources.map(s => <option key={s} value={s}>{s === '전체' ? '전체 경로' : sourceLabels[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">시간</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">예약자</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">상품</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">좌석</th>
                <th className="text-right px-6 py-4 font-medium text-[14px] text-zinc-500">결제금액</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">경로</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">IN</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">OUT</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">상태</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors cursor-pointer" onClick={() => openModal(r)}>
                  <td className="px-6 py-5 text-[15px] font-medium">{r.time}</td>
                  <td className="px-6 py-5">
                    <div className="text-[15px] font-semibold">{r.reserverName}</div>
                    <div className="text-[13px] text-zinc-400 mt-0.5">{r.phone}</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-[13px] font-medium">{r.product}</span>
                  </td>
                  <td className="px-6 py-5 text-[15px] text-zinc-600">{r.seat}</td>
                  <td className="px-6 py-5 text-right text-[15px] font-semibold">{r.paymentAmount > 0 ? formatCurrency(r.paymentAmount) : '-'}</td>
                  <td className="px-6 py-5 text-center text-[14px] text-zinc-500">{sourceLabels[r.source] || r.source}</td>
                  <td className="px-6 py-5 text-center text-[14px] text-zinc-600">{r.checkInTime || '-'}</td>
                  <td className="px-6 py-5 text-center text-[14px] text-zinc-600">{r.checkOutTime || '-'}</td>
                  <td className="px-6 py-5 text-center"><StatusBadge status={r.status} /></td>
                  <td className="px-6 py-5 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-2">
                      {r.status === 'confirmed' && (
                        <button onClick={() => checkIn(r.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-[13px] font-medium hover:bg-emerald-100 transition-colors">
                          <LogIn size={14} /> 입장
                        </button>
                      )}
                      {r.status === 'checked_in' && (
                        <button onClick={() => checkOut(r.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-[13px] font-medium hover:bg-zinc-200 transition-colors">
                          <LogOut size={14} /> 퇴장
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="text-center py-16 text-[15px] text-zinc-400">예약 데이터가 없습니다.</div>}
      </div>

      {/* Reservation Detail/Edit Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[20px] font-bold text-zinc-900">예약 상세</h2>
              <button onClick={closeModal} className="p-1 hover:bg-zinc-100 rounded-lg transition-colors">
                <X size={20} className="text-zinc-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[13px] font-medium text-zinc-400">날짜</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.date}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">시간</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.time}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">예약자</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.reserverName}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">연락처</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.phone}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">이메일</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.email || '-'}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">방문자</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.visitorName}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">상품</label>
                {isEditing ? (
                  <select value={editData.product || ''} onChange={e => setEditData({ ...editData, product: e.target.value as ReservationProduct })}
                    className="w-full mt-1 px-3 py-2 border border-[#D9D9D9] rounded-lg text-[15px] focus:border-[#336DFF] outline-none">
                    <option value="1DAY">1DAY</option>
                    <option value="4시간">4시간</option>
                    <option value="2시간">2시간</option>
                    <option value="워커스룸">워커스룸</option>
                    <option value="프로그램">프로그램</option>
                    <option value="기타">기타</option>
                  </select>
                ) : (
                  <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.product}</p>
                )}
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">좌석</label>
                {isEditing ? (
                  <input value={editData.seat || ''} onChange={e => setEditData({ ...editData, seat: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-[#D9D9D9] rounded-lg text-[15px] focus:border-[#336DFF] outline-none" />
                ) : (
                  <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.seat || '-'}</p>
                )}
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">결제금액</label>
                {isEditing ? (
                  <input type="number" value={editData.paymentAmount ?? 0} onChange={e => setEditData({ ...editData, paymentAmount: Number(e.target.value) })}
                    className="w-full mt-1 px-3 py-2 border border-[#D9D9D9] rounded-lg text-[15px] focus:border-[#336DFF] outline-none" />
                ) : (
                  <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.paymentAmount > 0 ? formatCurrency(selectedReservation.paymentAmount) : '-'}</p>
                )}
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">결제수단</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.paymentMethod || '-'}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">예약 경로</label>
                <p className="text-[15px] text-zinc-900 mt-1">{sourceLabels[selectedReservation.source] || selectedReservation.source}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">상태</label>
                <div className="mt-1"><StatusBadge status={selectedReservation.status} /></div>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">입장 시간</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.checkInTime || '-'}</p>
              </div>
              <div>
                <label className="text-[13px] font-medium text-zinc-400">퇴장 시간</label>
                <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.checkOutTime || '-'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-[13px] font-medium text-zinc-400">대여물품</label>
                {isEditing ? (
                  <input value={(editData.rentalItems || []).join(', ')}
                    onChange={e => setEditData({ ...editData, rentalItems: e.target.value ? e.target.value.split(',').map(s => s.trim()) : [] })}
                    placeholder="쉼표로 구분 (예: 충전기, 담요)"
                    className="w-full mt-1 px-3 py-2 border border-[#D9D9D9] rounded-lg text-[15px] focus:border-[#336DFF] outline-none" />
                ) : (
                  <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.rentalItems.length > 0 ? selectedReservation.rentalItems.join(', ') : '-'}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-[13px] font-medium text-zinc-400">참여 프로그램</label>
                {isEditing ? (
                  <select value={editData.program || ''} onChange={e => setEditData({ ...editData, program: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-[#D9D9D9] rounded-lg text-[15px] focus:border-[#336DFF] outline-none">
                    <option value="">(없음)</option>
                    <option value="커넥트라이브러리">커넥트라이브러리</option>
                    <option value="디퍼스테이지">디퍼스테이지</option>
                    <option value="워크투게더">워크투게더</option>
                    <option value="데일리프로그램">데일리프로그램</option>
                    <option value="기타">기타</option>
                  </select>
                ) : (
                  <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.program || '-'}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-[13px] font-medium text-zinc-400">비고</label>
                {isEditing ? (
                  <textarea value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })}
                    rows={3} className="w-full mt-1 px-3 py-2 border border-[#D9D9D9] rounded-lg text-[15px] focus:border-[#336DFF] outline-none resize-none" />
                ) : (
                  <p className="text-[15px] text-zinc-900 mt-1">{selectedReservation.notes || '-'}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-100">
              {isEditing ? (
                <>
                  <button onClick={() => { setIsEditing(false); setEditData({}); }}
                    className="px-5 py-2.5 border border-zinc-200 rounded-xl text-[15px] text-zinc-600 hover:bg-zinc-50 transition-colors">취소</button>
                  <button onClick={saveEdit}
                    className="px-5 py-2.5 bg-[#336DFF] text-white rounded-xl text-[15px] font-semibold hover:bg-[#2a5be0] transition-colors">저장</button>
                </>
              ) : (
                <>
                  <button onClick={closeModal}
                    className="px-5 py-2.5 border border-zinc-200 rounded-xl text-[15px] text-zinc-600 hover:bg-zinc-50 transition-colors">닫기</button>
                  <button onClick={startEditing}
                    className="px-5 py-2.5 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800 transition-colors">수정</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

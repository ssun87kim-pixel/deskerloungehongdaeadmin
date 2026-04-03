import { useState } from 'react';
import { Package, MessageSquare, Plus } from 'lucide-react';
import { useData } from '../../contexts/DataContext';

export default function OperationsPage() {
  const { rentalItems, updateRentalItem } = useData();
  const [tab, setTab] = useState<'rental' | 'voc'>('rental');
  const [vocEntries, setVocEntries] = useState([
    { id: '1', date: '2026-03-11', content: '와이파이 속도가 느려요', category: '시설', status: '처리중' },
    { id: '2', date: '2026-03-10', content: '프로그램 시간 조정 요청', category: '프로그램', status: '완료' },
    { id: '3', date: '2026-03-09', content: '커피 종류 추가 요청', category: 'F&B', status: '검토중' },
    { id: '4', date: '2026-03-08', content: '조명이 너무 밝아요 (B구역)', category: '시설', status: '완료' },
    { id: '5', date: '2026-03-07', content: '주차 할인 안내가 부족해요', category: '안내', status: '완료' },
  ]);
  const [showVocForm, setShowVocForm] = useState(false);

  const handleVocAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setVocEntries(prev => [{
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      content: fd.get('content') as string,
      category: fd.get('category') as string,
      status: '접수',
    }, ...prev]);
    setShowVocForm(false);
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold text-zinc-900">운영 관리</h1>
        <p className="text-[15px] text-zinc-400 mt-2">대여물품 및 고객 피드백 관리</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-100 rounded-xl p-1.5 w-fit">
        <button onClick={() => setTab('rental')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${tab === 'rental' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
          <Package size={18} /> 대여물품
        </button>
        <button onClick={() => setTab('voc')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${tab === 'voc' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
          <MessageSquare size={18} /> 고객 반응/VOC
        </button>
      </div>

      {tab === 'rental' && (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-7 py-5 border-b border-zinc-100">
            <h3 className="text-[16px] font-bold text-zinc-900">대여물품 현황</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">물품명</th>
                  <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">전체 수량</th>
                  <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">대여 가능</th>
                  <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">대여중</th>
                  <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">위치</th>
                  <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rentalItems.map(item => (
                  <tr key={item.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-5 text-[15px] font-semibold">{item.name}</td>
                    <td className="px-6 py-5 text-center text-[15px]">{item.totalQuantity}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`text-[16px] font-bold ${item.availableQuantity <= 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {item.availableQuantity}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center text-[15px] text-zinc-500">{item.totalQuantity - item.availableQuantity}</td>
                    <td className="px-6 py-5 text-[15px] text-zinc-600">{item.location}</td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => updateRentalItem(item.id, { availableQuantity: Math.max(0, item.availableQuantity - 1) })}
                          className="px-3 py-1.5 text-[13px] bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium">대여</button>
                        <button onClick={() => updateRentalItem(item.id, { availableQuantity: Math.min(item.totalQuantity, item.availableQuantity + 1) })}
                          className="px-3 py-1.5 text-[13px] bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium">반납</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'voc' && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button onClick={() => setShowVocForm(!showVocForm)}
              className="flex items-center gap-2.5 px-5 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800 transition-colors">
              <Plus size={18} /> VOC 등록
            </button>
          </div>

          {showVocForm && (
            <form onSubmit={handleVocAdd} className="bg-white rounded-2xl p-6 border border-zinc-300 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select name="category" required className="px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none">
                  <option value="">카테고리 선택</option>
                  <option value="시설">시설</option>
                  <option value="프로그램">프로그램</option>
                  <option value="F&B">F&B</option>
                  <option value="안내">안내</option>
                  <option value="기타">기타</option>
                </select>
                <input name="content" required placeholder="내용 *" className="md:col-span-2 px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 outline-none" />
                <div className="flex gap-3">
                  <button type="submit" className="px-5 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800">등록</button>
                  <button type="button" onClick={() => setShowVocForm(false)} className="px-5 py-3 border border-zinc-200 rounded-xl text-[15px] text-zinc-600 hover:bg-zinc-50">취소</button>
                </div>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">날짜</th>
                    <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">카테고리</th>
                    <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">내용</th>
                    <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {vocEntries.map(v => (
                    <tr key={v.id} className="hover:bg-zinc-50/50">
                      <td className="px-6 py-5 text-[15px] text-zinc-600">{v.date}</td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-[13px] font-medium">{v.category}</span>
                      </td>
                      <td className="px-6 py-5 text-[15px]">{v.content}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[13px] font-medium ${
                          v.status === '완료' ? 'bg-emerald-100 text-emerald-800' :
                          v.status === '처리중' ? 'bg-blue-100 text-blue-800' :
                          v.status === '검토중' ? 'bg-amber-100 text-amber-800' :
                          'bg-zinc-100 text-zinc-800'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

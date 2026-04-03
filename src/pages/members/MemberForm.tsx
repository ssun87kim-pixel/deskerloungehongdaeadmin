import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { Member } from '../../types';

const emptyMember: Omit<Member, 'id'> = {
  name: '', phone: '', email: '', job: '',
  workMood: '', workersJourney: '', visitCount: 0,
  interests: '', programParticipation: '',
  smsConsent: true, privacyConsent: true, marketingConsent: false,
  membershipStatus: 'active', registeredAt: new Date().toISOString().split('T')[0],
  notes: '', passIds: [],
};

export default function MemberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members, addMember, updateMember } = useData();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<Omit<Member, 'id'>>(emptyMember);

  useEffect(() => {
    if (isEdit && id) {
      const member = members.find(m => m.id === id);
      if (member) {
        const { id: _, ...rest } = member;
        setForm(rest);
      }
    }
  }, [id, isEdit, members]);

  const handleChange = (field: keyof typeof form, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && id) {
      updateMember(id, form);
    } else {
      addMember(form);
    }
    navigate('/members');
  };

  const inputClass = "w-full px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 focus:border-zinc-400 outline-none transition-all";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <button onClick={() => navigate(-1)} className="p-2.5 hover:bg-zinc-100 rounded-xl transition-colors">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-[28px] font-bold text-zinc-900">{isEdit ? '멤버 수정' : '멤버 등록'}</h1>
          <p className="text-[15px] text-zinc-400 mt-1">{isEdit ? '멤버 정보를 수정합니다.' : '새로운 멤버를 등록합니다.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-200 p-8 space-y-10">
        {/* Basic Info */}
        <section>
          <h2 className="text-[18px] font-bold text-zinc-900 mb-5 pb-3 border-b">기본 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">이름 *</label>
              <input type="text" required value={form.name} onChange={e => handleChange('name', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">연락처 *</label>
              <input type="tel" required value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="010-0000-0000" className={inputClass} />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">이메일</label>
              <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">하는 일</label>
              <input type="text" value={form.job} onChange={e => handleChange('job', e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Work Style */}
        <section>
          <h2 className="text-[18px] font-bold text-zinc-900 mb-5 pb-3 border-b">작업 스타일</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">WORK MOOD</label>
              <select value={form.workMood} onChange={e => handleChange('workMood', e.target.value)} className={inputClass}>
                <option value="">선택</option>
                <option value="집중형">집중형</option>
                <option value="협업형">협업형</option>
                <option value="자유형">자유형</option>
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">WORKER'S JOURNEY</label>
              <input type="text" value={form.workersJourney} onChange={e => handleChange('workersJourney', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">관심 업무</label>
              <input type="text" value={form.interests} onChange={e => handleChange('interests', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">프로그램 참여</label>
              <input type="text" value={form.programParticipation} onChange={e => handleChange('programParticipation', e.target.value)} className={inputClass} />
            </div>
          </div>
        </section>

        {/* Status & Consent */}
        <section>
          <h2 className="text-[18px] font-bold text-zinc-900 mb-5 pb-3 border-b">상태 및 동의</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">멤버십 상태</label>
              <select value={form.membershipStatus} onChange={e => handleChange('membershipStatus', e.target.value)} className={inputClass}>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
                <option value="dormant">휴면</option>
                <option value="blacklist">블랙리스트</option>
              </select>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-zinc-600 mb-2">가입일</label>
              <input type="date" value={form.registeredAt} onChange={e => handleChange('registeredAt', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-wrap gap-8 mt-5">
            <label className="flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" checked={form.privacyConsent} onChange={e => handleChange('privacyConsent', e.target.checked)}
                className="w-5 h-5 rounded border-zinc-300 text-black focus:ring-black" />
              개인정보 동의
            </label>
            <label className="flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" checked={form.smsConsent} onChange={e => handleChange('smsConsent', e.target.checked)}
                className="w-5 h-5 rounded border-zinc-300 text-black focus:ring-black" />
              문자 알림 동의
            </label>
            <label className="flex items-center gap-2.5 text-[15px]">
              <input type="checkbox" checked={form.marketingConsent} onChange={e => handleChange('marketingConsent', e.target.checked)}
                className="w-5 h-5 rounded border-zinc-300 text-black focus:ring-black" />
              마케팅 수신 동의
            </label>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h2 className="text-[18px] font-bold text-zinc-900 mb-5 pb-3 border-b">비고</h2>
          <textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={3}
            className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-[15px] focus:ring-2 focus:ring-black/10 focus:border-zinc-400 outline-none resize-none transition-all" />
        </section>

        <div className="flex justify-end gap-4 pt-5 border-t">
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-3 border border-zinc-200 rounded-xl text-[15px] text-zinc-600 hover:bg-zinc-50 transition-colors">
            취소
          </button>
          <button type="submit"
            className="flex items-center gap-2.5 px-7 py-3 bg-black text-white rounded-xl text-[15px] font-semibold hover:bg-zinc-800 transition-colors">
            <Save size={18} />
            {isEdit ? '수정 완료' : '등록'}
          </button>
        </div>
      </form>
    </div>
  );
}

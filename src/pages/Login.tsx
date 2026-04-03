import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    if (attempts >= 5) {
      setLocked(true);
      setError('로그인 시도 횟수를 초과했습니다. 관리자에게 문의하세요.');
      return;
    }

    const success = login(username, password);
    if (!success) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(`아이디 또는 비밀번호가 올바르지 않습니다. (${newAttempts}/5)`);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-14">
          <img src="/logo-white.png" alt="DESKER LOUNGE" className="h-6 mx-auto" />
          <p className="text-white/40 mt-4 text-xs font-semibold tracking-[0.2em] uppercase">Admin System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2.5">아이디</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-5 py-4 bg-white/[0.06] border border-white/[0.1] rounded-xl text-base text-white placeholder-white/30 focus:bg-white/[0.1] focus:border-white/25 focus:outline-none transition-all"
              placeholder="아이디를 입력하세요"
              disabled={locked}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-white/[0.06] border border-white/[0.1] rounded-xl text-base text-white placeholder-white/30 focus:bg-white/[0.1] focus:border-white/25 focus:outline-none transition-all"
              placeholder="비밀번호를 입력하세요"
              disabled={locked}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2.5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={locked || !username || !password}
            className="w-full py-4 bg-white text-black rounded-xl text-base font-bold tracking-tight hover:bg-white/90 transition-all disabled:opacity-20 disabled:cursor-not-allowed mt-2"
          >
            로그인
          </button>

          <div className="mt-10 border border-white/10 rounded-xl p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider text-center mb-3">테스트 계정 (비밀번호: 아무거나)</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded">최고관리자</span>
                  <span className="text-sm text-white/70">admin</span>
                </div>
                <span className="text-xs text-white/30">모든 기능 접근</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">매니저</span>
                  <span className="text-sm text-white/70">manager1</span>
                </div>
                <span className="text-xs text-white/30">매출/지출/스케줄/보고서</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-white/[0.04] rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/50 bg-white/[0.08] px-2 py-0.5 rounded">스태프</span>
                  <span className="text-sm text-white/70">staff1</span>
                </div>
                <span className="text-xs text-white/30">예약/이용권/운영/희망스케줄</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

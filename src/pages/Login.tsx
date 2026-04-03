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

          <p className="text-center text-sm text-white/30 mt-8">
            테스트: admin / manager1 / staff1 (비밀번호 아무거나)
          </p>
        </form>
      </div>
    </div>
  );
}

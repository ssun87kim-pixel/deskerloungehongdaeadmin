import { useState } from 'react';
import { Shield, Users, Activity, Clock } from 'lucide-react';
import { mockUsers, mockAuditLogs } from '../../utils/mockData';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleLabel } from '../../utils/helpers';

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'accounts' | 'permissions' | 'audit' | 'privacy'>('accounts');

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[28px] font-bold text-zinc-900">설정 / 보안</h1>
        <p className="text-[15px] text-zinc-400 mt-2">계정, 권한 및 보안 관리</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-zinc-100 rounded-xl p-1.5 w-fit">
        {[
          { id: 'accounts', label: '계정 관리', icon: Users },
          { id: 'permissions', label: '권한 설정', icon: Shield },
          { id: 'audit', label: '활동 로그', icon: Activity },
          { id: 'privacy', label: '개인정보 관리', icon: Clock },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${tab === t.id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
            <t.icon size={18} /> {t.label}
          </button>
        ))}
      </div>

      {/* Accounts */}
      {tab === 'accounts' && (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-7 py-5 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-zinc-900">계정 목록</h3>
            {isSuperAdmin && (
              <button className="px-4 py-2 bg-black text-white rounded-xl text-[14px] font-semibold hover:bg-zinc-800 transition-colors">
                계정 추가
              </button>
            )}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">이름</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">아이디</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">이메일</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">역할</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">상태</th>
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">최근 로그인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {mockUsers.map(u => (
                <tr key={u.id} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-5 text-[15px] font-semibold">{u.name}</td>
                  <td className="px-6 py-5 text-[15px] text-zinc-600">{u.username}</td>
                  <td className="px-6 py-5 text-[15px] text-zinc-600">{u.email}</td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[13px] font-medium ${
                      u.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                      u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                      'bg-zinc-100 text-zinc-800'
                    }`}>
                      {getRoleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[13px] font-medium ${u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-800'}`}>
                      {u.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-[14px] text-zinc-400">{u.lastLogin.replace('T', ' ').slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Permissions */}
      {tab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-zinc-200 p-7">
          <h3 className="text-[16px] font-bold text-zinc-900 mb-6">역할별 접근 권한</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">기능</th>
                  <th className="text-center px-6 py-4 font-medium text-[14px] text-red-600">슈퍼관리자</th>
                  <th className="text-center px-6 py-4 font-medium text-[14px] text-blue-600">매니저</th>
                  <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">스태프</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {[
                  { name: '대시보드 조회', super: true, manager: true, staff: true },
                  { name: '멤버 목록 조회', super: true, manager: true, staff: true },
                  { name: '멤버 상세 (마스킹 해제)', super: true, manager: true, staff: false },
                  { name: '멤버 등록/수정', super: true, manager: true, staff: false },
                  { name: '예약 조회', super: true, manager: true, staff: true },
                  { name: '예약 체크인/체크아웃', super: true, manager: true, staff: true },
                  { name: '예약 등록/수정', super: true, manager: true, staff: true },
                  { name: '이용권 조회', super: true, manager: true, staff: true },
                  { name: '이용권 발급/차감', super: true, manager: true, staff: false },
                  { name: '매출 조회', super: true, manager: true, staff: false },
                  { name: '지출 조회/관리', super: true, manager: true, staff: false },
                  { name: '데이터 다운로드', super: true, manager: false, staff: false },
                  { name: '계정 관리', super: true, manager: false, staff: false },
                  { name: '활동 로그 열람', super: true, manager: false, staff: false },
                  { name: '개인정보 파기 처리', super: true, manager: false, staff: false },
                ].map(p => (
                  <tr key={p.name} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4 text-[15px]">{p.name}</td>
                    <td className="px-6 py-4 text-center text-[15px]">{p.super ? '✓' : '—'}</td>
                    <td className="px-6 py-4 text-center text-[15px]">{p.manager ? '✓' : '—'}</td>
                    <td className="px-6 py-4 text-center text-[15px]">{p.staff ? '✓' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="px-7 py-5 border-b border-zinc-100">
            <h3 className="text-[16px] font-bold text-zinc-900">활동 로그</h3>
          </div>
          {isSuperAdmin ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">시간</th>
                  <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">사용자</th>
                  <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">활동</th>
                  <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">대상</th>
                  <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">상세</th>
                  <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {mockAuditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-5 text-[14px] text-zinc-400">{log.timestamp.replace('T', ' ').slice(0, 16)}</td>
                    <td className="px-6 py-5 text-[15px] font-semibold">{log.userName}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-lg text-[13px] font-medium ${
                        log.action === 'login' ? 'bg-blue-50 text-blue-700' :
                        log.action === 'create' ? 'bg-emerald-50 text-emerald-700' :
                        log.action === 'update' ? 'bg-amber-50 text-amber-700' :
                        log.action === 'delete' ? 'bg-red-50 text-red-700' :
                        log.action === 'download' ? 'bg-purple-50 text-purple-700' :
                        'bg-zinc-50 text-zinc-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[15px] text-zinc-600">{log.target}{log.targetId ? ` (${log.targetId})` : ''}</td>
                    <td className="px-6 py-5 text-[15px] text-zinc-600">{log.details}</td>
                    <td className="px-6 py-5 text-[14px] text-zinc-400">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-16 text-center text-[15px] text-zinc-400">슈퍼관리자만 활동 로그를 열람할 수 있습니다.</div>
          )}
        </div>
      )}

      {/* Privacy */}
      {tab === 'privacy' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-zinc-200 p-7 space-y-6">
            <h3 className="text-[16px] font-bold text-zinc-900">개인정보 보호 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 bg-zinc-50 rounded-xl">
                <p className="text-[15px] font-semibold text-zinc-900">개인정보 보유기간</p>
                <p className="text-[14px] text-zinc-500 mt-2">기본 보유기간: 3년</p>
                <p className="text-[14px] text-zinc-500">보유기간 초과 시 자동 알림</p>
              </div>
              <div className="p-6 bg-zinc-50 rounded-xl">
                <p className="text-[15px] font-semibold text-zinc-900">데이터 암호화</p>
                <p className="text-[14px] text-zinc-500 mt-2">전화번호, 이메일: AES-256 암호화</p>
                <p className="text-[14px] text-zinc-500">비밀번호: bcrypt 단방향 해싱</p>
              </div>
              <div className="p-6 bg-zinc-50 rounded-xl">
                <p className="text-[15px] font-semibold text-zinc-900">자동 로그아웃</p>
                <p className="text-[14px] text-zinc-500 mt-2">미사용 30분 후 자동 로그아웃</p>
              </div>
              <div className="p-6 bg-zinc-50 rounded-xl">
                <p className="text-[15px] font-semibold text-zinc-900">로그인 시도 제한</p>
                <p className="text-[14px] text-zinc-500 mt-2">5회 실패 시 계정 잠금</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-7">
            <h3 className="text-[16px] font-bold text-zinc-900 mb-4">개인정보 파기 요청</h3>
            <p className="text-[14px] text-zinc-500 mb-5">개인정보 보호법에 따라 보유기간이 경과한 개인정보는 지체 없이 파기해야 합니다.</p>
            {isSuperAdmin ? (
              <button className="px-5 py-3 bg-red-50 text-red-700 rounded-xl text-[15px] font-semibold hover:bg-red-100 transition-colors border border-red-200">
                보유기간 초과 데이터 조회
              </button>
            ) : (
              <p className="text-[15px] text-zinc-400">슈퍼관리자만 파기 처리를 실행할 수 있습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

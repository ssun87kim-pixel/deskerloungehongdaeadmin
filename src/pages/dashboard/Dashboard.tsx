import { useState, useMemo } from 'react';
import { ArrowUpRight, AlertCircle, Award, UserPlus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useData } from '../../contexts/DataContext';
import { mockDailySales } from '../../utils/mockData';
import { formatCurrency } from '../../utils/helpers';

type Period = 'today' | 'month' | 'year';

export default function Dashboard() {
  const { members, reservations, passes } = useData();
  const [period, setPeriod] = useState<Period>('today');

  const today = new Date();
  const todayDisplay = format(today, 'yyyy년 M월 d일 (EEEE)', { locale: ko });

  const mockToday = '2026-03-11';
  const mockMonth = mockToday.slice(0, 7);
  const mockYear = mockToday.slice(0, 4);

  const todayReservations = reservations.filter(r => r.date === mockToday);
  const monthReservations = reservations.filter(r => r.date.startsWith(mockMonth));
  const yearReservations = reservations.filter(r => r.date.startsWith(mockYear));

  const checkedIn = todayReservations.filter(r => r.status === 'checked_in').length;
  const checkedOut = todayReservations.filter(r => r.status === 'checked_out').length;
  const waiting = todayReservations.filter(r => r.status === 'confirmed').length;
  const todayRevenue = todayReservations.reduce((sum, r) => sum + r.paymentAmount, 0);
  const lowPasses = passes.filter(p => p.status === 'active' && p.remainingUses <= 2);
  const activeMembers = members.filter(m => m.membershipStatus === 'active').length;

  const monthSalesData = mockDailySales.filter(s => s.date.startsWith(mockMonth));
  const yearSalesData = mockDailySales.filter(s => s.date.startsWith(mockYear));

  const monthVisitors = monthSalesData.reduce((s, d) => s + d.totalVisitors, 0);
  const monthRevenue = monthSalesData.reduce((s, d) => s + d.totalRevenue, 0);
  const yearVisitors = yearSalesData.reduce((s, d) => s + d.totalVisitors, 0);
  const yearRevenue = yearSalesData.reduce((s, d) => s + d.totalRevenue, 0);

  const todayProgramRes = todayReservations.filter(r => r.program && r.program.trim() !== '');
  const monthProgramRes = monthReservations.filter(r => r.program && r.program.trim() !== '');
  const yearProgramRes = yearReservations.filter(r => r.program && r.program.trim() !== '');

  const programSummary = Object.entries(
    todayProgramRes.reduce<Record<string, number>>((acc, r) => {
      acc[r.program] = (acc[r.program] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => `${name} ${count}명`).join(', ');

  const todayMarketingConsents = members.filter(
    m => m.registeredAt.startsWith(mockToday) && m.marketingConsent === true
  ).length;
  const monthMarketingConsents = members.filter(
    m => m.registeredAt.startsWith(mockMonth) && m.marketingConsent === true
  ).length;
  const yearMarketingConsents = members.filter(
    m => m.registeredAt.startsWith(mockYear) && m.marketingConsent === true
  ).length;

  const weeklySalesData = mockDailySales.slice(0, 7).reverse().map(s => ({
    date: s.date.slice(5),
    매출: s.totalRevenue,
  }));

  const visitorData14 = mockDailySales.slice(0, 14).reverse().map(s => ({
    date: s.date.slice(5),
    신규: s.newVisitors,
    재방문: s.revisitors,
  }));

  const monthDailySalesChart = monthSalesData.slice().sort((a, b) => a.date.localeCompare(b.date)).map(s => ({
    date: s.date.slice(8),
    매출: s.totalRevenue,
  }));

  const monthVisitorChart = monthSalesData.slice().sort((a, b) => a.date.localeCompare(b.date)).map(s => ({
    date: s.date.slice(8),
    신규: s.newVisitors,
    재방문: s.revisitors,
  }));

  const yearMonthlySalesChart = useMemo(() => {
    const grouped: Record<string, number> = {};
    yearSalesData.forEach(s => {
      const m = parseInt(s.date.slice(5, 7));
      grouped[m] = (grouped[m] || 0) + s.totalRevenue;
    });
    const currentMonth = parseInt(mockToday.slice(5, 7));
    return Array.from({ length: currentMonth }, (_, i) => ({
      date: `${i + 1}월`,
      매출: grouped[i + 1] || 0,
    }));
  }, [yearSalesData]);

  const yearMonthlyVisitorChart = useMemo(() => {
    const grouped: Record<string, { new: number; revisit: number }> = {};
    yearSalesData.forEach(s => {
      const m = parseInt(s.date.slice(5, 7));
      if (!grouped[m]) grouped[m] = { new: 0, revisit: 0 };
      grouped[m].new += s.newVisitors;
      grouped[m].revisit += s.revisitors;
    });
    const currentMonth = parseInt(mockToday.slice(5, 7));
    return Array.from({ length: currentMonth }, (_, i) => ({
      date: `${i + 1}월`,
      신규: grouped[i + 1]?.new || 0,
      재방문: grouped[i + 1]?.revisit || 0,
    }));
  }, [yearSalesData]);

  const monthAvgRevisitRate = monthSalesData.length > 0
    ? Math.round(monthSalesData.reduce((s, d) => s + d.revisitRate, 0) / monthSalesData.length)
    : 0;
  const yearAvgRevisitRate = yearSalesData.length > 0
    ? Math.round(yearSalesData.reduce((s, d) => s + d.revisitRate, 0) / yearSalesData.length)
    : 0;

  const statusLabel: Record<string, string> = {
    confirmed: '대기',
    checked_in: '이용중',
    checked_out: '퇴장',
    cancelled: '취소',
  };

  const statusStyle: Record<string, string> = {
    checked_in: 'bg-blue-50 text-blue-700',
    confirmed: 'bg-amber-50 text-amber-700',
    checked_out: 'bg-zinc-100 text-zinc-500',
    cancelled: 'bg-red-50 text-red-700',
  };

  const kpis = period === 'today' ? [
    {
      label: '오늘 예약',
      value: String(todayReservations.length),
      unit: '건',
      sub: `체크인 ${checkedIn} · 대기 ${waiting}`,
      trend: '+12%',
      icon: null,
    },
    {
      label: '현재 이용중',
      value: String(checkedIn),
      unit: '명',
      sub: `퇴장 완료 ${checkedOut}명`,
      trend: null,
      icon: null,
    },
    {
      label: '오늘 매출',
      value: formatCurrency(todayRevenue),
      unit: '',
      sub: `유료 ${todayReservations.filter(r => r.paymentAmount > 0).length}건`,
      trend: '+8%',
      icon: null,
    },
    {
      label: '전체 멤버',
      value: String(members.length),
      unit: '명',
      sub: `활성 ${activeMembers}명`,
      trend: '+3',
      icon: null,
    },
    {
      label: '프로그램 참여',
      value: String(todayProgramRes.length),
      unit: '명',
      sub: programSummary || '참여 프로그램 없음',
      trend: null,
      icon: 'award' as const,
    },
    {
      label: '신규 마케팅동의',
      value: String(todayMarketingConsents),
      unit: '명',
      sub: '오늘 신규 멤버 중',
      trend: null,
      icon: 'userplus' as const,
    },
  ] : period === 'month' ? [
    {
      label: '월 예약',
      value: String(monthReservations.length),
      unit: '건',
      sub: `이번 달 누적`,
      trend: null,
      icon: null,
    },
    {
      label: '월 방문자',
      value: String(monthVisitors),
      unit: '명',
      sub: `일 평균 ${monthSalesData.length > 0 ? Math.round(monthVisitors / monthSalesData.length) : 0}명`,
      trend: null,
      icon: null,
    },
    {
      label: '월 매출',
      value: formatCurrency(monthRevenue),
      unit: '',
      sub: `이번 달 누적`,
      trend: null,
      icon: null,
    },
    {
      label: '전체 멤버',
      value: String(members.length),
      unit: '명',
      sub: `활성 ${activeMembers}명`,
      trend: '+3',
      icon: null,
    },
    {
      label: '프로그램 참여',
      value: String(monthProgramRes.length),
      unit: '명',
      sub: '이번 달 누적',
      trend: null,
      icon: 'award' as const,
    },
    {
      label: '마케팅동의',
      value: String(monthMarketingConsents),
      unit: '명',
      sub: '이번 달 신규 멤버 중',
      trend: null,
      icon: 'userplus' as const,
    },
  ] : [
    {
      label: '연 예약',
      value: String(yearReservations.length),
      unit: '건',
      sub: `올해 누적`,
      trend: null,
      icon: null,
    },
    {
      label: '연 방문자',
      value: String(yearVisitors),
      unit: '명',
      sub: `월 평균 ${yearSalesData.length > 0 ? Math.round(yearVisitors / (parseInt(mockToday.slice(5, 7)))) : 0}명`,
      trend: null,
      icon: null,
    },
    {
      label: '연 매출',
      value: formatCurrency(yearRevenue),
      unit: '',
      sub: `올해 누적`,
      trend: null,
      icon: null,
    },
    {
      label: '전체 멤버',
      value: String(members.length),
      unit: '명',
      sub: `활성 ${activeMembers}명`,
      trend: '+3',
      icon: null,
    },
    {
      label: '프로그램 참여',
      value: String(yearProgramRes.length),
      unit: '명',
      sub: '올해 누적',
      trend: null,
      icon: 'award' as const,
    },
    {
      label: '마케팅동의',
      value: String(yearMarketingConsents),
      unit: '명',
      sub: '올해 신규 멤버 중',
      trend: null,
      icon: 'userplus' as const,
    },
  ];

  const chartTitle = period === 'today' ? '주간 매출' : period === 'month' ? '이번 달 일별 매출' : '올해 월별 매출';
  const chartSubtitle = period === 'today' ? '최근 7일' : period === 'month' ? `${mockMonth}` : `${mockYear}년`;
  const chartData = period === 'today' ? weeklySalesData : period === 'month' ? monthDailySalesChart : yearMonthlySalesChart;

  const visitorTitle = period === 'today' ? '방문자 추이' : period === 'month' ? '이번 달 방문자 추이' : '올해 월별 방문자';
  const visitorSubtitle = period === 'today' ? '최근 14일' : period === 'month' ? `${mockMonth}` : `${mockYear}년`;
  const visitorChartData = period === 'today' ? visitorData14 : period === 'month' ? monthVisitorChart : yearMonthlyVisitorChart;

  const summaryItems = period === 'month' ? [
    { label: '총 방문자', value: `${monthVisitors}명` },
    { label: '총 매출', value: formatCurrency(monthRevenue) },
    { label: '평균 재방문율', value: `${monthAvgRevisitRate}%` },
    { label: '활성 멤버', value: `${activeMembers}명` },
  ] : [
    { label: '총 방문자', value: `${yearVisitors}명` },
    { label: '총 매출', value: formatCurrency(yearRevenue) },
    { label: '평균 재방문율', value: `${yearAvgRevisitRate}%` },
    { label: '활성 멤버', value: `${activeMembers}명` },
  ];

  const periodButtons: { key: Period; label: string }[] = [
    { key: 'today', label: '오늘' },
    { key: 'month', label: '월 누계' },
    { key: 'year', label: '연 누계' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            대시보드
          </h1>
          <p className="text-base text-zinc-500 mt-1.5">
            {todayDisplay}
          </p>
        </div>
        <div className="flex rounded-lg border border-[#D9D9D9] overflow-hidden">
          {periodButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setPeriod(btn.key)}
              className={`px-5 py-2 text-sm font-medium transition-colors ${
                period === btn.key
                  ? 'bg-[#282828] text-white'
                  : 'bg-white text-[#515151] hover:bg-zinc-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-zinc-100 shadow-sm px-7 py-7"
          >
            <div className="flex items-center gap-2 mb-5">
              {kpi.icon === 'award' && <Award size={16} className="text-[#FF4D00]" />}
              {kpi.icon === 'userplus' && <UserPlus size={16} className="text-[#FF4D00]" />}
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {kpi.label}
              </p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight text-zinc-900 leading-none">
                {kpi.value}
              </span>
              {kpi.unit && (
                <span className="text-base text-zinc-400 font-medium">
                  {kpi.unit}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 mt-4">
              {kpi.trend && (
                <span className="inline-flex items-center gap-0.5 text-sm font-bold text-[#FF4D00]">
                  <ArrowUpRight size={14} />
                  {kpi.trend}
                </span>
              )}
              <span className="text-sm text-zinc-500">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-zinc-900">{chartTitle}</h2>
          <span className="text-sm text-zinc-400">{chartSubtitle}</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barSize={period === 'year' ? 36 : 48}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
            <XAxis
              dataKey="date" fontSize={13} tickLine={false}
              axisLine={false} tick={{ fill: '#71717a' }}
            />
            <YAxis
              fontSize={12} tickLine={false} axisLine={false}
              tick={{ fill: '#a1a1aa' }}
              tickFormatter={v => `${(v / 10000).toFixed(0)}만`}
              width={48}
            />
            <Tooltip
              formatter={(v) => formatCurrency(Number(v))}
              contentStyle={{
                background: '#18181b', border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '14px', padding: '10px 16px',
                boxShadow: '0 4px 20px rgba(0,0,0,.12)',
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#a1a1aa', fontSize: '12px', marginBottom: '4px' }}
              cursor={{ fill: 'rgba(0,0,0,.02)' }}
            />
            <Bar dataKey="매출" fill="#27272a" radius={[6, 6, 6, 6]} activeBar={{ fill: '#FF4D00' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 bg-white rounded-xl border border-zinc-100 shadow-sm px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-zinc-900">{visitorTitle}</h2>
            <span className="text-sm text-zinc-400">{visitorSubtitle}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={visitorChartData}>
              <defs>
                <linearGradient id="gRevisit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#27272a" stopOpacity={0.05} />
                  <stop offset="100%" stopColor="#27272a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gAccent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4D00" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#FF4D00" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="date" fontSize={12} tickLine={false}
                axisLine={false} tick={{ fill: '#a1a1aa' }}
                interval={period === 'today' ? 2 : undefined}
              />
              <YAxis
                fontSize={12} tickLine={false} axisLine={false}
                tick={{ fill: '#a1a1aa' }} width={32}
              />
              <Tooltip
                contentStyle={{
                  background: '#18181b', border: 'none', borderRadius: '10px',
                  color: '#fff', fontSize: '14px', padding: '10px 16px',
                }}
                itemStyle={{ color: '#fff' }}
                labelStyle={{ color: '#a1a1aa', fontSize: '12px' }}
              />
              <Area
                type="monotone" dataKey="재방문" stroke="#d4d4d8"
                strokeWidth={2} fill="url(#gRevisit)" dot={false}
              />
              <Area
                type="monotone" dataKey="신규" stroke="#FF4D00"
                strokeWidth={2.5} fill="url(#gAccent)" dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-[2.5px] bg-[#FF4D00] rounded" />
              <span className="text-sm text-zinc-500">신규</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-[2.5px] bg-zinc-300 rounded" />
              <span className="text-sm text-zinc-500">재방문</span>
            </div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col gap-5">
          <div className="bg-white rounded-xl border border-zinc-100 shadow-sm px-7 py-7 flex-1">
            <h2 className="text-lg font-bold text-zinc-900 mb-6">
              {period === 'today' ? '이번 달 요약' : period === 'month' ? '이번 달 요약' : '올해 요약'}
            </h2>
            <div className="space-y-5">
              {summaryItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">{item.label}</span>
                  <span className="text-lg font-bold text-zinc-900">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {lowPasses.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-100 shadow-sm px-7 py-7">
              <div className="flex items-center gap-2 mb-5">
                <AlertCircle size={16} className="text-[#FF4D00]" />
                <h2 className="text-lg font-bold text-zinc-900">
                  이용권 알림
                </h2>
              </div>
              <div className="space-y-5">
                {lowPasses.map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-zinc-900">
                        {p.memberName}
                      </p>
                      <p className="text-sm text-zinc-500 mt-0.5">
                        {p.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-[#FF4D00] leading-none">
                        {p.remainingUses}
                      </span>
                      <p className="text-xs text-zinc-400 mt-1">남음</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {period === 'today' && (
        <div className="bg-white rounded-xl border border-zinc-100 shadow-sm px-8 py-8">
          <h2 className="text-lg font-bold text-zinc-900 mb-6">
            오늘 예약
          </h2>

          {todayReservations.length === 0 ? (
            <p className="py-16 text-center text-base text-zinc-400">
              예약이 없습니다
            </p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="pb-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">시간</th>
                  <th className="pb-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">예약자</th>
                  <th className="pb-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">상품 / 좌석</th>
                  <th className="pb-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">결제</th>
                  <th className="pb-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {todayReservations.map(r => (
                  <tr key={r.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                    <td className="py-5 text-sm font-mono text-zinc-500 w-20">
                      {r.time}
                    </td>
                    <td className="py-5 text-base font-semibold text-zinc-900">
                      {r.reserverName}
                    </td>
                    <td className="py-5 text-sm text-zinc-500">
                      {r.product} · {r.seat}
                    </td>
                    <td className="py-5 text-base font-semibold text-zinc-900 text-right">
                      {r.paymentAmount > 0 ? formatCurrency(r.paymentAmount) : '—'}
                    </td>
                    <td className="py-5 text-right">
                      <span
                        className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${
                          statusStyle[r.status] ?? 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {statusLabel[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

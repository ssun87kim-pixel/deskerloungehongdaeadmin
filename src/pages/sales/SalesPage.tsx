import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, BarChart3, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from 'recharts';
import { mockDailySales } from '../../utils/mockData';
import { formatCurrency } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import { exportToExcel } from '../../services/exportExcel';

const COLORS = ['#18181b', '#71717a', '#a1a1aa', '#d4d4d8', '#e4e4e7'];

export default function SalesPage() {
  const { reservations } = useData();
  const [period, setPeriod] = useState<'week' | 'month'>('month');
  const sales = mockDailySales;

  const sliced = period === 'week' ? sales.slice(0, 7) : sales;
  const reversed = [...sliced].reverse();

  const totalRevenue = sliced.reduce((s, d) => s + d.totalRevenue, 0);
  const totalVisitors = sliced.reduce((s, d) => s + d.totalVisitors, 0);
  const avgRevenue = Math.round(totalRevenue / sliced.length);
  const avgVisitors = Math.round(totalVisitors / sliced.length);
  const avgRevisitRate = Math.round(sliced.reduce((s, d) => s + d.revisitRate, 0) / sliced.length);

  const getNaverRevenue = (d: typeof sales[number]) => {
    const total = d.naverBookings + d.walkinBookings;
    return total > 0 ? Math.round(d.totalRevenue * d.naverBookings / total) : 0;
  };
  const getWalkinRevenue = (d: typeof sales[number]) => {
    return d.totalRevenue - getNaverRevenue(d);
  };
  const totalNaverRevenue = sliced.reduce((s, d) => s + getNaverRevenue(d), 0);
  const totalWalkinRevenue = sliced.reduce((s, d) => s + getWalkinRevenue(d), 0);

  const prevTotal = sales.slice(sliced.length, sliced.length * 2).reduce((s, d) => s + d.totalRevenue, 0);
  const changeRate = prevTotal > 0 ? Math.round(((totalRevenue - prevTotal) / prevTotal) * 100) : 0;

  const dailyData = reversed.map(d => ({
    date: d.date.slice(5),
    매출: d.totalRevenue,
    방문자: d.totalVisitors,
  }));

  const productRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    reservations.forEach(r => {
      if (r.paymentAmount > 0) {
        map[r.product] = (map[r.product] || 0) + r.paymentAmount;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reservations]);

  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    const sourceLabels: Record<string, string> = { naver: '네이버', walkin: '워크인', phone: '유선', other: '기타' };
    reservations.forEach(r => {
      const label = sourceLabels[r.source] || r.source;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reservations]);

  const visitorTrend = reversed.map(d => ({
    date: d.date.slice(5),
    신규: d.newVisitors,
    재방문: d.revisitors,
  }));

  const handleExcelDownload = () => {
    const headers = [
      '날짜', '총 방문자', '무료종일', '무료4시간', '무료2시간',
      '유료종일', '유료4시간', '유료2시간', '네이버', '워크인',
      '신규', '재방문', '재방문율(%)', '네이버매출', '매장매출', '총매출',
    ];

    const rows = reversed.map(d => [
      d.date,
      d.totalVisitors,
      d.freeFullDay,
      d.free4Hours,
      d.free2Hours,
      d.paidFullDay,
      d.paid4Hours,
      d.paid2Hours,
      d.naverBookings,
      d.walkinBookings,
      d.newVisitors,
      d.revisitors,
      d.revisitRate / 100,
      getNaverRevenue(d),
      getWalkinRevenue(d),
      d.totalRevenue,
    ]);

    const sumRow = [
      '합계',
      totalVisitors,
      sliced.reduce((s, d) => s + d.freeFullDay, 0),
      sliced.reduce((s, d) => s + d.free4Hours, 0),
      sliced.reduce((s, d) => s + d.free2Hours, 0),
      sliced.reduce((s, d) => s + d.paidFullDay, 0),
      sliced.reduce((s, d) => s + d.paid4Hours, 0),
      sliced.reduce((s, d) => s + d.paid2Hours, 0),
      sliced.reduce((s, d) => s + d.naverBookings, 0),
      sliced.reduce((s, d) => s + d.walkinBookings, 0),
      sliced.reduce((s, d) => s + d.newVisitors, 0),
      sliced.reduce((s, d) => s + d.revisitors, 0),
      avgRevisitRate / 100,
      totalNaverRevenue,
      totalWalkinRevenue,
      totalRevenue,
    ];

    rows.push(sumRow);

    const today = new Date();
    const yyyymmdd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    exportToExcel({
      filename: `데스커라운지홍대_매출데이터_${yyyymmdd}.xlsx`,
      sheets: [{
        name: '매출 데이터',
        headers,
        rows,
        columnWidths: [12, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 14, 14, 14],
        numberFormatColumns: [
          { col: 12, format: '0.0%' },
          { col: 13, format: '#,##0' },
          { col: 14, format: '#,##0' },
          { col: 15, format: '#,##0' },
        ],
      }],
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-zinc-900">매출 관리</h1>
          <p className="text-[15px] text-zinc-400 mt-2">매출 현황 및 분석</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExcelDownload}
            className="flex items-center gap-2 px-4 py-3 border border-zinc-200 rounded-xl text-[15px] text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            <Download size={16} />
            내보내기
          </button>
          <div className="flex bg-zinc-100 rounded-xl p-1.5">
            <button onClick={() => setPeriod('week')}
              className={`px-5 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${period === 'week' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
              주간
            </button>
            <button onClick={() => setPeriod('month')}
              className={`px-5 py-2.5 rounded-lg text-[15px] font-medium transition-colors ${period === 'month' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
              월간
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-7 border border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-zinc-400">총 매출</p>
            <DollarSign size={20} className="text-zinc-400" />
          </div>
          <p className="text-[28px] font-bold">{formatCurrency(totalRevenue)}</p>
          <p className="text-[13px] text-[#969696] mt-2">네이버 {formatCurrency(totalNaverRevenue)} / 매장 {formatCurrency(totalWalkinRevenue)}</p>
          <div className={`flex items-center gap-1.5 mt-1 text-[13px] ${changeRate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {changeRate >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            전기 대비 {changeRate > 0 ? '+' : ''}{changeRate}%
          </div>
        </div>
        <div className="bg-white rounded-2xl p-7 border border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-zinc-400">일 평균 매출</p>
            <BarChart3 size={20} className="text-zinc-400" />
          </div>
          <p className="text-[28px] font-bold">{formatCurrency(avgRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl p-7 border border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-zinc-400">일 평균 방문자</p>
            <Users size={20} className="text-zinc-400" />
          </div>
          <p className="text-[28px] font-bold">{avgVisitors}명</p>
          <p className="text-[13px] text-zinc-400 mt-2">총 {totalVisitors}명</p>
        </div>
        <div className="bg-white rounded-2xl p-7 border border-zinc-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] text-zinc-400">평균 재방문율</p>
            <TrendingUp size={20} className="text-zinc-400" />
          </div>
          <p className="text-[28px] font-bold">{avgRevisitRate}%</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <div className="lg:col-span-2 bg-white rounded-2xl p-7 border border-zinc-200">
          <h3 className="text-[16px] font-bold text-zinc-900 mb-6">일별 매출 추이</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} tickFormatter={v => `${(v / 10000).toFixed(0)}만`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Bar dataKey="매출" fill="#18181b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-7 border border-zinc-200">
          <h3 className="text-[16px] font-bold text-zinc-900 mb-6">상품별 매출 비율</h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie data={productRevenue} cx="50%" cy="50%" innerRadius={55} outerRadius={100} dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {productRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <div className="lg:col-span-2 bg-white rounded-2xl p-7 border border-zinc-200">
          <h3 className="text-[16px] font-bold text-zinc-900 mb-6">신규 vs 재방문 추이</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitorTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" fontSize={12} tickLine={false} />
              <YAxis fontSize={12} tickLine={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="신규" stroke="#18181b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="재방문" stroke="#a1a1aa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-7 border border-zinc-200">
          <h3 className="text-[16px] font-bold text-zinc-900 mb-6">유입 경로 분석</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sourceData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Sales Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="px-7 py-5 border-b border-zinc-100">
          <h3 className="text-[16px] font-bold text-zinc-900">일별 매출 상세</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/50">
                <th className="text-left px-6 py-4 font-medium text-[14px] text-zinc-500">날짜</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">총 방문자</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">유료종일</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">4시간</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">2시간</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">무료</th>
                <th className="text-center px-6 py-4 font-medium text-[14px] text-zinc-500">재방문율</th>
                <th className="text-right px-6 py-4 font-medium text-[14px] text-zinc-500">네이버 매출</th>
                <th className="text-right px-6 py-4 font-medium text-[14px] text-zinc-500">매장 매출</th>
                <th className="text-right px-6 py-4 font-medium text-[14px] text-zinc-500">매출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {reversed.map(d => (
                <tr key={d.date} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-5 text-[15px] font-medium">{d.date}</td>
                  <td className="px-6 py-5 text-center text-[15px]">{d.totalVisitors}명</td>
                  <td className="px-6 py-5 text-center text-[15px]">{d.paidFullDay}</td>
                  <td className="px-6 py-5 text-center text-[15px]">{d.paid4Hours}</td>
                  <td className="px-6 py-5 text-center text-[15px]">{d.paid2Hours}</td>
                  <td className="px-6 py-5 text-center text-[15px] text-zinc-400">{d.freeFullDay + d.free4Hours + d.free2Hours}</td>
                  <td className="px-6 py-5 text-center text-[15px]">{d.revisitRate}%</td>
                  <td className="px-6 py-5 text-right text-[15px] text-[#515151]">{formatCurrency(getNaverRevenue(d))}</td>
                  <td className="px-6 py-5 text-right text-[15px] text-[#515151]">{formatCurrency(getWalkinRevenue(d))}</td>
                  <td className="px-6 py-5 text-right text-[15px] font-semibold">{formatCurrency(d.totalRevenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-50 font-bold">
                <td className="px-6 py-5 text-[15px]">합계</td>
                <td className="px-6 py-5 text-center text-[15px]">{totalVisitors}명</td>
                <td className="px-6 py-5 text-center text-[15px]">{sliced.reduce((s, d) => s + d.paidFullDay, 0)}</td>
                <td className="px-6 py-5 text-center text-[15px]">{sliced.reduce((s, d) => s + d.paid4Hours, 0)}</td>
                <td className="px-6 py-5 text-center text-[15px]">{sliced.reduce((s, d) => s + d.paid2Hours, 0)}</td>
                <td className="px-6 py-5 text-center text-[15px] text-zinc-400">{sliced.reduce((s, d) => s + d.freeFullDay + d.free4Hours + d.free2Hours, 0)}</td>
                <td className="px-6 py-5 text-center text-[15px]">{avgRevisitRate}%</td>
                <td className="px-6 py-5 text-right text-[15px]">{formatCurrency(totalNaverRevenue)}</td>
                <td className="px-6 py-5 text-right text-[15px]">{formatCurrency(totalWalkinRevenue)}</td>
                <td className="px-6 py-5 text-right text-[15px]">{formatCurrency(totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

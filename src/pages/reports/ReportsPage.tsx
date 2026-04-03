import { useState, useRef, useMemo, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { FileText, Receipt, Calendar, FileArchive, Download, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { exportToExcel } from '../../services/exportExcel';
import { exportToPdf } from '../../services/exportPdf';
import { mockDailySales } from '../../utils/mockData';
import { formatCurrency } from '../../utils/helpers';
import type { ShiftType } from '../../types';
import JSZip from 'jszip';

const now = new Date();

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}월`,
}));

const yearOptions = [now.getFullYear() - 1, now.getFullYear()];

const SHIFT_LABELS: Record<ShiftType, string> = {
  open: '오픈',
  middle: '미들',
  close: '마감',
  off: '휴무',
  custom: '직접',
};

const documents = [
  { key: 'report', title: '운영보고서', format: 'PDF', icon: FileText },
  { key: 'expense', title: '지출 내역', format: 'Excel', icon: Receipt },
  { key: 'schedule', title: '근무 스케줄', format: 'Excel', icon: Calendar },
  { key: 'receipts', title: '영수증 모음', format: 'ZIP', icon: FileArchive },
] as const;

type DocKey = (typeof documents)[number]['key'];

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export default function ReportsPage() {
  const { user } = useAuth();
  const { expenses, members, passes, staffMembers, scheduleEntries } = useData();

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [specialNotes, setSpecialNotes] = useState('');
  const [nextMonthPlan, setNextMonthPlan] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const pdfRef = useRef<HTMLDivElement>(null);

  if (user?.role === 'staff') {
    return <Navigate to="/" replace />;
  }

  const selectedMonth = `${year}-${String(month).padStart(2, '0')}`;
  const shortYear = String(year).slice(2);

  const monthlySales = mockDailySales.filter(s => s.date.startsWith(selectedMonth));
  const totalRevenue = monthlySales.reduce((s, d) => s + d.totalRevenue, 0);
  const naverRevenue = Math.round(totalRevenue * 0.7);
  const storeRevenue = totalRevenue - naverRevenue;
  const dailyAvgRevenue = monthlySales.length > 0 ? Math.round(totalRevenue / monthlySales.length) : 0;

  const totalVisitors = monthlySales.reduce((s, d) => s + d.totalVisitors, 0);
  const newVisitors = monthlySales.reduce((s, d) => s + d.newVisitors, 0);
  const revisitors = monthlySales.reduce((s, d) => s + d.revisitors, 0);
  const revisitRate = totalVisitors > 0 ? Math.round((revisitors / totalVisitors) * 100) : 0;

  const activeMembers = members.filter(m => m.membershipStatus === 'active').length;
  const inactiveMembers = members.filter(m => m.membershipStatus === 'inactive').length;
  const dormantMembers = members.filter(m => m.membershipStatus === 'dormant').length;

  const activePasses = passes.filter(p => p.status === 'active').length;
  const fullyUsedPasses = passes.filter(p => p.status === 'fully_used').length;
  const expiredPasses = passes.filter(p => p.status === 'expired').length;

  const filteredExpenses = expenses
    .filter(e => e.date.startsWith(selectedMonth))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const activeStaff = staffMembers.filter(s => s.isActive);
  const daysInMonth = new Date(year, month, 0).getDate();

  const entryMap = useMemo(() => {
    const map = new Map<string, typeof scheduleEntries[number]>();
    for (const e of scheduleEntries) {
      if (e.date.startsWith(selectedMonth) && e.status === 'confirmed') {
        map.set(`${e.staffId}_${e.date}`, e);
      }
    }
    return map;
  }, [scheduleEntries, selectedMonth]);

  const getEntry = useCallback(
    (staffId: string, day: number) => {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      return entryMap.get(`${staffId}_${dateStr}`) || null;
    },
    [entryMap, selectedMonth],
  );

  const setLoadingKey = (key: string, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const handleReportPdf = async () => {
    setLoadingKey('report', true);
    try {
      const el = pdfRef.current;
      if (!el) return;
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.top = '0';
      el.style.width = '800px';
      el.style.display = 'block';

      await new Promise(r => setTimeout(r, 100));
      await exportToPdf('pdf-report-area', `데스커라운지홍대_운영보고서_${shortYear}년${month}월.pdf`);

      el.style.display = 'none';
      el.style.position = '';
      el.style.left = '';
      el.style.width = '';
    } finally {
      setLoadingKey('report', false);
    }
  };

  const handleExpenseExcel = async () => {
    setLoadingKey('expense', true);
    try {
      const supplySum = filteredExpenses.reduce((s, e) => s + e.supplyAmount, 0);
      const taxSum = filteredExpenses.reduce((s, e) => s + e.tax, 0);
      const totalSum = filteredExpenses.reduce((s, e) => s + e.totalAmount, 0);

      const rows = filteredExpenses.map((e, i) => [
        i + 1,
        e.date,
        e.category,
        e.itemName,
        e.purpose,
        e.vendor,
        e.supplyAmount,
        e.tax,
        e.totalAmount,
        e.paymentMethod,
        e.notes,
      ]);
      rows.push([
        '', '', '', '', '', '합계',
        supplySum, taxSum, totalSum, '', '',
      ]);

      const salesByMonth: Record<string, { naver: number; store: number }> = {};
      for (const s of mockDailySales) {
        const m = s.date.substring(0, 7);
        if (!salesByMonth[m]) salesByMonth[m] = { naver: 0, store: 0 };
        salesByMonth[m].naver += Math.round(s.totalRevenue * 0.7);
        salesByMonth[m].store += Math.round(s.totalRevenue * 0.3);
      }

      const salesRows: (string | number)[][] = [];
      const sortedMonths = Object.keys(salesByMonth).sort();
      for (const m of sortedMonths) {
        const mNum = parseInt(m.split('-')[1], 10);
        const d = salesByMonth[m];
        salesRows.push([`${mNum}월`, d.naver, d.store, d.naver + d.store]);
      }

      exportToExcel({
        filename: `${shortYear}년${month}월 운영 지출 내역.xlsx`,
        sheets: [
          {
            name: `${shortYear}. ${month}월`,
            headers: ['번호', '구매일자', '대분류', '품명', '용도', '업체명', '공급가액', '부가세', '합계', '결제수단', '비고'],
            rows,
            columnWidths: [6, 12, 8, 20, 20, 14, 12, 12, 12, 14, 20],
            numberFormatColumns: [
              { col: 6, format: '#,##0' },
              { col: 7, format: '#,##0' },
              { col: 8, format: '#,##0' },
            ],
          },
          {
            name: '매출 종합',
            headers: ['월', '네이버 매출', '매장 매출', '총합'],
            rows: salesRows,
            columnWidths: [8, 14, 14, 14],
            numberFormatColumns: [
              { col: 1, format: '#,##0' },
              { col: 2, format: '#,##0' },
              { col: 3, format: '#,##0' },
            ],
          },
        ],
      });
    } finally {
      setLoadingKey('expense', false);
    }
  };

  const handleScheduleExcel = async () => {
    setLoadingKey('schedule', true);
    try {
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const firstDow = new Date(year, month - 1, 1).getDay();
      const getWeekNumber = (day: number): number => Math.ceil((day + firstDow) / 7);

      // 주차별 날짜 배열
      const weeks: { weekNum: number; days: (number | null)[] }[] = [];
      let cw: (number | null)[] = [];
      for (let i = 0; i < firstDow; i++) cw.push(null);
      for (let d = 1; d <= daysInMonth; d++) {
        cw.push(d);
        if (cw.length === 7) { weeks.push({ weekNum: weeks.length + 1, days: cw }); cw = []; }
      }
      if (cw.length > 0) { while (cw.length < 7) cw.push(null); weeks.push({ weekNum: weeks.length + 1, days: cw }); }

      const calHeaders = ['', '월', '화', '수', '목', '금', '토', '일'];
      const calRows: (string | number | null)[][] = [];
      const dowOrder = [1, 2, 3, 4, 5, 6, 0];

      for (const week of weeks) {
        const dateRow: (string | number | null)[] = [`${week.weekNum}주차`];
        for (const dow of dowOrder) {
          const day = week.days[dow];
          dateRow.push(day ? `${month}/${day}(${dayNames[dow]})` : '');
        }
        calRows.push(dateRow);

        for (const staff of activeStaff) {
          const staffRow: (string | number | null)[] = [staff.name];
          for (const dow of dowOrder) {
            const day = week.days[dow];
            if (!day) { staffRow.push(''); continue; }
            const entry = getEntry(staff.id, day);
            if (entry && entry.shift !== 'off') {
              staffRow.push(entry.startTime && entry.endTime ? `${entry.startTime}~${entry.endTime}` : SHIFT_LABELS[entry.shift]);
            } else if (entry && entry.shift === 'off') {
              staffRow.push('휴무');
            } else { staffRow.push(''); }
          }
          calRows.push(staffRow);
        }
        calRows.push(['', '', '', '', '', '', '', '']);
      }

      const confirmedForMonth = scheduleEntries.filter(e => e.date.startsWith(selectedMonth) && e.status === 'confirmed' && e.notes);
      if (confirmedForMonth.length > 0) {
        calRows.push(['특이사항', '', '', '', '', '', '', '']);
        for (const e of confirmedForMonth) {
          const d = parseInt(e.date.split('-')[2], 10);
          const dow = new Date(year, month - 1, d).getDay();
          calRows.push([`${month}/${d}(${dayNames[dow]})`, e.staffName, e.notes, '', '', '', '', '']);
        }
      }

      const summaryHeaders = ['직원', '1주차', '2주차', '3주차', '4주차', '5주차', '총 근무일', '총 근무시간', '총 초과시간'];
      const summaryRows = activeStaff.map(staff => {
        const weeklyDays: number[] = [0, 0, 0, 0, 0];
        let totalWorkDays = 0, totalWorkHours = 0, totalOvertimeHours = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const entry = getEntry(staff.id, d);
          if (entry && entry.shift !== 'off' && entry.workHours > 0) {
            const wk = getWeekNumber(d) - 1;
            if (wk >= 0 && wk < 5) weeklyDays[wk]++;
            totalWorkDays++; totalWorkHours += entry.workHours; totalOvertimeHours += entry.overtimeHours;
          }
        }
        return [staff.name, weeklyDays[0], weeklyDays[1], weeklyDays[2], weeklyDays[3], weeklyDays[4], totalWorkDays, Math.round(totalWorkHours * 10) / 10, Math.round(totalOvertimeHours * 10) / 10];
      });

      exportToExcel({
        filename: `데스커라운지홍대_근무스케쥴_${shortYear}년${month}월.xlsx`,
        sheets: [
          { name: `${month}월 스케줄`, headers: calHeaders, rows: calRows, columnWidths: [10, 18, 18, 18, 18, 18, 18, 18] },
          { name: '근무집계', headers: summaryHeaders, rows: summaryRows, columnWidths: [10, 8, 8, 8, 8, 8, 10, 10, 10], numberFormatColumns: [{ col: 7, format: '#,##0.0' }, { col: 8, format: '#,##0.0' }] },
        ],
      });
    } finally {
      setLoadingKey('schedule', false);
    }
  };

  const handleReceiptsZip = async () => {
    setLoadingKey('receipts', true);
    try {
      const withReceipt = filteredExpenses.filter(e => e.receiptImageUrl);
      if (withReceipt.length === 0) {
        alert('첨부된 영수증이 없습니다.');
        return;
      }

      const zip = new JSZip();
      for (let i = 0; i < withReceipt.length; i++) {
        const e = withReceipt[i];
        const idx = filteredExpenses.indexOf(e) + 1;
        const dateStr = e.date.replace(/-/g, '').substring(2);
        try {
          const resp = await fetch(e.receiptImageUrl!);
          const blob = await resp.blob();
          const filename = `${idx}_${dateStr}_${e.itemName}.jpg`;
          zip.file(filename, blob);
        } catch {
          // skip files that can't be fetched
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${shortYear}년${month}월_영수증.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoadingKey('receipts', false);
    }
  };

  const downloadHandlers: Record<DocKey, () => Promise<void>> = {
    report: handleReportPdf,
    expense: handleExpenseExcel,
    schedule: handleScheduleExcel,
    receipts: handleReceiptsZip,
  };

  const handleDownload = (key: DocKey) => {
    downloadHandlers[key]();
  };

  const handleDownloadAll = async () => {
    setLoadingKey('all', true);
    try {
      await handleReportPdf();
      await delay(500);
      await handleExpenseExcel();
      await delay(500);
      await handleScheduleExcel();
      await delay(500);
      await handleReceiptsZip();
    } finally {
      setLoadingKey('all', false);
    }
  };

  const isAnyLoading = Object.values(loading).some(Boolean);

  const pdfSectionStyle: React.CSSProperties = {
    padding: '16px 24px',
    fontFamily: 'sans-serif',
  };

  const pdfTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  };

  const pdfThStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    backgroundColor: '#F5F5F5',
    borderBottom: '1px solid #D9D9D9',
    fontWeight: 600,
    color: '#282828',
  };

  const pdfTdStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid #EBEBEB',
    color: '#515151',
  };

  const pdfTdRightStyle: React.CSSProperties = {
    ...pdfTdStyle,
    textAlign: 'right',
    fontWeight: 600,
    color: '#282828',
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-zinc-900">보고서</h1>
          <p className="text-[15px] text-zinc-400 mt-2">월간 운영 보고서 생성 및 다운로드</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-[#D9D9D9] rounded-lg px-3 py-2 text-[14px] text-zinc-700 bg-white"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-[#D9D9D9] rounded-lg px-3 py-2 text-[14px] text-zinc-700 bg-white"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {documents.map((doc) => {
          const Icon = doc.icon;
          const isLoading = loading[doc.key] || false;
          return (
            <div
              key={doc.key}
              className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <Icon size={20} className="text-zinc-500" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-zinc-900">{doc.title}</p>
                  <p className="text-[13px] text-zinc-400 mt-0.5">{doc.format}</p>
                </div>
              </div>

              <button
                onClick={() => handleDownload(doc.key)}
                disabled={isLoading || isAnyLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    다운로드
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-[14px] font-semibold text-zinc-900 mb-2">
            운영 특이사항
          </label>
          <textarea
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder="이번 달 운영 중 특이사항을 입력하세요"
            className="w-full border border-[#D9D9D9] focus:border-[#336DFF] focus:outline-none rounded-lg p-4 min-h-[120px] text-[14px] text-zinc-700 placeholder:text-zinc-400 resize-y transition-colors"
          />
        </div>
        <div>
          <label className="block text-[14px] font-semibold text-zinc-900 mb-2">
            다음 달 운영 계획
          </label>
          <textarea
            value={nextMonthPlan}
            onChange={(e) => setNextMonthPlan(e.target.value)}
            placeholder="다음 달 계획을 입력하세요"
            className="w-full border border-[#D9D9D9] focus:border-[#336DFF] focus:outline-none rounded-lg p-4 min-h-[120px] text-[14px] text-zinc-700 placeholder:text-zinc-400 resize-y transition-colors"
          />
        </div>
      </div>

      <button
        onClick={handleDownloadAll}
        disabled={isAnyLoading}
        className="bg-[#282828] text-white w-full py-4 rounded-lg text-[15px] font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading['all'] ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            다운로드 중...
          </>
        ) : (
          <>
            <Download size={18} />
            전체 다운로드
          </>
        )}
      </button>

      <div
        ref={pdfRef}
        id="pdf-report-area"
        style={{ display: 'none', backgroundColor: '#ffffff' }}
      >
        <div data-pdf-section style={{ ...pdfSectionStyle, paddingTop: '32px', paddingBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#282828', marginBottom: '4px' }}>
            DESKER LOUNGE HONGDAE 운영보고서
          </h1>
          <p style={{ fontSize: '15px', color: '#969696' }}>
            {year}년 {month}월
          </p>
        </div>

        <div data-pdf-section style={pdfSectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#282828', marginBottom: '12px' }}>
            1. 매출 요약
          </h2>
          <table style={pdfTableStyle}>
            <thead>
              <tr>
                <th style={pdfThStyle}>항목</th>
                <th style={{ ...pdfThStyle, textAlign: 'right' }}>금액</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={pdfTdStyle}>총 매출</td><td style={pdfTdRightStyle}>{formatCurrency(totalRevenue)}</td></tr>
              <tr><td style={pdfTdStyle}>네이버 매출</td><td style={pdfTdRightStyle}>{formatCurrency(naverRevenue)}</td></tr>
              <tr><td style={pdfTdStyle}>매장 매출</td><td style={pdfTdRightStyle}>{formatCurrency(storeRevenue)}</td></tr>
              <tr><td style={pdfTdStyle}>일평균 매출</td><td style={pdfTdRightStyle}>{formatCurrency(dailyAvgRevenue)}</td></tr>
            </tbody>
          </table>
        </div>

        <div data-pdf-section style={pdfSectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#282828', marginBottom: '12px' }}>
            2. 방문자 요약
          </h2>
          <table style={pdfTableStyle}>
            <thead>
              <tr>
                <th style={pdfThStyle}>항목</th>
                <th style={{ ...pdfThStyle, textAlign: 'right' }}>수치</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={pdfTdStyle}>총 방문자</td><td style={pdfTdRightStyle}>{totalVisitors}명</td></tr>
              <tr><td style={pdfTdStyle}>신규 방문자</td><td style={pdfTdRightStyle}>{newVisitors}명</td></tr>
              <tr><td style={pdfTdStyle}>재방문자</td><td style={pdfTdRightStyle}>{revisitors}명</td></tr>
              <tr><td style={pdfTdStyle}>재방문율</td><td style={pdfTdRightStyle}>{revisitRate}%</td></tr>
            </tbody>
          </table>
        </div>

        <div data-pdf-section style={pdfSectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#282828', marginBottom: '12px' }}>
            3. 멤버 현황
          </h2>
          <table style={pdfTableStyle}>
            <thead>
              <tr>
                <th style={pdfThStyle}>상태</th>
                <th style={{ ...pdfThStyle, textAlign: 'right' }}>인원</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={pdfTdStyle}>활성</td><td style={pdfTdRightStyle}>{activeMembers}명</td></tr>
              <tr><td style={pdfTdStyle}>비활성</td><td style={pdfTdRightStyle}>{inactiveMembers}명</td></tr>
              <tr><td style={pdfTdStyle}>휴면</td><td style={pdfTdRightStyle}>{dormantMembers}명</td></tr>
            </tbody>
          </table>
        </div>

        <div data-pdf-section style={pdfSectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#282828', marginBottom: '12px' }}>
            4. 이용권 현황
          </h2>
          <table style={pdfTableStyle}>
            <thead>
              <tr>
                <th style={pdfThStyle}>상태</th>
                <th style={{ ...pdfThStyle, textAlign: 'right' }}>수량</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={pdfTdStyle}>활성</td><td style={pdfTdRightStyle}>{activePasses}건</td></tr>
              <tr><td style={pdfTdStyle}>소진</td><td style={pdfTdRightStyle}>{fullyUsedPasses}건</td></tr>
              <tr><td style={pdfTdStyle}>만료</td><td style={pdfTdRightStyle}>{expiredPasses}건</td></tr>
            </tbody>
          </table>
        </div>

        <div data-pdf-section style={pdfSectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#282828', marginBottom: '12px' }}>
            5. 운영 특이사항
          </h2>
          <div style={{ fontSize: '14px', color: '#515151', whiteSpace: 'pre-wrap', lineHeight: 1.7, minHeight: '40px' }}>
            {specialNotes || '(작성된 내용 없음)'}
          </div>
        </div>

        <div data-pdf-section style={pdfSectionStyle}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#282828', marginBottom: '12px' }}>
            6. 다음 달 계획
          </h2>
          <div style={{ fontSize: '14px', color: '#515151', whiteSpace: 'pre-wrap', lineHeight: 1.7, minHeight: '40px' }}>
            {nextMonthPlan || '(작성된 내용 없음)'}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo, useCallback } from 'react';
import { Download, X, Copy, Settings, Check } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { exportToExcel } from '../../services/exportExcel';
import type { ShiftType, ScheduleEntry } from '../../types';

const SHIFT_PRESETS: Record<string, { start: string; end: string }> = {
  open: { start: '09:00', end: '18:00' },
  middle: { start: '10:00', end: '20:30' },
  close: { start: '12:00', end: '21:00' },
};

const SHIFT_LABELS: Record<ShiftType, string> = {
  open: '오픈',
  middle: '미들',
  close: '마감',
  off: '휴무',
  custom: '직접',
};

const SHIFT_SHORT: Record<ShiftType, string> = {
  open: '오',
  middle: '미',
  close: '마',
  off: '휴',
  custom: '직',
};

const SHIFT_BG: Record<ShiftType, string> = {
  open: 'rgba(51,109,255,0.08)',
  middle: 'rgba(0,180,65,0.08)',
  close: 'rgba(81,81,81,0.08)',
  off: '#F5F5F5',
  custom: 'rgba(51,109,255,0.04)',
};

const SHIFT_TEXT: Record<ShiftType, string> = {
  open: '#336DFF',
  middle: '#00B441',
  close: '#515151',
  off: '#969696',
  custom: '#336DFF',
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const WISH_SHIFTS: { value: ShiftType | 'any'; label: string; short: string }[] = [
  { value: 'open', label: '오픈 희망', short: '오' },
  { value: 'middle', label: '미들 희망', short: '미' },
  { value: 'close', label: '마감 희망', short: '마' },
  { value: 'off', label: '휴무 희망', short: '휴' },
  { value: 'any', label: '상관없음', short: '-' },
];

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  for (let m = 1; m <= 12; m++) {
    const val = `2026-${String(m).padStart(2, '0')}`;
    options.push({ value: val, label: `2026년 ${m}월` });
  }
  return options;
}

const monthOptions = getMonthOptions();

function getDaysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function calcWorkHours(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em - sh * 60 - sm) / 60;
  return Math.round(Math.max(0, diff) * 10) / 10;
}

function getWeekNumber(day: number, firstDayOfWeek: number): number {
  return Math.ceil((day + firstDayOfWeek) / 7);
}

function getWeekRanges(yearMonth: string): { week: number; startDay: number; endDay: number }[] {
  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow = new Date(y, m - 1, 1).getDay();
  const ranges: { week: number; startDay: number; endDay: number }[] = [];
  let currentWeek = 1;
  let startDay = 1;
  const firstSat = 7 - firstDow;
  if (firstSat < 7) {
    ranges.push({ week: currentWeek, startDay: 1, endDay: Math.min(firstSat, daysInMonth) });
    startDay = firstSat + 1;
    currentWeek++;
  }
  while (startDay <= daysInMonth) {
    const endDay = Math.min(startDay + 6, daysInMonth);
    ranges.push({ week: currentWeek, startDay, endDay });
    startDay = endDay + 1;
    currentWeek++;
  }
  return ranges;
}

interface EditingCell {
  staffId: string;
  date: string;
  entry: ScheduleEntry | null;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const isStaff = user?.role === 'staff';

  if (isStaff) {
    return <StaffScheduleView />;
  }
  return <ManagerScheduleView />;
}

function StaffScheduleView() {
  const { user } = useAuth();
  const {
    staffMembers,
    scheduleEntries,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
  } = useData();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [wishPopup, setWishPopup] = useState<{ day: number } | null>(null);

  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(selectedMonth);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const staffId = useMemo(() => {
    const staff = staffMembers.find(s => s.name === user?.name);
    return staff?.id || '';
  }, [staffMembers, user]);

  const myWishEntries = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const e of scheduleEntries) {
      if (e.staffId === staffId && e.date.startsWith(selectedMonth) && e.status === 'wish') {
        map.set(e.date, e);
      }
    }
    return map;
  }, [scheduleEntries, selectedMonth, staffId]);

  const myConfirmedEntries = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const e of scheduleEntries) {
      if (e.staffId === staffId && e.date.startsWith(selectedMonth) && e.status === 'confirmed') {
        map.set(e.date, e);
      }
    }
    return map;
  }, [scheduleEntries, selectedMonth, staffId]);

  const hasConfirmed = myConfirmedEntries.size > 0;

  const handleWishSelect = (day: number, value: ShiftType | 'any') => {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const existing = myWishEntries.get(dateStr);
    const shift: ShiftType = value === 'any' ? 'custom' : value;
    const preset = SHIFT_PRESETS[shift];

    if (existing) {
      if (value === 'any') {
        updateScheduleEntry(existing.id, {
          shift: 'custom',
          startTime: null,
          endTime: null,
          workHours: 0,
          overtimeHours: 0,
          notes: '상관없음',
        });
      } else {
        updateScheduleEntry(existing.id, {
          shift,
          startTime: shift === 'off' ? null : (preset?.start || null),
          endTime: shift === 'off' ? null : (preset?.end || null),
          workHours: shift === 'off' ? 0 : calcWorkHours(preset?.start || null, preset?.end || null),
          overtimeHours: 0,
          notes: '',
        });
      }
    } else {
      addScheduleEntry({
        staffId,
        staffName: user?.name || '',
        date: dateStr,
        shift,
        startTime: value === 'any' || shift === 'off' ? null : (preset?.start || null),
        endTime: value === 'any' || shift === 'off' ? null : (preset?.end || null),
        workHours: value === 'any' || shift === 'off' ? 0 : calcWorkHours(preset?.start || null, preset?.end || null),
        overtimeHours: 0,
        notes: value === 'any' ? '상관없음' : '',
        status: 'wish',
      });
    }
    setWishPopup(null);
  };

  const handleDeleteWish = (day: number) => {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const existing = myWishEntries.get(dateStr);
    if (existing) {
      deleteScheduleEntry(existing.id);
    }
    setWishPopup(null);
  };

  const getWishDisplay = (entry: ScheduleEntry | undefined): { short: string; color: string; bg: string } => {
    if (!entry) return { short: '', color: '#B3B3B3', bg: 'transparent' };
    if (entry.notes === '상관없음') return { short: '-', color: '#969696', bg: '#F5F5F5' };
    return {
      short: SHIFT_SHORT[entry.shift] || '-',
      color: SHIFT_TEXT[entry.shift] || '#969696',
      bg: SHIFT_BG[entry.shift] || 'transparent',
    };
  };

  const calendarWeeks: number[][] = useMemo(() => {
    const weeks: number[][] = [];
    let week: number[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) week.push(0);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(0);
      weeks.push(week);
    }
    return weeks;
  }, [daysInMonth, firstDayOfWeek]);

  const inputClass = 'px-3 py-2.5 border border-[#D9D9D9] rounded-lg text-[14px] outline-none focus:border-[#336DFF] transition-colors';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#282828]">근무 스케줄</h1>
          <p className="text-[14px] text-[#969696] mt-1">내 희망 스케줄을 입력하고 확정된 스케줄을 확인하세요</p>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className={inputClass + ' min-w-[160px]'}
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E5E5]">
          <h2 className="text-[15px] font-bold text-[#282828]">내 희망 스케줄 입력</h2>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3 text-[12px]">
            {WISH_SHIFTS.map(ws => (
              <span
                key={ws.value}
                className="flex items-center gap-1.5 px-2 py-1 rounded"
                style={{
                  backgroundColor: ws.value === 'any' ? '#F5F5F5' : SHIFT_BG[ws.value as ShiftType] || '#F5F5F5',
                  color: ws.value === 'any' ? '#969696' : SHIFT_TEXT[ws.value as ShiftType] || '#969696',
                }}
              >
                {ws.short} {ws.label}
              </span>
            ))}
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#F5F5F5]">
                {DAY_NAMES.map((d, i) => (
                  <th
                    key={d}
                    className={`px-2 py-2 text-[13px] font-medium text-center ${i === 0 ? 'text-red-400' : i === 6 ? 'text-red-400' : 'text-[#515151]'}`}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarWeeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => {
                    if (day === 0) {
                      return <td key={di} className="border border-[#E5E5E5] h-[60px]" />;
                    }
                    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                    const wishEntry = myWishEntries.get(dateStr);
                    const display = getWishDisplay(wishEntry);
                    const isWeekend = di === 0 || di === 6;

                    return (
                      <td
                        key={di}
                        className="border border-[#E5E5E5] h-[60px] cursor-pointer hover:bg-[#FAFAFA] relative"
                        onClick={() => setWishPopup(wishPopup?.day === day ? null : { day })}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className={`text-[12px] ${isWeekend ? 'text-red-400' : 'text-[#515151]'}`}>{day}</span>
                          {wishEntry ? (
                            <span
                              className="mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium"
                              style={{ backgroundColor: display.bg, color: display.color }}
                            >
                              {display.short}
                            </span>
                          ) : (
                            <span className="mt-0.5 text-[10px] text-[#D9D9D9]">+</span>
                          )}
                        </div>
                        {wishPopup?.day === day && (
                          <div
                            className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-[#D9D9D9] rounded-lg shadow-lg p-2 min-w-[130px]"
                            onClick={e => e.stopPropagation()}
                          >
                            {WISH_SHIFTS.map(ws => (
                              <button
                                key={ws.value}
                                onClick={() => handleWishSelect(day, ws.value)}
                                className={`w-full text-left px-3 py-1.5 text-[13px] rounded hover:bg-[#F5F5F5] transition-colors ${
                                  wishEntry && ((ws.value === 'any' && wishEntry.notes === '상관없음') || (ws.value !== 'any' && wishEntry.shift === ws.value && wishEntry.notes !== '상관없음'))
                                    ? 'font-bold text-[#336DFF]'
                                    : 'text-[#515151]'
                                }`}
                              >
                                {ws.label}
                              </button>
                            ))}
                            {wishEntry && (
                              <button
                                onClick={() => handleDeleteWish(day)}
                                className="w-full text-left px-3 py-1.5 text-[13px] rounded hover:bg-red-50 text-red-500 mt-1 border-t border-[#E5E5E5] pt-1.5"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#E5E5E5]">
          <h2 className="text-[15px] font-bold text-[#282828]">확정된 스케줄</h2>
        </div>
        {hasConfirmed ? (
          <div className="p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5]">
                  {DAY_NAMES.map((d, i) => (
                    <th
                      key={d}
                      className={`px-2 py-2 text-[13px] font-medium text-center ${i === 0 || i === 6 ? 'text-red-400' : 'text-[#515151]'}`}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calendarWeeks.map((week, wi) => (
                  <tr key={wi}>
                    {week.map((day, di) => {
                      if (day === 0) {
                        return <td key={di} className="border border-[#E5E5E5] h-[60px]" />;
                      }
                      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                      const entry = myConfirmedEntries.get(dateStr);
                      const shift = entry?.shift;
                      const isWeekend = di === 0 || di === 6;

                      return (
                        <td key={di} className="border border-[#E5E5E5] h-[60px]">
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className={`text-[12px] ${isWeekend ? 'text-red-400' : 'text-[#515151]'}`}>{day}</span>
                            {shift ? (
                              <div
                                className="mt-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium text-center"
                                style={{ backgroundColor: SHIFT_BG[shift], color: SHIFT_TEXT[shift] }}
                              >
                                <div>{SHIFT_SHORT[shift]}</div>
                                {shift !== 'off' && entry?.startTime && (
                                  <div className="text-[9px] opacity-70">{entry.startTime.slice(0, 5)}</div>
                                )}
                              </div>
                            ) : (
                              <span className="mt-0.5 text-[10px] text-[#D9D9D9]">-</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-[14px] text-[#969696]">아직 확정되지 않았습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ManagerScheduleView() {
  const {
    staffMembers,
    scheduleEntries,
    addScheduleEntry,
    updateScheduleEntry,
    deleteScheduleEntry,
    bulkUpdateScheduleStatus,
  } = useData();

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [tab, setTab] = useState<'wish' | 'confirmed'>('confirmed');
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [hoveredNote, setHoveredNote] = useState<{ x: number; y: number; text: string } | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showWeekCopyModal, setShowWeekCopyModal] = useState(false);

  const [formShift, setFormShift] = useState<ShiftType>('open');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const activeStaff = useMemo(
    () => staffMembers.filter(s => s.isActive),
    [staffMembers],
  );

  const daysInMonth = getDaysInMonth(selectedMonth);
  const [year, month] = selectedMonth.split('-').map(Number);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const isMonthConfirmed = useMemo(() => {
    const monthEntries = scheduleEntries.filter(e => e.date.startsWith(selectedMonth) && e.status === 'confirmed');
    return monthEntries.length > 0;
  }, [scheduleEntries, selectedMonth]);

  const confirmedEntryMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const e of scheduleEntries) {
      if (e.date.startsWith(selectedMonth) && e.status === 'confirmed') {
        map.set(`${e.staffId}_${e.date}`, e);
      }
    }
    return map;
  }, [scheduleEntries, selectedMonth]);

  const wishEntryMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const e of scheduleEntries) {
      if (e.date.startsWith(selectedMonth) && e.status === 'wish') {
        map.set(`${e.staffId}_${e.date}`, e);
      }
    }
    return map;
  }, [scheduleEntries, selectedMonth]);

  const staffWishStatus = useMemo(() => {
    const status = new Map<string, boolean>();
    for (const staff of activeStaff) {
      const hasWish = scheduleEntries.some(
        e => e.staffId === staff.id && e.date.startsWith(selectedMonth) && e.status === 'wish'
      );
      status.set(staff.id, hasWish);
    }
    return status;
  }, [activeStaff, scheduleEntries, selectedMonth]);

  const getConfirmedEntry = useCallback(
    (staffId: string, day: number) => {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      return confirmedEntryMap.get(`${staffId}_${dateStr}`) || null;
    },
    [confirmedEntryMap, selectedMonth],
  );

  const getWishEntry = useCallback(
    (staffId: string, day: number) => {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      return wishEntryMap.get(`${staffId}_${dateStr}`) || null;
    },
    [wishEntryMap, selectedMonth],
  );

  const openEdit = (staffId: string, day: number) => {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
    const entry = getConfirmedEntry(staffId, day);
    const staff = activeStaff.find(s => s.id === staffId);

    if (entry) {
      setFormShift(entry.shift);
      setFormStart(entry.startTime || '');
      setFormEnd(entry.endTime || '');
      setFormNotes(entry.notes);
    } else {
      const defaultShift = staff?.defaultShift || 'open';
      setFormShift(defaultShift);
      const preset = SHIFT_PRESETS[defaultShift];
      setFormStart(preset?.start || '');
      setFormEnd(preset?.end || '');
      setFormNotes('');
    }

    setEditing({ staffId, date: dateStr, entry });
  };

  const handleShiftChange = (shift: ShiftType) => {
    setFormShift(shift);
    if (shift === 'off') {
      setFormStart('');
      setFormEnd('');
    } else if (shift !== 'custom') {
      const preset = SHIFT_PRESETS[shift];
      if (preset) {
        setFormStart(preset.start);
        setFormEnd(preset.end);
      }
    }
  };

  const formWorkHours = calcWorkHours(formStart, formEnd);
  const formOvertimeHours = Math.round(Math.max(0, formWorkHours - 8) * 10) / 10;

  const handleSave = () => {
    if (!editing) return;
    const data = {
      staffId: editing.staffId,
      staffName: activeStaff.find(s => s.id === editing.staffId)?.name || '',
      date: editing.date,
      shift: formShift,
      startTime: formShift === 'off' ? null : (formStart || null),
      endTime: formShift === 'off' ? null : (formEnd || null),
      workHours: formShift === 'off' ? 0 : formWorkHours,
      overtimeHours: formShift === 'off' ? 0 : formOvertimeHours,
      notes: formNotes,
      status: 'confirmed' as const,
    };

    if (editing.entry) {
      updateScheduleEntry(editing.entry.id, data);
    } else {
      addScheduleEntry(data);
    }
    setEditing(null);
  };

  const handleConfirmMonth = () => {
    if (window.confirm('확정하면 스태프에게 이 스케줄이 공개됩니다. 확정하시겠습니까?')) {
      bulkUpdateScheduleStatus(selectedMonth, 'confirmed');
    }
  };

  const handleUnconfirmMonth = () => {
    if (window.confirm('확정을 해제하시겠습니까?')) {
      const monthEntries = scheduleEntries.filter(
        e => e.date.startsWith(selectedMonth) && e.status === 'confirmed'
      );
      for (const entry of monthEntries) {
        updateScheduleEntry(entry.id, { status: 'wish' });
      }
    }
  };

  const summaryData = useMemo(() => {
    return activeStaff.map(staff => {
      const weeklyDays: number[] = [0, 0, 0, 0, 0];
      let totalWorkDays = 0;
      let totalWorkHours = 0;
      let totalOvertimeHours = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const entry = getConfirmedEntry(staff.id, d);
        if (entry && entry.shift !== 'off' && entry.workHours > 0) {
          const wk = getWeekNumber(d, firstDayOfWeek) - 1;
          if (wk >= 0 && wk < 5) weeklyDays[wk]++;
          totalWorkDays++;
          totalWorkHours += entry.workHours;
          totalOvertimeHours += entry.overtimeHours;
        }
      }

      return {
        staffId: staff.id,
        staffName: staff.name,
        weeklyDays,
        totalWorkDays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      };
    });
  }, [activeStaff, daysInMonth, firstDayOfWeek, getConfirmedEntry]);

  const handleExcel = () => {
    const monthNum = parseInt(selectedMonth.split('-')[1], 10);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    // 주차별 날짜 배열 만들기
    const firstDow = new Date(year, month - 1, 1).getDay();
    const weeks: { weekNum: number; days: (number | null)[] }[] = [];
    let currentWeek: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) currentWeek.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      currentWeek.push(d);
      if (currentWeek.length === 7) {
        weeks.push({ weekNum: weeks.length + 1, days: currentWeek });
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push({ weekNum: weeks.length + 1, days: currentWeek });
    }

    // 캘린더 시트 — 행=주차(각 주차에 직원 수만큼 행), 열=요일
    const calHeaders = ['', '월', '화', '수', '목', '금', '토', '일'];
    const calRows: (string | number | null)[][] = [];

    // 헤더 행에 날짜 표시
    for (const week of weeks) {
      // 주차 라벨 행 (날짜 표시)
      const dateRow: (string | number | null)[] = [`${week.weekNum}주차`];
      // 요일 순서: 월(1),화(2),수(3),목(4),금(5),토(6),일(0)
      const dowOrder = [1, 2, 3, 4, 5, 6, 0];
      for (const dow of dowOrder) {
        const day = week.days[dow];
        dateRow.push(day ? `${month}/${day}(${dayNames[dow]})` : '');
      }
      calRows.push(dateRow);

      // 각 직원의 근무 정보
      for (const staff of activeStaff) {
        const staffRow: (string | number | null)[] = [staff.name];
        for (const dow of dowOrder) {
          const day = week.days[dow];
          if (!day) {
            staffRow.push('');
            continue;
          }
          const entry = getConfirmedEntry(staff.id, day);
          if (entry && entry.shift !== 'off') {
            const time = entry.startTime && entry.endTime
              ? `${entry.startTime}~${entry.endTime}`
              : SHIFT_LABELS[entry.shift];
            staffRow.push(time);
          } else if (entry && entry.shift === 'off') {
            staffRow.push('휴무');
          } else {
            staffRow.push('');
          }
        }
        calRows.push(staffRow);
      }

      // 주차 구분 빈 행
      calRows.push(['', '', '', '', '', '', '', '']);
    }

    // 메모/특이사항 행
    const notesEntries = scheduleEntries.filter((e: ScheduleEntry) => e.date.startsWith(selectedMonth) && e.status === 'confirmed' && e.notes);
    if (notesEntries.length > 0) {
      calRows.push(['특이사항', '', '', '', '', '', '', '']);
      for (const e of notesEntries) {
        const d = parseInt(e.date.split('-')[2], 10);
        const dow = new Date(year, month - 1, d).getDay();
        calRows.push([`${month}/${d}(${dayNames[dow]})`, e.staffName, e.notes, '', '', '', '', '']);
      }
    }

    const summaryHeaders = [
      '직원', '1주차', '2주차', '3주차', '4주차', '5주차',
      '총 근무일', '총 근무시간', '총 초과시간',
    ];
    const summaryRows = summaryData.map(s => [
      s.staffName,
      s.weeklyDays[0],
      s.weeklyDays[1],
      s.weeklyDays[2],
      s.weeklyDays[3],
      s.weeklyDays[4],
      s.totalWorkDays,
      s.totalWorkHours,
      s.totalOvertimeHours,
    ]);

    exportToExcel({
      filename: `데스커라운지홍대_근무스케쥴_26년${monthNum}월.xlsx`,
      sheets: [
        {
          name: `${monthNum}월 스케줄`,
          headers: calHeaders,
          rows: calRows,
          columnWidths: [10, 18, 18, 18, 18, 18, 18, 18],
        },
        {
          name: '근무집계',
          headers: summaryHeaders,
          rows: summaryRows,
          columnWidths: [10, 8, 8, 8, 8, 8, 10, 10, 10],
          numberFormatColumns: [
            { col: 7, format: '#,##0.0' },
            { col: 8, format: '#,##0.0' },
          ],
        },
      ],
    });
  };

  const handleNoteHover = (e: React.MouseEvent, notes: string) => {
    if (!notes) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoveredNote({ x: rect.left, y: rect.bottom + 4, text: notes });
  };

  const inputClass = 'px-3 py-2.5 border border-[#D9D9D9] rounded-lg text-[14px] outline-none focus:border-[#336DFF] transition-colors';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#282828]">근무 스케줄</h1>
          <p className="text-[14px] text-[#969696] mt-1">
            직원 {activeStaff.length}명 · 스케줄 {scheduleEntries.filter(e => e.date.startsWith(selectedMonth) && e.status === 'confirmed').length}건
            {isMonthConfirmed && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-medium" style={{ backgroundColor: 'rgba(0,180,65,0.10)', color: '#00B441' }}>
                <Check size={12} /> 확정됨
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors"
          >
            <Download size={16} /> Excel 다운로드
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className={inputClass + ' min-w-[160px]'}
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="flex bg-[#F5F5F5] rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('wish')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
              tab === 'wish' ? 'bg-white text-[#282828] shadow-sm' : 'text-[#969696]'
            }`}
          >
            희망 현황
          </button>
          <button
            onClick={() => setTab('confirmed')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-colors ${
              tab === 'confirmed' ? 'bg-white text-[#282828] shadow-sm' : 'text-[#969696]'
            }`}
          >
            확정 스케줄
          </button>
        </div>

        {tab === 'confirmed' && (
          <div className="flex items-center gap-3 text-[12px]">
            {(['open', 'middle', 'close', 'off'] as ShiftType[]).map(s => (
              <span
                key={s}
                className="flex items-center gap-1.5 px-2 py-1 rounded"
                style={{ backgroundColor: SHIFT_BG[s], color: SHIFT_TEXT[s] }}
              >
                {SHIFT_SHORT[s]} {SHIFT_LABELS[s]}
              </span>
            ))}
          </div>
        )}
      </div>

      {tab === 'wish' && (
        <WishStatusView
          activeStaff={activeStaff}
          daysInMonth={daysInMonth}
          year={year}
          month={month}
          getWishEntry={getWishEntry}
          staffWishStatus={staffWishStatus}
        />
      )}

      {tab === 'confirmed' && (
        <>
          <div className="flex items-center gap-3 mb-0">
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[13px] font-medium hover:bg-[#F5F5F5] transition-colors"
            >
              <Settings size={14} /> 일괄 설정
            </button>
            <button
              onClick={() => setShowWeekCopyModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[13px] font-medium hover:bg-[#F5F5F5] transition-colors"
            >
              <Copy size={14} /> 주간 복사
            </button>
            {isMonthConfirmed ? (
              <button
                onClick={handleUnconfirmMonth}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#969696] border border-[#D9D9D9] rounded-lg text-[13px] font-medium hover:bg-[#F5F5F5] transition-colors"
              >
                확정 해제
              </button>
            ) : (
              <button
                onClick={handleConfirmMonth}
                className="flex items-center gap-2 px-4 py-2 bg-[#282828] text-white rounded-lg text-[13px] font-medium hover:bg-[#3C3C3C] transition-colors"
              >
                <Check size={14} /> 이번 달 확정
              </button>
            )}
          </div>

          <div className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F5]">
                    <th className="sticky left-0 z-10 bg-[#F5F5F5] px-3 py-2 text-[12px] font-medium text-[#515151] text-left border-r border-[#E5E5E5] min-w-[72px]">
                      직원
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const d = i + 1;
                      const dayOfWeek = new Date(year, month - 1, d).getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      return (
                        <th
                          key={d}
                          className={`px-0.5 py-2 text-[11px] font-medium text-center border-r border-[#E5E5E5] min-w-[44px] ${
                            isWeekend ? 'text-red-400' : 'text-[#515151]'
                          }`}
                        >
                          <div>{d}</div>
                          <div className="text-[10px]">{DAY_NAMES[dayOfWeek]}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {activeStaff.map((staff, sIdx) => (
                    <tr
                      key={staff.id}
                      className={sIdx % 2 === 1 ? 'bg-[#FAFAFA]' : ''}
                    >
                      <td className={`sticky left-0 z-10 px-3 py-1.5 text-[13px] font-medium text-[#282828] border-r border-[#E5E5E5] ${
                        sIdx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'
                      }`}>
                        {staff.name}
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1;
                        const entry = getConfirmedEntry(staff.id, d);
                        const shift = entry?.shift;
                        const hasNote = entry?.notes ? true : false;

                        return (
                          <td
                            key={d}
                            className="px-0 py-0 border-r border-[#E5E5E5] cursor-pointer relative"
                            onClick={() => openEdit(staff.id, d)}
                            onMouseEnter={e => {
                              if (entry?.notes) handleNoteHover(e, entry.notes);
                            }}
                            onMouseLeave={() => setHoveredNote(null)}
                          >
                            <div
                              className="flex flex-col items-center justify-center h-[40px] text-[11px] leading-tight select-none"
                              style={{
                                backgroundColor: shift ? SHIFT_BG[shift] : 'transparent',
                                color: shift ? SHIFT_TEXT[shift] : '#B3B3B3',
                              }}
                            >
                              {shift ? (
                                <>
                                  <span className="font-medium">{SHIFT_SHORT[shift]}</span>
                                  {shift !== 'off' && entry?.startTime && (
                                    <span className="text-[9px] opacity-70">
                                      {entry.startTime.slice(0, 5)}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px]">-</span>
                              )}
                              {hasNote && (
                                <span className="absolute top-0.5 right-0.5 w-[5px] h-[5px] rounded-full bg-[#336DFF]" />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {hoveredNote && (
            <div
              className="fixed z-50 bg-[#282828] text-white text-[12px] px-3 py-2 rounded-lg shadow-lg max-w-[200px] pointer-events-none"
              style={{ left: hoveredNote.x, top: hoveredNote.y }}
            >
              {hoveredNote.text}
            </div>
          )}

          <div className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E5E5]">
              <h2 className="text-[15px] font-bold text-[#282828]">주차별 / 월별 근무 집계</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F5F5F5]">
                    <th className="px-4 py-3 text-[13px] font-medium text-[#515151] text-left">직원</th>
                    {[1, 2, 3, 4, 5].map(w => (
                      <th key={w} className="px-4 py-3 text-[13px] font-medium text-[#515151] text-center">{w}주차</th>
                    ))}
                    <th className="px-4 py-3 text-[13px] font-medium text-[#282828] text-center">총 근무일</th>
                    <th className="px-4 py-3 text-[13px] font-medium text-[#282828] text-center">총 근무시간</th>
                    <th className="px-4 py-3 text-[13px] font-medium text-[#282828] text-center">총 초과시간</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {summaryData.map((row, idx) => (
                    <tr key={row.staffId} className={idx % 2 === 1 ? 'bg-[#FAFAFA]' : ''}>
                      <td className="px-4 py-3 text-[14px] font-medium text-[#282828]">{row.staffName}</td>
                      {row.weeklyDays.map((wd, wi) => (
                        <td key={wi} className="px-4 py-3 text-[14px] text-[#515151] text-center">
                          {wd > 0 ? `${wd}일` : '-'}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-[14px] font-bold text-[#282828] text-center">{row.totalWorkDays}일</td>
                      <td className="px-4 py-3 text-[14px] font-bold text-[#282828] text-center">{row.totalWorkHours}h</td>
                      <td className={`px-4 py-3 text-[14px] font-bold text-center ${row.totalOvertimeHours > 0 ? 'text-red-500' : 'text-[#969696]'}`}>
                        {row.totalOvertimeHours > 0 ? `${row.totalOvertimeHours}h` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setEditing(null)}>
          <div
            className="bg-white rounded-lg shadow-xl w-[400px] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]">
              <h3 className="text-[16px] font-bold text-[#282828]">
                {activeStaff.find(s => s.id === editing.staffId)?.name} - {editing.date}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] transition-colors text-[#969696]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-[#515151] font-medium">시간대</label>
                <div className="flex gap-2">
                  {(['open', 'middle', 'close', 'off', 'custom'] as ShiftType[]).map(s => (
                    <button
                      key={s}
                      onClick={() => handleShiftChange(s)}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                        formShift === s
                          ? 'border-[#336DFF] bg-[#336DFF]/10 text-[#336DFF]'
                          : 'border-[#D9D9D9] text-[#515151] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      {SHIFT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {formShift !== 'off' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-[#515151] font-medium">출근 시간</label>
                    <input
                      type="time"
                      value={formStart}
                      onChange={e => setFormStart(e.target.value)}
                      className={inputClass}
                      readOnly={formShift !== 'custom'}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-[#515151] font-medium">퇴근 시간</label>
                    <input
                      type="time"
                      value={formEnd}
                      onChange={e => setFormEnd(e.target.value)}
                      className={inputClass}
                      readOnly={formShift !== 'custom'}
                    />
                  </div>
                </div>
              )}

              {formShift !== 'off' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-[#969696]">근무시간 (자동)</label>
                    <div className={inputClass + ' bg-[#F5F5F5] flex items-center text-[#282828] font-medium'}>
                      {formWorkHours}시간
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] text-[#969696]">초과시간 (자동)</label>
                    <div className={inputClass + ` bg-[#F5F5F5] flex items-center font-medium ${formOvertimeHours > 0 ? 'text-red-500' : 'text-[#969696]'}`}>
                      {formOvertimeHours > 0 ? `${formOvertimeHours}시간` : '-'}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] text-[#515151] font-medium">메모</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="특이사항 입력"
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 px-5 py-2.5 bg-[#282828] text-white rounded-lg text-[14px] font-medium hover:bg-[#3C3C3C] transition-colors"
                >
                  저장
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="px-5 py-2.5 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <BulkSettingModal
          activeStaff={activeStaff}
          selectedMonth={selectedMonth}
          daysInMonth={daysInMonth}
          year={year}
          month={month}
          firstDayOfWeek={firstDayOfWeek}
          addScheduleEntry={addScheduleEntry}
          updateScheduleEntry={updateScheduleEntry}
          getConfirmedEntry={getConfirmedEntry}
          onClose={() => setShowBulkModal(false)}
        />
      )}

      {showWeekCopyModal && (
        <WeekCopyModal
          selectedMonth={selectedMonth}
          activeStaff={activeStaff}
          addScheduleEntry={addScheduleEntry}
          updateScheduleEntry={updateScheduleEntry}
          deleteScheduleEntry={deleteScheduleEntry}
          getConfirmedEntry={getConfirmedEntry}
          onClose={() => setShowWeekCopyModal(false)}
        />
      )}
    </div>
  );
}

function WishStatusView({
  activeStaff,
  daysInMonth,
  year,
  month,
  getWishEntry,
  staffWishStatus,
}: {
  activeStaff: { id: string; name: string; defaultShift: string; isActive: boolean }[];
  daysInMonth: number;
  year: number;
  month: number;
  getWishEntry: (staffId: string, day: number) => ScheduleEntry | null;
  staffWishStatus: Map<string, boolean>;
}) {
  const DAY_NAMES_LOCAL = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-white border border-[#D9D9D9] rounded-lg shadow-[0_1px_3px_rgba(40,40,40,0.08)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E5E5E5]">
        <h2 className="text-[15px] font-bold text-[#282828]">직원 희망 현황</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#F5F5F5]">
              <th className="sticky left-0 z-10 bg-[#F5F5F5] px-3 py-2 text-[12px] font-medium text-[#515151] text-left border-r border-[#E5E5E5] min-w-[72px]">
                직원
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = i + 1;
                const dayOfWeek = new Date(year, month - 1, d).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                return (
                  <th
                    key={d}
                    className={`px-0.5 py-2 text-[11px] font-medium text-center border-r border-[#E5E5E5] min-w-[44px] ${
                      isWeekend ? 'text-red-400' : 'text-[#515151]'
                    }`}
                  >
                    <div>{d}</div>
                    <div className="text-[10px]">{DAY_NAMES_LOCAL[dayOfWeek]}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeStaff.map((staff, sIdx) => {
              const hasWish = staffWishStatus.get(staff.id) || false;
              return (
                <tr
                  key={staff.id}
                  className={sIdx % 2 === 1 ? 'bg-[#FAFAFA]' : ''}
                >
                  <td className={`sticky left-0 z-10 px-3 py-1.5 text-[13px] font-medium border-r border-[#E5E5E5] ${
                    sIdx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'
                  } ${hasWish ? 'text-[#282828]' : 'text-[#969696]'}`}>
                    {staff.name}
                    {!hasWish && <span className="ml-1 text-[10px] text-[#B3B3B3]">미제출</span>}
                  </td>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const entry = getWishEntry(staff.id, d);

                    if (!hasWish) {
                      return (
                        <td key={d} className="px-0 py-0 border-r border-[#E5E5E5]">
                          <div className="flex items-center justify-center h-[40px] text-[11px] text-[#D9D9D9] bg-[#FAFAFA]">
                            -
                          </div>
                        </td>
                      );
                    }

                    const isAny = entry?.notes === '상관없음';
                    const shift = entry?.shift;

                    return (
                      <td key={d} className="px-0 py-0 border-r border-[#E5E5E5]">
                        <div
                          className="flex items-center justify-center h-[40px] text-[11px] font-medium"
                          style={{
                            backgroundColor: isAny ? '#F5F5F5' : (shift ? SHIFT_BG[shift] : 'transparent'),
                            color: isAny ? '#969696' : (shift ? SHIFT_TEXT[shift] : '#B3B3B3'),
                          }}
                        >
                          {isAny ? '-' : (shift ? SHIFT_SHORT[shift] : '-')}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BulkSettingModal({
  activeStaff,
  selectedMonth,
  daysInMonth,
  year,
  month,
  firstDayOfWeek: _firstDayOfWeek,
  addScheduleEntry,
  updateScheduleEntry,
  getConfirmedEntry,
  onClose,
}: {
  activeStaff: { id: string; name: string; defaultShift: string; isActive: boolean }[];
  selectedMonth: string;
  daysInMonth: number;
  year: number;
  month: number;
  firstDayOfWeek: number;
  addScheduleEntry: (entry: Omit<ScheduleEntry, 'id'>) => void;
  updateScheduleEntry: (id: string, updates: Partial<ScheduleEntry>) => void;
  getConfirmedEntry: (staffId: string, day: number) => ScheduleEntry | null;
  onClose: () => void;
}) {
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<'range' | 'individual'>('range');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayShifts, setDayShifts] = useState<Record<number, ShiftType>>({});

  const firstDow = new Date(year, month - 1, 1).getDay();
  const calendarWeeks: number[][] = useMemo(() => {
    const weeks: number[][] = [];
    let week: number[] = [];
    for (let i = 0; i < firstDow; i++) week.push(0);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(0);
      weeks.push(week);
    }
    return weeks;
  }, [daysInMonth, firstDow]);

  const toggleStaff = (id: string) => {
    setSelectedStaffIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => {
      if (prev.includes(day)) {
        const next = prev.filter(x => x !== day);
        setDayShifts(ds => { const copy = { ...ds }; delete copy[day]; return copy; });
        return next;
      }
      setDayShifts(ds => ({ ...ds, [day]: 'open' }));
      return [...prev, day];
    });
  };

  const setDayShift = (day: number, shift: ShiftType) => {
    setDayShifts(ds => ({ ...ds, [day]: shift }));
  };

  const handleApply = () => {
    if (selectedStaffIds.length === 0) return;

    let days: number[] = [];
    if (dateMode === 'range' && rangeStart && rangeEnd) {
      const startDay = parseInt(rangeStart.split('-')[2], 10);
      const endDay = parseInt(rangeEnd.split('-')[2], 10);
      for (let d = startDay; d <= endDay; d++) {
        if (d >= 1 && d <= daysInMonth) days.push(d);
      }
    } else if (dateMode === 'individual') {
      days = [...selectedDays];
    }

    if (days.length === 0) return;

    for (const staffId of selectedStaffIds) {
      const staffName = activeStaff.find(s => s.id === staffId)?.name || '';
      for (const day of days) {
        const shift = dayShifts[day] || 'open';
        const preset = SHIFT_PRESETS[shift];
        const startTime = shift === 'off' ? null : (preset?.start || null);
        const endTime = shift === 'off' ? null : (preset?.end || null);
        const workHours = shift === 'off' ? 0 : calcWorkHours(startTime, endTime);
        const overtimeHours = Math.round(Math.max(0, workHours - 8) * 10) / 10;

        const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
        const existing = getConfirmedEntry(staffId, day);
        const data = { shift, startTime, endTime, workHours, overtimeHours, notes: '' };

        if (existing) {
          updateScheduleEntry(existing.id, data);
        } else {
          addScheduleEntry({ staffId, staffName, date: dateStr, ...data, status: 'confirmed' });
        }
      }
    }
    onClose();
  };

  const handleRangeApply = () => {
    if (!rangeStart || !rangeEnd) return;
    const startDay = parseInt(rangeStart.split('-')[2], 10);
    const endDay = parseInt(rangeEnd.split('-')[2], 10);
    const days: number[] = [];
    for (let d = startDay; d <= endDay; d++) {
      if (d >= 1 && d <= daysInMonth) days.push(d);
    }
    setSelectedDays(days);
    const shifts: Record<number, ShiftType> = {};
    days.forEach(d => { shifts[d] = dayShifts[d] || 'open'; });
    setDayShifts(shifts);
  };

  const inputClass = 'px-3 py-2.5 border border-[#D9D9D9] rounded-lg text-[14px] outline-none focus:border-[#336DFF] transition-colors';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-[520px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-[#282828]">일괄 설정</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] text-[#969696]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[13px] text-[#515151] font-medium block mb-2">직원 선택</label>
            <div className="flex flex-wrap gap-2">
              {activeStaff.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleStaff(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                    selectedStaffIds.includes(s.id)
                      ? 'border-[#336DFF] bg-[#336DFF]/10 text-[#336DFF]'
                      : 'border-[#D9D9D9] text-[#515151] hover:bg-[#F5F5F5]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] text-[#515151] font-medium block mb-2">날짜 선택 방식</label>
            <div className="flex gap-3 mb-3">
              <label className="flex items-center gap-1.5 text-[13px] text-[#515151] cursor-pointer">
                <input
                  type="radio"
                  checked={dateMode === 'range'}
                  onChange={() => setDateMode('range')}
                  className="accent-[#336DFF]"
                />
                범위 선택
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-[#515151] cursor-pointer">
                <input
                  type="radio"
                  checked={dateMode === 'individual'}
                  onChange={() => setDateMode('individual')}
                  className="accent-[#336DFF]"
                />
                개별 선택
              </label>
            </div>

            {dateMode === 'range' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={rangeStart}
                  onChange={e => setRangeStart(e.target.value)}
                  min={`${selectedMonth}-01`}
                  max={`${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`}
                  className={inputClass}
                />
                <span className="text-[#969696]">~</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={e => setRangeEnd(e.target.value)}
                  min={rangeStart || `${selectedMonth}-01`}
                  max={`${selectedMonth}-${String(daysInMonth).padStart(2, '0')}`}
                  className={inputClass}
                />
                <button
                  onClick={handleRangeApply}
                  className="px-3 py-2.5 bg-[#282828] text-white rounded-lg text-[13px] font-medium hover:bg-[#3C3C3C]"
                >
                  날짜 선택
                </button>
              </div>
            )}

            {dateMode === 'individual' && (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {DAY_NAMES.map((d, i) => (
                      <th key={d} className={`px-1 py-1 text-[11px] font-medium text-center ${i === 0 || i === 6 ? 'text-red-400' : 'text-[#515151]'}`}>
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calendarWeeks.map((week, wi) => (
                    <tr key={wi}>
                      {week.map((day, di) => {
                        if (day === 0) return <td key={di} />;
                        const selected = selectedDays.includes(day);
                        return (
                          <td key={di} className="p-0.5">
                            <button
                              onClick={() => toggleDay(day)}
                              className={`w-full py-1 rounded text-[12px] transition-colors ${
                                selected
                                  ? 'bg-[#336DFF] text-white font-medium'
                                  : 'bg-[#F5F5F5] text-[#515151] hover:bg-[#E5E5E5]'
                              }`}
                            >
                              {day}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedDays.length > 0 && (
            <div>
              <label className="text-[13px] text-[#515151] font-medium block mb-2">날짜별 시간대 선택</label>
              <div className="max-h-[200px] overflow-y-auto space-y-1.5 border border-[#D9D9D9] rounded-lg p-3">
                {[...selectedDays].sort((a, b) => a - b).map(day => {
                  const dow = new Date(year, month - 1, day).getDay();
                  const dowNames = ['일', '월', '화', '수', '목', '금', '토'];
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className={`text-[13px] font-medium w-[60px] ${dow === 0 || dow === 6 ? 'text-red-400' : 'text-[#282828]'}`}>
                        {month}/{day}({dowNames[dow]})
                      </span>
                      <div className="flex gap-1.5">
                        {(['open', 'middle', 'close', 'off'] as ShiftType[]).map(s => (
                          <button
                            key={s}
                            onClick={() => setDayShift(day, s)}
                            className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                              (dayShifts[day] || 'open') === s
                                ? 'border-[#336DFF] bg-[#336DFF]/10 text-[#336DFF]'
                                : 'border-[#D9D9D9] text-[#969696] hover:bg-[#F5F5F5]'
                            }`}
                          >
                            {SHIFT_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleApply}
              disabled={selectedStaffIds.length === 0}
              className="flex-1 px-5 py-2.5 bg-[#282828] text-white rounded-lg text-[14px] font-medium hover:bg-[#3C3C3C] transition-colors disabled:opacity-40"
            >
              적용
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekCopyModal({
  selectedMonth,
  activeStaff,
  addScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  getConfirmedEntry,
  onClose,
}: {
  selectedMonth: string;
  activeStaff: { id: string; name: string; defaultShift: string; isActive: boolean }[];
  addScheduleEntry: (entry: Omit<ScheduleEntry, 'id'>) => void;
  updateScheduleEntry: (id: string, updates: Partial<ScheduleEntry>) => void;
  deleteScheduleEntry: (id: string) => void;
  getConfirmedEntry: (staffId: string, day: number) => ScheduleEntry | null;
  onClose: () => void;
}) {
  const weekRanges = useMemo(() => getWeekRanges(selectedMonth), [selectedMonth]);
  const [sourceWeek, setSourceWeek] = useState(1);
  const [targetWeeks, setTargetWeeks] = useState<number[]>([]);

  const toggleTarget = (week: number) => {
    setTargetWeeks(prev =>
      prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week]
    );
  };

  const handleCopy = () => {
    const source = weekRanges.find(r => r.week === sourceWeek);
    if (!source || targetWeeks.length === 0) return;

    const sourceDays: number[] = [];
    for (let d = source.startDay; d <= source.endDay; d++) sourceDays.push(d);

    for (const targetWeekNum of targetWeeks) {
      const target = weekRanges.find(r => r.week === targetWeekNum);
      if (!target) continue;

      const targetDays: number[] = [];
      for (let d = target.startDay; d <= target.endDay; d++) targetDays.push(d);

      for (const staff of activeStaff) {
        for (let i = 0; i < targetDays.length; i++) {
          const sourceDay = i < sourceDays.length ? sourceDays[i] : null;
          const targetDay = targetDays[i];
          const dateStr = `${selectedMonth}-${String(targetDay).padStart(2, '0')}`;
          const existingTarget = getConfirmedEntry(staff.id, targetDay);

          if (sourceDay) {
            const sourceEntry = getConfirmedEntry(staff.id, sourceDay);
            if (sourceEntry) {
              const data = {
                shift: sourceEntry.shift,
                startTime: sourceEntry.startTime,
                endTime: sourceEntry.endTime,
                workHours: sourceEntry.workHours,
                overtimeHours: sourceEntry.overtimeHours,
                notes: sourceEntry.notes,
              };
              if (existingTarget) {
                updateScheduleEntry(existingTarget.id, data);
              } else {
                addScheduleEntry({
                  staffId: staff.id,
                  staffName: staff.name,
                  date: dateStr,
                  ...data,
                  status: 'confirmed',
                });
              }
            } else if (existingTarget) {
              deleteScheduleEntry(existingTarget.id);
            }
          } else if (existingTarget) {
            deleteScheduleEntry(existingTarget.id);
          }
        }
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[16px] font-bold text-[#282828]">주간 복사</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] text-[#969696]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[13px] text-[#515151] font-medium block mb-2">원본 주차</label>
            <div className="flex gap-2">
              {weekRanges.map(r => (
                <button
                  key={r.week}
                  onClick={() => setSourceWeek(r.week)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                    sourceWeek === r.week
                      ? 'border-[#336DFF] bg-[#336DFF]/10 text-[#336DFF]'
                      : 'border-[#D9D9D9] text-[#515151] hover:bg-[#F5F5F5]'
                  }`}
                >
                  {r.week}주차
                  <span className="text-[10px] ml-1 opacity-60">{r.startDay}~{r.endDay}일</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] text-[#515151] font-medium block mb-2">대상 주차</label>
            <div className="flex gap-2">
              {weekRanges.filter(r => r.week !== sourceWeek).map(r => (
                <label
                  key={r.week}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-colors ${
                    targetWeeks.includes(r.week)
                      ? 'border-[#336DFF] bg-[#336DFF]/10 text-[#336DFF]'
                      : 'border-[#D9D9D9] text-[#515151] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={targetWeeks.includes(r.week)}
                    onChange={() => toggleTarget(r.week)}
                    className="accent-[#336DFF]"
                  />
                  {r.week}주차
                  <span className="text-[10px] opacity-60">{r.startDay}~{r.endDay}일</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCopy}
              disabled={targetWeeks.length === 0}
              className="flex-1 px-5 py-2.5 bg-[#282828] text-white rounded-lg text-[14px] font-medium hover:bg-[#3C3C3C] transition-colors disabled:opacity-40"
            >
              복사
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white text-[#282828] border border-[#B3B3B3] rounded-lg text-[14px] font-medium hover:bg-[#F5F5F5] transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

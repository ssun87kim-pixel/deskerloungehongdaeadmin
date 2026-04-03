import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Member, Reservation, Pass, RentalItem, Expense, StaffMember, ScheduleEntry } from '../types';
import { mockMembers, mockReservations, mockPasses, mockRentalItems, mockExpenses, mockStaffMembers, mockScheduleEntries } from '../utils/mockData';
import { generateId, getCurrentTime } from '../utils/helpers';

interface DataContextType {
  members: Member[];
  reservations: Reservation[];
  passes: Pass[];
  rentalItems: RentalItem[];
  expenses: Expense[];
  staffMembers: StaffMember[];
  scheduleEntries: ScheduleEntry[];
  addMember: (member: Omit<Member, 'id'>) => void;
  updateMember: (id: string, updates: Partial<Member>) => void;
  addReservation: (reservation: Omit<Reservation, 'id'>) => void;
  updateReservation: (id: string, updates: Partial<Reservation>) => void;
  checkIn: (id: string) => void;
  checkOut: (id: string) => void;
  addPass: (pass: Omit<Pass, 'id'>) => void;
  usePass: (passId: string, date: string) => void;
  updateRentalItem: (id: string, updates: Partial<RentalItem>) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addScheduleEntry: (entry: Omit<ScheduleEntry, 'id'>) => void;
  updateScheduleEntry: (id: string, updates: Partial<ScheduleEntry>) => void;
  deleteScheduleEntry: (id: string) => void;
  bulkUpdateScheduleStatus: (month: string, status: ScheduleEntry['status']) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(mockMembers);
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [passes, setPasses] = useState<Pass[]>(mockPasses);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>(mockRentalItems);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);
  const [staffMembers] = useState<StaffMember[]>(mockStaffMembers);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(mockScheduleEntries);

  const addMember = useCallback((member: Omit<Member, 'id'>) => {
    setMembers(prev => [...prev, { ...member, id: generateId() }]);
  }, []);

  const updateMember = useCallback((id: string, updates: Partial<Member>) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const addReservation = useCallback((reservation: Omit<Reservation, 'id'>) => {
    setReservations(prev => [...prev, { ...reservation, id: generateId() }]);
  }, []);

  const updateReservation = useCallback((id: string, updates: Partial<Reservation>) => {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const checkIn = useCallback((id: string) => {
    const time = getCurrentTime();
    setReservations(prev => prev.map(r =>
      r.id === id ? { ...r, checkInTime: time, status: 'checked_in' as const } : r
    ));
  }, []);

  const checkOut = useCallback((id: string) => {
    const time = getCurrentTime();
    setReservations(prev => prev.map(r => {
      if (r.id !== id) return r;
      const inMinutes = r.checkInTime ? parseInt(r.checkInTime.split(':')[0]) * 60 + parseInt(r.checkInTime.split(':')[1]) : 0;
      const outMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
      return { ...r, checkOutTime: time, stayDuration: outMinutes - inMinutes, status: 'checked_out' as const };
    }));
  }, []);

  const addPass = useCallback((pass: Omit<Pass, 'id'>) => {
    setPasses(prev => [...prev, { ...pass, id: generateId() }]);
  }, []);

  const usePass = useCallback((passId: string, date: string) => {
    setPasses(prev => prev.map(p => {
      if (p.id !== passId) return p;
      return {
        ...p,
        remainingUses: p.remainingUses - 1,
        usageHistory: [...p.usageHistory, { date }],
        status: p.remainingUses - 1 <= 0 ? 'fully_used' as const : p.status,
      };
    }));
  }, []);

  const updateRentalItem = useCallback((id: string, updates: Partial<RentalItem>) => {
    setRentalItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const addExpense = useCallback((expense: Omit<Expense, 'id'>) => {
    setExpenses(prev => [...prev, { ...expense, id: generateId() }]);
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  const addScheduleEntry = useCallback((entry: Omit<ScheduleEntry, 'id'>) => {
    setScheduleEntries(prev => [...prev, { ...entry, id: generateId() }]);
  }, []);

  const updateScheduleEntry = useCallback((id: string, updates: Partial<ScheduleEntry>) => {
    setScheduleEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteScheduleEntry = useCallback((id: string) => {
    setScheduleEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const bulkUpdateScheduleStatus = useCallback((month: string, status: ScheduleEntry['status']) => {
    setScheduleEntries(prev => prev.map(e =>
      e.date.startsWith(month) ? { ...e, status } : e
    ));
  }, []);

  return (
    <DataContext.Provider value={{
      members, reservations, passes, rentalItems, expenses, staffMembers, scheduleEntries,
      addMember, updateMember, addReservation, updateReservation,
      checkIn, checkOut, addPass, usePass, updateRentalItem,
      addExpense, updateExpense, deleteExpense,
      addScheduleEntry, updateScheduleEntry, deleteScheduleEntry, bulkUpdateScheduleStatus,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

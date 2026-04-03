export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  job: string;
  workMood: string;
  workersJourney: string;
  visitCount: number;
  interests: string;
  programParticipation: string;
  smsConsent: boolean;
  privacyConsent: boolean;
  marketingConsent: boolean;
  membershipStatus: 'active' | 'inactive' | 'dormant' | 'blacklist';
  registeredAt: string;
  notes: string;
  passIds: string[];
}

export interface Reservation {
  id: string;
  date: string;
  time: string;
  reserverName: string;
  phone: string;
  email: string;
  visitorName: string;
  visitorPhone: string;
  product: ReservationProduct;
  seat: string;
  paymentAmount: number;
  paymentMethod: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  stayDuration: number | null;
  source: 'naver' | 'walkin' | 'phone' | 'other';
  visitPath: string;
  isRefunded: boolean;
  refundAmount: number;
  rentalItems: string[];
  guideTime: string;
  guideStaff: string;
  program: string;
  isRevisit: boolean;
  membershipJoined: boolean;
  notes: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
}

export type ReservationProduct = '1DAY' | '워커스룸' | '2시간' | '4시간' | '프로그램' | '기타';

export interface Pass {
  id: string;
  memberId: string;
  memberName: string;
  phone: string;
  type: '4시간 10회권' | '종일 10회권' | '무료이용권';
  purchaseDate: string;
  totalUses: number;
  remainingUses: number;
  usageHistory: PassUsage[];
  status: 'active' | 'expired' | 'fully_used';
  notes: string;
}

export interface PassUsage {
  date: string;
  reservationId?: string;
}

export interface DailySales {
  date: string;
  totalVisitors: number;
  freeFullDay: number;
  free4Hours: number;
  free2Hours: number;
  paidFullDay: number;
  paid4Hours: number;
  paid2Hours: number;
  naverBookings: number;
  walkinBookings: number;
  newVisitors: number;
  revisitors: number;
  revisitRate: number;
  totalRevenue: number;
}

export interface RentalItem {
  id: string;
  name: string;
  totalQuantity: number;
  availableQuantity: number;
  location: string;
  status: string;
  notes: string;
  purchaseLink: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'download';
  target: string;
  targetId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  ipAddress: string;
  timestamp: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'super_admin' | 'manager' | 'staff';
  email: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;                      // YYYY-MM-DD
  category: '운영비' | 'F&B';
  itemName: string;                  // 품명
  purpose: string;                   // 용도
  vendor: string;                    // 업체명
  supplyAmount: number;              // 공급가액 (원)
  tax: number;                       // 부가세 (원)
  totalAmount: number;               // 합계 (원)
  paymentMethod: string;             // 결제수단
  notes: string;                     // 비고
  receiptImageUrl: string | null;    // 영수증 이미지 (로컬 미리보기용)
  isPartialCancel: boolean;          // 부분취소 여부
  relatedExpenseId: string | null;   // 원 지출 ID (부분취소 시)
}

export interface StaffMember {
  id: string;
  name: string;
  defaultShift: 'open' | 'middle' | 'close';
  isActive: boolean;
}

export type ShiftType = 'open' | 'middle' | 'close' | 'off' | 'custom';

export interface ScheduleEntry {
  id: string;
  staffId: string;
  staffName: string;
  date: string;           // YYYY-MM-DD
  shift: ShiftType;
  startTime: string | null;  // HH:MM
  endTime: string | null;    // HH:MM
  workHours: number;         // 자동계산
  overtimeHours: number;     // 8시간 초과분
  notes: string;
  status: 'wish' | 'confirmed';
}

export interface MonthlyReport {
  id: string;
  year: number;
  month: number;
  specialNotes: string;
  nextMonthPlan: string;
  status: 'draft' | 'generated' | 'submitted';
}

export type UserRole = User['role'];

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

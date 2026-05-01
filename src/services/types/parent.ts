// ── Parent / Guardian Portal — Type Definitions ─────────────────────

/** Minimal child summary shown in the child switcher. */
export interface ChildSummary {
  childId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  className: string;
  section: string;
  rollNumber: string;
  profileUrl?: string;
}

/** Top-level dashboard payload for a specific child. */
export interface ParentDashboardData {
  child: ChildSummary;
  attendance: AttendanceSnapshot;
  performance: PerformanceSnapshot;
  feesDue: FeesSnapshot;
  homeworkPending: HomeworkSnapshot;
  recentNotifications: ParentNotification[];
}

// ── Attendance ───────────────────────────────────────────────────────

export interface AttendanceSnapshot {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
  todayStatus: "PRESENT" | "ABSENT" | "LATE" | "HOLIDAY" | "NOT_MARKED";
  monthlyBreakdown: MonthlyAttendance[];
}

export interface MonthlyAttendance {
  month: string; // e.g. "Jan", "Feb"
  present: number;
  absent: number;
  late: number;
}

// ── Performance ──────────────────────────────────────────────────────

export interface PerformanceSnapshot {
  currentGpa: number;
  maxGpa: number;
  classAverage: number;
  rank: number;
  totalStudents: number;
  trend: PerformanceTrendPoint[];
  subjects: SubjectPerformance[];
}

export interface PerformanceTrendPoint {
  exam: string; // e.g. "Unit 1", "Mid Term"
  gpa: number;
  classAvg: number;
}

export interface SubjectPerformance {
  subject: string;
  marks: number;
  maxMarks: number;
  grade: string;
  teacherRemarks?: string;
}

// ── Fees ─────────────────────────────────────────────────────────────

export interface FeesSnapshot {
  totalDue: number;
  currency: string;
  nextDueDate: string;
  feeBreakdown: FeeItem[];
  recentPayments: PaymentRecord[];
}

export interface FeeItem {
  feeType: string;
  amount: number;
  dueDate: string;
  status: "PAID" | "PENDING" | "OVERDUE";
}

export interface PaymentRecord {
  paymentId: string;
  amount: number;
  date: string;
  method: string;
  receiptUrl?: string;
}

// ── Homework / Assignments ───────────────────────────────────────────

export interface HomeworkSnapshot {
  totalPending: number;
  totalSubmitted: number;
  totalOverdue: number;
  assignments: Assignment[];
}

export interface Assignment {
  assignmentId: string;
  subject: string;
  title: string;
  description?: string;
  dueDate: string;
  status: "PENDING" | "SUBMITTED" | "OVERDUE" | "GRADED";
  teacherName: string;
  attachments?: string[];
  seenByParent: boolean;
}

// ── Notifications ────────────────────────────────────────────────────

export interface ParentNotification {
  notificationId: string;
  title: string;
  message: string;
  category: "ACADEMIC" | "FEES" | "ATTENDANCE" | "GENERAL" | "EVENT";
  timestamp: string;
  isRead: boolean;
}

// ── Calendar / Timetable (Phase 2+) ─────────────────────────────────

export interface TimetableEntry {
  day: string;
  period: number;
  subject: string;
  teacher: string;
  startTime: string;
  endTime: string;
}

export interface CalendarEvent {
  eventId: string;
  title: string;
  date: string;
  type: "EXAM" | "HOLIDAY" | "EVENT" | "PTM";
  description?: string;
}

// ── Transport (Phase 2+) ────────────────────────────────────────────

export interface TransportInfo {
  busNumber: string;
  driverName: string;
  driverPhone: string;
  routeName: string;
  stops: RouteStop[];
  currentStatus: "ARRIVING" | "DEPARTED" | "DELAYED" | "NOT_STARTED";
}

export interface RouteStop {
  stopName: string;
  estimatedTime: string;
  isChildStop: boolean;
}

// ── Attendance DTOs ──────────────────────────────────────────────────

// Attendance Types
export interface AttendanceTypeRequestDTO {
  typeName: string;
  shortCode: string;
  isPresentMark: boolean;
  isAbsenceMark: boolean;
  isLateMark: boolean;
  colorCode?: string;
}

export interface AttendanceTypeResponseDTO {
  id: number;
  uuid: string;
  typeName: string;
  shortCode: string;
  colorCode?: string;
  presentMark: boolean;
  absenceMark: boolean;
  lateMark: boolean;
}

// Student Attendance
export interface StudentAttendanceRequestDTO {
  studentUuid?: string;
  takenByStaffUuid?: string;

  // Deprecated fallback fields; backend accepts for one release cycle.
  studentId?: number;
  attendanceShortCode: string;
  attendanceDate: string;
  takenByStaffId?: number;
  notes?: string;
}

export interface AbsenceDocumentationSummaryResponseDTO {
  dailyAttendanceId: number;
  dailyAttendanceUuid?: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  documentationUrl?: string;
}

export interface StudentAttendanceResponseDTO {
  dailyAttendanceId?: number;
  uuid: string;
  studentUuid?: string;
  takenByStaffUuid?: string;

  // Deprecated fallback response fields.
  studentId?: number;
  studentFullName: string;
  attendanceDate: string;
  attendanceTypeShortCode: string;
  takenByStaffId?: number;
  takenByStaffName: string;
  attendanceType: AttendanceTypeResponseDTO;
  notes?: string;
  absenceDocumentation?: AbsenceDocumentationSummaryResponseDTO;
  createdAt: string;
  createdBy: string;
}

// Student Attendance Query Params
export interface StudentAttendanceQueryParams {
  page?: number;
  size?: number;
  sort?: string;
  studentUuid?: string;
  takenByStaffUuid?: string;
  classUuid?: string;
  sectionUuid?: string;
  search?: string;

  // Deprecated fallback query fields.
  studentId?: number;
  takenByStaffId?: number;
  fromDate?: string;
  toDate?: string;
  attendanceTypeShortCode?: string;
}

// Staff Attendance
export type AttendanceSource = "MANUAL" | "BIOMETRIC" | "SYSTEM" | "WEB" | "MOBILE" | "SELF_CAPTURE";

export interface StaffAttendanceRequestDTO {
  staffUuid?: string;

  // Deprecated fallback field.
  staffId?: number;
  attendanceDate: string;
  attendanceShortCode: string;
  timeIn?: string;
  timeOut?: string;
  totalHours?: number;
  source: AttendanceSource;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface StaffAttendanceResponseDTO {
  uuid?: string;
  staffUuid?: string;

  // Deprecated fallback response fields.
  staffAttendanceId?: number;
  staffId?: number;
  staffName: string;
  jobTitle?: string;
  attendanceDate: string;
  attendanceMark: string;
  shortCode: string;
  colorCode?: string;
  timeIn?: string;
  timeOut?: string;
  totalHours?: number;
  source: AttendanceSource;
  notes?: string;
  latitude?: number;
  longitude?: number;
  geoVerified?: boolean;
  
  // Option B: Early Leave tracking
  earlyLeave?: boolean;
  earlyOutMinutes?: number;
}

export interface StaffAttendanceQueryParams {
  page?: number;
  size?: number;
  sort?: string;
  staffUuid?: string;

  // Deprecated fallback query field.
  staffId?: number;
  date?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  search?: string;
}

export interface StaffDailyStatsResponseDTO {
  date: string;
  totalMarked: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  unmarkedCount: number;
}

export interface MarkAllResponseDTO {
  marked: number;
  type: string;
  date: string;
}

// ── Staff Attendance Completion ───────────────────────────────────────

export interface UnmarkedStaffItem {
  staffUuid: string;
  staffName: string;
  employeeId: string;
  missingDates: string[];
}

export interface AttendanceCompletionDTO {
  month: number;
  year: number;
  totalActiveStaff: number;
  totalWorkingDays: number;
  totalExpectedRecords: number;
  totalActualRecords: number;
  completionPercentage: number;
  isComplete: boolean;
  unmarkedStaff: UnmarkedStaffItem[];
}

// ── Student Attendance Completion ─────────────────────────────────────

export interface StudentAttendanceCompletionDTO {
  classUuid: string;
  sectionUuid?: string;
  fromDate: string;
  toDate: string;
  totalStudents: number;
  datesWithRecords: string[];
  datesWithoutRecords: string[];
}

// Absence Documentation
export interface SubmitExcuseRequestDTO {
  attendanceUuid?: string;
  submittedByParentUuid?: string;

  // Deprecated fallback fields.
  attendanceId?: number;
  submittedByParentId?: number;
  documentUrl?: string;
  note?: string;
  attendanceDate?: string;
}

export interface AbsenceDocumentationResponseDTO {
  dailyAttendanceId?: number;
  uuid: string;
  dailyAttendanceUuid?: string;
  reasonText?: string;
  documentationUrl?: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  reviewerNotes?: string;
  submittedByUserUuid?: string;
  approvedByStaffUuid?: string;

  // Deprecated fallback response fields.
  submittedByUserId?: number;
  submittedByUserName: string;
  approvedByStaffId?: number;
  approvedByStaffName?: string;
  createdAt: string;
}

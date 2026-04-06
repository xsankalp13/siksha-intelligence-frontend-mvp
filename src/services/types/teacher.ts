export interface SubjectItem {
  uuid: string;
  subjectName: string;
  subjectCode: string;
}

export interface TeacherMyClassesResponseDto {
  classUuid: string;
  className: string;
  sectionUuid: string;
  sectionName: string;
  subjects: SubjectItem[];
  studentCount: number;
  classTeacher: boolean;
}

export interface TeacherStudentResponseDto {
  studentId?: number;
  uuid: string;
  firstName: string;
  lastName: string;
  profileUrl: string;
  enrollmentNo: string;
  rollNumber: string;
  className: string;
  sectionName: string;
  classUuid: string;
  sectionUuid: string;
  guardianName: string;
  guardianPhone: string;
  attendancePercentage: number;
  totalPresent: number;
  totalAbsent: number;
  totalWorkingDays: number;
}

export interface TimeslotItem {
  uuid: string;
  startTime: string;
  endTime: string;
  slotLabel: string;
  break: boolean;
}

export interface ClassItem {
  uuid: string;
  className: string;
}

export interface SectionItem {
  uuid: string;
  sectionName: string;
}

export interface RoomItem {
  uuid: string;
  roomName: string;
  roomType: string;
  floor: string;
}

export type TeacherSlotType = "TEACHING" | "LEISURE" | "BREAK" | "MEETING" | "EVENT";

export interface TeacherScheduleEntry {
  scheduleEntryUuid: string | null;
  dayOfWeek: string;
  slotType: TeacherSlotType;
  timeslot: TimeslotItem;
  subject: SubjectItem | null;
  clazz: ClassItem | null;
  section: SectionItem | null;
  room: RoomItem | null;
}

export interface TeacherScheduleResponseDto {
  teacherName: string;
  staffUuid: string;
  weekStartDate: string;
  weekEndDate: string;
  entries: TeacherScheduleEntry[];
}

export interface DashboardAttendanceSummary {
  present: number;
  absent: number;
  late: number;
  notMarked: number;
  percentage: number;
}

export interface TeacherDashboardSummaryResponseDto {
  date: string;
  totalStudents: number;
  classesToday: number;
  attendance: DashboardAttendanceSummary;
  alerts: {
    atRiskStudentCount: number;
    pendingLeaveRequests: number;
    belowThresholdCount: number;
  };
  nextClass: {
    subject: string;
    className: string;
    sectionName: string;
    room: string;
    startTime: string;
    endTime: string;
  } | null;
}

export interface TeacherHomeroomResponseDto {
  classTeacher: boolean;
  classUuid?: string;
  className?: string;
  sectionUuid?: string;
  sectionName?: string;
  defaultRoom?: {
    uuid: string;
    roomName: string;
  };
  studentCount?: number;
  todayAttendance?: {
    present: number;
    absent: number;
    late: number;
    notMarked: number;
    attendanceMarkedToday: boolean;
  };
  atRiskStudents?: {
    studentUuid: string;
    name: string;
    attendancePercentage: number;
    consecutiveAbsences: number;
  }[];
}

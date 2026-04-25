import { ExamAttendanceStatus } from "./examAttendance";

export interface ControllerDashboardDTO {
  examId: number;
  rooms: ControllerRoomSummaryDTO[];
  timer: ExamTimerDTO;
}

export interface ControllerRoomSummaryDTO {
  roomId: number;
  roomName: string;
  allocatedStudents: number;
  markedStudents: number;
  attendanceStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface ExamTimerDTO {
  startTime: string; // ISO string
  endTime: string; // ISO string
  remainingSeconds: number;
}

export interface ControllerRoomViewDTO {
  examId: number;
  rooms: ControllerRoomDetailDTO[];
}

export interface ControllerRoomDetailDTO {
  roomId: number;
  roomName: string;
  students: ControllerRoomStudentDTO[];
}

export interface ControllerRoomStudentDTO {
  studentId: number;
  studentName: string;
  rollNo: number;
  className: string;
  examScheduleId: number;
  subjectName: string;
  seatNumber: string;
  attendanceStatus: ExamAttendanceStatus | null;
  entryAllowed: boolean;
  malpractice?: boolean;
  finalized?: boolean;
}

export interface ControllerClassViewDTO {
  examId: number;
  classes: ControllerClassGroupDTO[];
}

export interface ControllerClassGroupDTO {
  className: string;
  students: ControllerClassStudentDTO[];
}

export interface ControllerClassStudentDTO {
  studentId: number;
  studentName: string;
  rollNo: number;
  rooms: ControllerClassRoomDTO[];
}

export interface ControllerClassRoomDTO {
  roomId: number;
  roomName: string;
  examScheduleId: number;
  subjectName: string;
  seatNumber: string;
  attendanceStatus: ExamAttendanceStatus | null;
  entryAllowed: boolean;
}

export interface DefaulterDecisionRequestDTO {
  examScheduleId: number;
  studentId: number;
  allowed: boolean;
  reason?: string;
}

export interface DefaulterDecisionResponseDTO {
  examScheduleId: number;
  studentId: number;
  allowed: boolean;
  reason?: string;
  decidedByStaffId: number;
  decidedAt: string;
}

export interface ExamControllerAssignmentRequestDTO {
  examId: number;
  staffId: number;
}

export interface ExamControllerAssignmentResponseDTO {
  assignmentId: number;
  examId: number;
  staffId: number;
  staffName: string;
  assignedByUserId: number;
  assignedAt: string;
}

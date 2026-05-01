export type ExamAttendanceStatus = 'PRESENT' | 'ABSENT' | 'MALPRACTICE' | 'LEFT';

export interface InvigilatorRoomResponseDTO {
    examScheduleId: number;
    roomId: number;
    roomName: string;
    subjectName: string;
    className: string;
    examDate: string; // LocalDate (YYYY-MM-DD)
    startTime: string; // LocalTime (HH:mm:ss)
    endTime: string; // LocalTime (HH:mm:ss)
}

export interface ExamRoomStudentResponseDTO {
    studentId: number;
    studentName: string;
    rollNo: number;
    className: string;
    subjectName: string;
    seatNumber: string;
    attendanceStatus: ExamAttendanceStatus | null;
    malpractice: boolean;
    finalized: boolean;
}

export interface ExamAttendanceMarkEntryDTO {
    studentId: number;
    status: ExamAttendanceStatus;
    malpractice?: boolean;
}

export interface ExamAttendanceMarkRequestDTO {
    examScheduleId: number;
    roomId: number;
    attendances: ExamAttendanceMarkEntryDTO[];
}

export interface ExamAttendanceFinalizeRequestDTO {
    examScheduleId: number;
    roomId: number;
}

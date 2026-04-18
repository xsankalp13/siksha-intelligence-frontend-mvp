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
    rollNo: number;
    name: string;
    className: string;
    seatPosition: string;
    seatLabel: string;
    status: ExamAttendanceStatus | null;
    finalized: boolean;
}

export interface ExamAttendanceMarkEntryDTO {
    studentId: number;
    status: ExamAttendanceStatus;
}

export interface ExamAttendanceMarkRequestDTO {
    examScheduleId: number;
    roomId: number;
    entries: ExamAttendanceMarkEntryDTO[];
}

export interface ExamAttendanceFinalizeRequestDTO {
    examScheduleId: number;
    roomId: number;
}

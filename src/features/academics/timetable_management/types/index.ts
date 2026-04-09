// Type definitions for Timetable Management

export interface Subject {
    _id: string;
    name: string;
    code: string;
    color: string;
}

export interface Teacher {
    _id: string;
    name: string;
    teachableSubjects: string[];
}

export interface ClassData {
    _id: string;
    name: string;
}

export interface Section {
    _id: string;
    name: string;
    defaultRoom?: { uuid: string; name: string };
}

export type CellStatus = 'EMPTY' | 'AWAITING_TEACHER' | 'LOCKED';

export interface GridCellData {
    subject: Subject | null;
    teacher: Teacher | null;
    status: CellStatus;
    roomId?: string | null;
    isNew?: boolean; // For triggering entrance animations
}

export type GridState = Record<string, GridCellData>;

export interface TimetableState {
    selectedClass: ClassData | null;
    selectedSection: Section | null;
    grid: GridState;
    activeCell: string | null;
    isGenerating?: boolean; // True when GA is running
}

export type DraggableType = 'SUBJECT' | 'TEACHER';

export interface DragData {
    type: DraggableType;
    item: Subject | Teacher;
}

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'] as const;

export type Day = typeof DAYS[number];
export type TimeSlot = typeof TIME_SLOTS[number];

// Auto Generate API Types
export interface LLMTeacher {
    name: string;
    subjects: string[];
}

export interface TimetablePeriod {
    period: number;
    subject: string;
    teacher: string;
}

export interface GeneratedTimetable {
    Monday: TimetablePeriod[];
    Tuesday: TimetablePeriod[];
    Wednesday: TimetablePeriod[];
    Thursday: TimetablePeriod[];
    Friday: TimetablePeriod[];
    Saturday: TimetablePeriod[];
    Sunday: TimetablePeriod[];
}

export interface AutoGenerateRequest {
    subjects: string[];
    teachers: LLMTeacher[];
    subjects_per_day: number;
    user_query: string;
}

export interface AutoGenerateSuccessResponse {
    success: true;
    timetable: GeneratedTimetable;
    notes?: string;
}

export interface AutoGenerateErrorResponse {
    success: false;
    error: string;
    conflicting_constraints?: string[];
}

export type AutoGenerateResponse = AutoGenerateSuccessResponse | AutoGenerateErrorResponse;

// Bulk generation types
export interface BulkSectionRequest {
    sectionId: string;
    className: string;
    sectionName: string;
    subjects: string[];
    teachers: LLMTeacher[];
    subjects_per_day: number;
}

export interface BulkGenerateRequest {
    sections: BulkSectionRequest[];
    user_query: string;
}

export interface BulkSectionResult {
    sectionId: string;
    className: string;
    sectionName: string;
    success: boolean;
    timetable?: Record<string, TimetablePeriod[]>;
    notes?: string;
    error?: string;
    conflicting_constraints?: string[];
}

export interface BulkGenerateResponse {
    success: boolean;
    totalSections: number;
    successCount: number;
    failedCount: number;
    results: BulkSectionResult[];
}

// Backend API DTOs
export interface TimetableOverviewDto {
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    scheduleStatus: "PUBLISHED" | "DRAFT" | "MISSING";
    totalPeriods: number;
    createdAt?: string;
    lastUpdatedAt?: string;
}

export interface ScheduleRequestDto {
    sectionId: string;
    subjectId: string;
    teacherId: string; 
    roomId: string | null;
    timeslotId: string;
}

export interface ScheduleResponseDto {
    uuid: string;
    section: {
        uuid: string;
        sectionName: string;
        className: string;
    };
    subject: {
        uuid: string;
        name: string;
        subjectCode: string;
    };
    teacher: {
        id: string; // String serialized Long
        name: string;
    };
    room: {
        uuid: string;
        name: string;
        roomType?: string;
    };
    timeslot: {
        uuid: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        slotLabel: string; // e.g. "Monday_08:00" — added by backend team
        isBreak: boolean;
        isNonTeachingSlot: boolean;
    };
}

// New Editor Context Aggregate DTO (from GET /sections/{sectionId}/editor-context)
export interface EditorContextDto {
    section: {
        uuid: string;
        sectionName: string;
        className: string;
        defaultRoom?: { uuid: string; name: string };
        /** Full name of the class teacher, null if not assigned */
        classTeacherName?: string | null;
        /** TeacherDetails ID — matches the id field in the teachers array */
        classTeacherId?: string | null;
        /** Staff UUID of the class teacher — used when updating section settings */
        classTeacherStaffUuid?: string | null;
    };
    timeslots: Array<{
        uuid: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        slotLabel: string;
        isBreak: boolean;
        isNonTeachingSlot: boolean;
    }>;
    availableSubjects: Array<{
        uuid: string;
        name: string;
        subjectCode: string;
        color?: string;
    }>;
    teachers: Array<{
        id: string;
        name: string;
        teachableSubjectIds: string[];
    }>;
    existingSchedule: Array<{
        uuid: string;
        subjectId: string;
        teacherId: string;
        roomId: string;
        timeslotId: string;
        slotLabel: string;
    }>;
}

// Timeslot CRUD DTOs
export interface TimeslotRequestDto {
    dayOfWeek: number;
    startTime: string; // "HH:mm" or "HH:mm:ss"
    endTime: string;
    slotLabel: string;
    isBreak: boolean;
    isNonTeachingSlot: boolean;
}

export interface TimeslotResponseDto {
    uuid: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotLabel: string;
    isBreak: boolean;
    isNonTeachingSlot: boolean;
}

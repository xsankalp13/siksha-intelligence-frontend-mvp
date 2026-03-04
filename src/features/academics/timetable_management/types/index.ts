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
}

export type CellStatus = 'EMPTY' | 'AWAITING_TEACHER' | 'LOCKED';

export interface GridCellData {
    subject: Subject | null;
    teacher: Teacher | null;
    status: CellStatus;
}

export type GridState = Record<string, GridCellData>;

export interface TimetableState {
    selectedClass: ClassData | null;
    selectedSection: Section | null;
    grid: GridState;
    activeCell: string | null;
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


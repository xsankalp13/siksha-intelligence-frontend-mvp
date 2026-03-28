// ── Academics DTOs ───────────────────────────────────────────────────

// Classes & Sections
export interface AcademicClassRequestDto {
  name: string;
}

export interface SectionResponseDto {
  uuid: string;
  sectionName: string;
}

export interface AcademicClassResponseDto {
  classId: string;
  name: string;
  sections?: SectionResponseDto[];
}

export interface SectionRequestDto {
  sectionName: string;
}

// Subjects
export interface SubjectRequestDto {
  name: string;
  subjectCode: string;
  requiresSpecialRoomType?: string;
}

export interface SubjectResponseDto {
  uuid: string;
  name: string;
  subjectCode: string;
  requiresSpecialRoomType?: string;
}

// Rooms
export interface RoomRequestDto {
  name: string;
  roomType?: string;
}

export interface RoomResponseDto {
  uuid: string;
  name: string;
  roomType?: string;
}

// Timeslots
export interface TimeslotRequestDto {
  dayOfWeek: number;
  startTime: string;
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

// Schedules
export interface ScheduleRequestDto {
  sectionId: string;
  subjectId: string;
  teacherId: number;
  roomId: string;
  timeslotId: string;
}

export interface NestedSectionResponseDto {
  uuid: string;
  sectionName: string;
  className: string;
}

export interface NestedSubjectResponseDto {
  uuid: string;
  name: string;
  subjectCode: string;
}

export interface NestedTeacherResponseDto {
  id: number;
  name: string;
}

export interface NestedRoomResponseDto {
  uuid: string;
  name: string;
  roomType?: string;
}

export interface NestedTimeslotResponseDto {
  uuid: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotLabel: string;
  isNonTeachingSlot?: boolean;
}

export interface ScheduleResponseDto {
  uuid: string;
  section: NestedSectionResponseDto;
  subject: NestedSubjectResponseDto;
  teacher: NestedTeacherResponseDto;
  room: NestedRoomResponseDto;
  timeslot: NestedTimeslotResponseDto;
}

// ── Academics DTOs ───────────────────────────────────────────────────

// Classes & Sections
export interface AcademicClassRequestDto {
  name: string;
}

export interface SectionResponseDto {
  uuid: string;
  sectionName: string;
  defaultRoom?: NestedRoomResponseDto;
}

export interface AcademicClassResponseDto {
  classId: string;
  name: string;
  sections?: SectionResponseDto[];
}

export interface SectionRequestDto {
  sectionName: string;
  defaultRoomId?: string;
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
export interface BuildingRequestDto {
  name: string;
  code?: string;
  totalFloors?: number;
}

export interface BuildingResponseDto {
  uuid: string;
  name: string;
  code?: string;
  totalFloors?: number;
}

export interface RoomRequestDto {
  name: string;
  roomType: string;
  seatingType: string;
  rowCount: number;
  columnsPerRow: number;
  seatsPerUnit: number;
  floorNumber: number;
  buildingId: string;
  hasProjector?: boolean;
  hasAC?: boolean;
  hasWhiteboard?: boolean;
  isAccessible?: boolean;
  otherAmenities?: string;
}

export interface RoomResponseDto {
  uuid: string;
  name: string;
  roomType: string;
  seatingType: string;
  rowCount: number;
  columnsPerRow: number;
  seatsPerUnit: number;
  totalCapacity: number;
  floorNumber: number;
  building: BuildingResponseDto;
  hasProjector?: boolean;
  hasAC?: boolean;
  hasWhiteboard?: boolean;
  isAccessible?: boolean;
  otherAmenities?: string;
}

// Room & Seating type constants
export const ROOM_TYPE_OPTIONS = [
  { value: 'CLASSROOM', label: 'Classroom' },
  { value: 'LABORATORY', label: 'Laboratory' },
  { value: 'COMPUTER_LAB', label: 'Computer Lab' },
  { value: 'LIBRARY', label: 'Library' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const SEATING_TYPE_OPTIONS = [
  { value: 'BENCH', label: 'Bench' },
  { value: 'DESK_CHAIR', label: 'Desk & Chair' },
  { value: 'WORKSTATION', label: 'Workstation' },
  { value: 'TERMINAL', label: 'Terminal' },
] as const;

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
  defaultRoom?: NestedRoomResponseDto;
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
  totalCapacity?: number;
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


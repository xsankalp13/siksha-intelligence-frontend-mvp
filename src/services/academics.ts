import { api } from "@/lib/axios";
import type {
  AcademicClassRequestDto,
  AcademicClassResponseDto,
  SectionRequestDto,
  SectionResponseDto,
  SubjectRequestDto,
  SubjectResponseDto,
  RoomRequestDto,
  RoomResponseDto,
  BuildingRequestDto,
  BuildingResponseDto,
  TimeslotRequestDto,
  TimeslotResponseDto,
  ScheduleRequestDto,
  ScheduleResponseDto,
} from "./types/academics";

// ── Academics Service ────────────────────────────────────────────────

export const academicsService = {
  // ── Classes ──────────────────────────────────────────────────────
  /** GET /auth/classes */
  getAllClasses() {
    return api.get<AcademicClassResponseDto[]>("/auth/classes");
  },

  /** POST /auth/classes */
  createClass(data: AcademicClassRequestDto) {
    return api.post<AcademicClassResponseDto>("/auth/classes", data);
  },

  /** GET /auth/classes/:classId */
  getClassById(classId: string) {
    return api.get<AcademicClassResponseDto>(`/auth/classes/${classId}`);
  },

  /** PUT /auth/classes/:classId */
  updateClass(classId: string, data: AcademicClassRequestDto) {
    return api.put<AcademicClassResponseDto>(`/auth/classes/${classId}`, data);
  },

  /** DELETE /auth/classes/:classId */
  deleteClass(classId: string) {
    return api.delete(`/auth/classes/${classId}`);
  },

  // ── Sections ─────────────────────────────────────────────────────
  /** GET /auth/classes/:classId/sections */
  getSectionsForClass(classId: string) {
    return api.get<SectionResponseDto[]>(`/auth/classes/${classId}/sections`);
  },

  /** POST /auth/classes/:classId/sections */
  createSection(classId: string, data: SectionRequestDto) {
    return api.post<SectionResponseDto>(`/auth/classes/${classId}/sections`, data);
  },

  /** GET /auth/sections/:sectionId */
  getSectionById(sectionId: string) {
    return api.get<SectionResponseDto>(`/auth/sections/${sectionId}`);
  },

  /** PUT /auth/sections/:sectionId */
  updateSection(sectionId: string, data: SectionRequestDto) {
    return api.put<SectionResponseDto>(`/auth/sections/${sectionId}`, data);
  },

  /** DELETE /auth/sections/:sectionId */
  deleteSection(sectionId: string) {
    return api.delete(`/auth/sections/${sectionId}`);
  },

  // ── Subjects ─────────────────────────────────────────────────────
  /** GET /auth/subjects */
  getAllSubjects() {
    return api.get<SubjectResponseDto[]>("/auth/subjects");
  },

  /** POST /auth/subjects */
  createSubject(data: SubjectRequestDto) {
    return api.post<SubjectResponseDto>("/auth/subjects", data);
  },

  /** GET /auth/subjects/:subjectId */
  getSubjectById(subjectId: string) {
    return api.get<SubjectResponseDto>(`/auth/subjects/${subjectId}`);
  },

  /** PUT /auth/subjects/:subjectId */
  updateSubject(subjectId: string, data: SubjectRequestDto) {
    return api.put<SubjectResponseDto>(`/auth/subjects/${subjectId}`, data);
  },

  /** DELETE /auth/subjects/:subjectId */
  deleteSubject(subjectId: string) {
    return api.delete(`/auth/subjects/${subjectId}`);
  },

  // ── Rooms ────────────────────────────────────────────────────────
  /** GET /auth/rooms */
  getAllRooms() {
    return api.get<RoomResponseDto[]>("/auth/rooms");
  },

  /** POST /auth/rooms */
  createRoom(data: RoomRequestDto) {
    return api.post<RoomResponseDto>("/auth/rooms", data);
  },

  /** GET /auth/rooms/:roomId */
  getRoomById(roomId: string) {
    return api.get<RoomResponseDto>(`/auth/rooms/${roomId}`);
  },

  /** PUT /auth/rooms/:roomId */
  updateRoom(roomId: string, data: RoomRequestDto) {
    return api.put<RoomResponseDto>(`/auth/rooms/${roomId}`, data);
  },

  /** DELETE /auth/rooms/:roomId */
  deleteRoom(roomId: string) {
    return api.delete(`/auth/rooms/${roomId}`);
  },

  // ── Timeslots ────────────────────────────────────────────────────
  /** GET /auth/timeslots */
  getAllTimeslots(dayOfWeek?: number) {
    return api.get<TimeslotResponseDto[]>("/auth/timeslots", {
      params: dayOfWeek != null ? { dayOfWeek } : undefined,
    });
  },

  /** POST /auth/timeslots */
  createTimeslot(data: TimeslotRequestDto) {
    return api.post<TimeslotResponseDto>("/auth/timeslots", data);
  },

  /** GET /auth/timeslots/:timeslotId */
  getTimeslotById(timeslotId: string) {
    return api.get<TimeslotResponseDto>(`/auth/timeslots/${timeslotId}`);
  },

  /** PUT /auth/timeslots/:timeslotId */
  updateTimeslot(timeslotId: string, data: TimeslotRequestDto) {
    return api.put<TimeslotResponseDto>(`/auth/timeslots/${timeslotId}`, data);
  },

  /** DELETE /auth/timeslots/:timeslotId */
  deleteTimeslot(timeslotId: string) {
    return api.delete(`/auth/timeslots/${timeslotId}`);
  },

  // ── Schedules ────────────────────────────────────────────────────
  /** GET /auth/sections/:sectionId/schedule */
  getScheduleForSection(sectionId: string) {
    return api.get<ScheduleResponseDto[]>(`/auth/sections/${sectionId}/schedule`);
  },

  /** POST /auth/schedules */
  createSchedule(data: ScheduleRequestDto) {
    return api.post<ScheduleResponseDto>("/auth/schedules", data);
  },

  /** PUT /auth/schedules/:scheduleId */
  updateSchedule(scheduleId: string, data: ScheduleRequestDto) {
    return api.put<ScheduleResponseDto>(`/auth/schedules/${scheduleId}`, data);
  },

  /** DELETE /auth/schedules/:scheduleId */
  deleteSchedule(scheduleId: string) {
    return api.delete(`/auth/schedules/${scheduleId}`);
  },

  /** PATCH /auth/schedules/:sectionId/status/:statusType */
  updateScheduleStatus(sectionId: string, statusType: string) {
    return api.patch<string>(`/auth/schedules/${sectionId}/status/${statusType}`);
  },

  // ── Buildings ──────────────────────────────────────────────────────
  /** GET /auth/buildings */
  getAllBuildings() {
    return api.get<BuildingResponseDto[]>("/auth/buildings");
  },

  /** POST /auth/buildings */
  createBuilding(data: BuildingRequestDto) {
    return api.post<BuildingResponseDto>("/auth/buildings", data);
  },

  /** PUT /auth/buildings/:buildingId */
  updateBuilding(buildingId: string, data: BuildingRequestDto) {
    return api.put<BuildingResponseDto>(`/auth/buildings/${buildingId}`, data);
  },

  /** DELETE /auth/buildings/:buildingId */
  deleteBuilding(buildingId: string) {
    return api.delete(`/auth/buildings/${buildingId}`);
  },
};

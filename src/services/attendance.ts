import { api } from "@/lib/axios";
import type { PageResponse } from "./types/common";
import type {
  AttendanceTypeRequestDTO,
  AttendanceTypeResponseDTO,
  StudentAttendanceRequestDTO,
  StudentAttendanceResponseDTO,
  StudentAttendanceQueryParams,
  StaffAttendanceRequestDTO,
  StaffAttendanceResponseDTO,
  StaffAttendanceQueryParams,
  SubmitExcuseRequestDTO,
  AbsenceDocumentationResponseDTO,
  AttendanceCompletionDTO,
  StudentAttendanceCompletionDTO,
  StaffDailyStatsResponseDTO,
  MarkAllResponseDTO,
} from "./types/attendance";
import type { StaffSummaryDTO } from "./admin";

// ── Attendance Service ───────────────────────────────────────────────

export const attendanceService = {
  // ── Types ────────────────────────────────────────────────────────
  /** GET /auth/ams/types */
  getAllTypes() {
    return api.get<AttendanceTypeResponseDTO[]>("/auth/ams/types");
  },

  /** POST /auth/ams/types */
  createType(data: AttendanceTypeRequestDTO) {
    return api.post<AttendanceTypeResponseDTO>("/auth/ams/types", data);
  },

  /** GET /auth/ams/types/{typeUuid} */
  getTypeById(typeUuid: string) {
    return api.get<AttendanceTypeResponseDTO>(`/auth/ams/types/${typeUuid}`);
  },

  /** PUT /auth/ams/types/{typeUuid} */
  updateType(typeUuid: string, data: AttendanceTypeRequestDTO) {
    return api.put<AttendanceTypeResponseDTO>(`/auth/ams/types/${typeUuid}`, data);
  },

  /** DELETE /auth/ams/types/{typeUuid} */
  deleteType(typeUuid: string) {
    return api.delete(`/auth/ams/types/${typeUuid}`);
  },

  // ── Student Attendance ───────────────────────────────────────────
  /** GET /auth/ams/records (paginated) */
  listStudentAttendance(params?: StudentAttendanceQueryParams) {
    return api.get<PageResponse<StudentAttendanceResponseDTO>>("/auth/ams/records", {
      params,
    });
  },

  /** POST /auth/ams/records (batch create) */
  createStudentAttendanceBatch(data: StudentAttendanceRequestDTO[]) {
    return api.post<StudentAttendanceResponseDTO[]>("/auth/ams/records", data);
  },

  /** GET /auth/ams/records/{recordUuid} */
  getStudentAttendanceById(recordUuid: string) {
    return api.get<StudentAttendanceResponseDTO>(`/auth/ams/records/${recordUuid}`);
  },

  /** PUT /auth/ams/records/{recordUuid} */
  updateStudentAttendance(
    recordUuid: string,
    data: StudentAttendanceRequestDTO
  ) {
    return api.put<StudentAttendanceResponseDTO>(`/auth/ams/records/${recordUuid}`, data);
  },

  /** DELETE /auth/ams/records/{recordUuid} */
  deleteStudentAttendance(recordUuid: string) {
    return api.delete(`/auth/ams/records/${recordUuid}`);
  },

  // ── Staff Attendance ─────────────────────────────────────────────
  /** GET /auth/ams/staff (paginated) */
  listStaffAttendance(params?: StaffAttendanceQueryParams) {
    return api.get<PageResponse<StaffAttendanceResponseDTO>>("/auth/ams/staff", {
      params,
    });
  },

  /** POST /auth/ams/staff */
  createStaffAttendance(data: StaffAttendanceRequestDTO) {
    return api.post<StaffAttendanceResponseDTO>("/auth/ams/staff", data);
  },

  /** POST /auth/ams/staff/bulk */
  createStaffAttendanceBulk(data: StaffAttendanceRequestDTO[]) {
    return api.post<StaffAttendanceResponseDTO[]>("/auth/ams/staff/bulk", data);
  },

  /** GET /auth/ams/staff/{recordUuid} */
  getStaffAttendanceById(recordUuid: string) {
    return api.get<StaffAttendanceResponseDTO>(`/auth/ams/staff/${recordUuid}`);
  },

  /** PUT /auth/ams/staff/{recordUuid} */
  updateStaffAttendance(recordUuid: string, data: StaffAttendanceRequestDTO) {
    return api.put<StaffAttendanceResponseDTO>(`/auth/ams/staff/${recordUuid}`, data);
  },

  /** DELETE /auth/ams/staff/{recordUuid} */
  deleteStaffAttendance(recordUuid: string) {
    return api.delete(`/auth/ams/staff/${recordUuid}`);
  },

  /** GET /auth/ams/staff/stats/daily */
  getDailyStaffStats(date?: string) {
    return api.get<StaffDailyStatsResponseDTO>("/auth/ams/staff/stats/daily", {
      params: { date },
    });
  },

  // ── Absence Documentation ────────────────────────────────────────
  /** POST /auth/ams/excuses/submit */
  submitExcuse(data: SubmitExcuseRequestDTO) {
    return api.post<AbsenceDocumentationResponseDTO>("/auth/ams/excuses/submit", data);
  },

  /** GET /auth/ams/excuses/{docUuid} */
  getExcuseById(docUuid: string) {
    return api.get<AbsenceDocumentationResponseDTO>(`/auth/ams/excuses/${docUuid}`);
  },

  /** POST /auth/ams/excuses/{docUuid}/approve */
  approveExcuse(docUuid: string) {
    return api.post<AbsenceDocumentationResponseDTO>(
      `/auth/ams/excuses/${docUuid}/approve`,
      null
    );
  },

  /** POST /auth/ams/excuses/{docUuid}/reject */
  rejectExcuse(docUuid: string, body?: Record<string, string>) {
    return api.post<AbsenceDocumentationResponseDTO>(
      `/auth/ams/excuses/${docUuid}/reject`,
      body ?? null
    );
  },

  /** GET /auth/ams/excuses/pending (paginated) */
  getPendingExcuses(page?: number, size?: number) {
    return api.get<PageResponse<AbsenceDocumentationResponseDTO>>(
      "/auth/ams/excuses/pending",
      { params: { page, size } }
    );
  },

  // ── Staff Attendance — New Endpoints ────────────────────────────────

  /** GET /auth/ams/staff/attendance-completion?month=&year= */
  getStaffAttendanceCompletion(month: number, year: number) {
    return api.get<AttendanceCompletionDTO>("/auth/ams/staff/attendance-completion", {
      params: { month, year },
    });
  },

  /** GET /auth/ams/staff/unmarked?date=&category= */
  getUnmarkedStaff(date: string, category?: string) {
    return api.get<StaffSummaryDTO[]>("/auth/ams/staff/unmarked", {
      params: { date, category },
    });
  },

  /** POST /auth/ams/staff/mark-all-present?date=&testMode= */
  markAllPresent(date: string, testMode = false) {
    return api.post<MarkAllResponseDTO>("/auth/ams/staff/mark-all-present", null, {
      params: { date, testMode },
    });
  },

  /** POST /auth/ams/staff/mark-all-absent?date=&testMode= */
  markAllAbsent(date: string, testMode = false) {
    return api.post<MarkAllResponseDTO>("/auth/ams/staff/mark-all-absent", null, {
      params: { date, testMode },
    });
  },

  // ── Student Attendance — New Endpoint ───────────────────────────────

  /** GET /auth/ams/records/completion?classUuid=&sectionUuid=&fromDate=&toDate= */
  getStudentAttendanceCompletion(params: {
    classUuid: string;
    sectionUuid?: string;
    fromDate: string;
    toDate: string;
  }) {
    return api.get<StudentAttendanceCompletionDTO>("/auth/ams/records/completion", {
      params,
    });
  },
};

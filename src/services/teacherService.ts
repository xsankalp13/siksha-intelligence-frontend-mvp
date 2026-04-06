import { api } from "@/lib/axios";
import type { PageResponse } from "./types/common";
import type {
  TeacherDashboardSummaryResponseDto,
  TeacherHomeroomResponseDto,
  TeacherMyClassesResponseDto,
  TeacherScheduleResponseDto,
  TeacherStudentResponseDto,
} from "./types/teacher";

const TEACHER = "/teacher";

export const teacherService = {
  getMe: () => api.get("/auth/me"),

  getMyClasses: () => api.get<TeacherMyClassesResponseDto[]>(`${TEACHER}/my-classes`),

  getMyClassTeacherSections: () =>
    api.get<TeacherMyClassesResponseDto[]>(`${TEACHER}/class-teacher/class`),

  getMyStudents: (params?: {
    classUuid?: string;
    sectionUuid?: string;
    search?: string;
    page?: number;
    size?: number;
  }) => api.get<PageResponse<TeacherStudentResponseDto>>(`${TEACHER}/my-students`, { params }),

  getClassTeacherStudents: (params?: {
    sectionUuid?: string;
    search?: string;
    page?: number;
    size?: number;
  }) => api.get<PageResponse<TeacherStudentResponseDto>>(`${TEACHER}/class-teacher/students`, { params }),

  getMySchedule: (date?: string) => api.get<TeacherScheduleResponseDto>(`${TEACHER}/my-schedule`, {
    params: { date },
  }),

  getDashboardSummary: (date?: string) =>
    api.get<TeacherDashboardSummaryResponseDto>(`${TEACHER}/dashboard-summary`, {
      params: { date },
    }),

  getMyHomeroom: (date?: string) =>
    api.get<TeacherHomeroomResponseDto>(`${TEACHER}/my-homeroom`, {
      params: { date },
    }),

  exportAttendanceSheet: (sectionUuid: string, date?: string) =>
    api.get<Blob>(`${TEACHER}/attendance/export`, {
      params: { sectionUuid, date },
      responseType: "blob",
    }),
};

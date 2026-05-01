import { api } from "@/lib/axios";
import type {
  CreateUserRequestDTO,
  CreateStudentRequestDTO,
  CreateTeacherRequestDTO,
  CreatePrincipalRequestDTO,
  CreateLibrarianRequestDTO,
  UpdateStudentRequestDTO,
  UpdateStaffRequestDTO,
  CreateGuardianRequestDTO,
  UpdateGuardianRequestDTO,
  LinkGuardianRequestDTO,
  BulkAssignSubjectsRequestDTO,
} from "./types/admin";
import type {
  ComprehensiveUserProfileResponseDTO,
  StudentGuardianDTO,
  StudentKpiMetricsDTO,
  StaffKpiMetricsDTO
} from "./types/profile";

// ── DTOs returned by the new list endpoints ───────────────────────────

export interface StudentSummaryDTO {
  studentId: number;
  uuid: string;
  enrollmentNumber: string;
  enrollmentStatus: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  username: string;
  dateOfBirth?: string;
  gender?: string;
  rollNo?: number;
  enrollmentDate?: string;
  className?: string;
  sectionName?: string;
}

export interface StaffSummaryDTO {
  staffId: number;
  uuid: string;
  employeeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  username: string;
  dateOfBirth?: string;
  gender?: string;
  jobTitle: string;
  department?: string;
  staffType: string;
  designationId?: number;
  hireDate?: string;
  officeLocation?: string;
  active: boolean;
  // Optional: only present for TEACHER staffType when backend includes competency data
  teachableSubjectIds?: string[];
}

export interface PageResponse<T> {
  content: T[];
  totalElements?: number;  // Old Spring Boot format (at root level)
  totalPages?: number;
  number?: number;          // current page (0-indexed)
  size?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  // New Spring Boot 3.x format - pagination info in nested 'page' object
  page?: {
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  };
}

export interface ListStudentsParams {
  search?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  classId?: string;
}

export interface ListStaffParams {
  search?: string;
  staffType?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// ── Admin User Management Service ────────────────────────────────────

export const adminService = {
  /** GET /auth/admin/users/students — paginated list with search */
  listStudents(params: ListStudentsParams = {}) {
    return api.get<PageResponse<StudentSummaryDTO>>("/auth/admin/users/students", { params });
  },

  /** GET /auth/admin/users/staff — paginated list with search, staffType */
  listStaff(params: ListStaffParams = {}) {
    return api.get<PageResponse<StaffSummaryDTO>>("/auth/admin/users/staff", { params });
  },

  /** POST /auth/admin/users/school-admin */
  createSchoolAdmin(data: CreateUserRequestDTO) {
    return api.post<string>("/auth/admin/users/school-admin", data);
  },

  /** POST /auth/admin/users/student */
  createStudent(data: CreateStudentRequestDTO) {
    return api.post<string>("/auth/admin/users/student", data);
  },

  /** POST /auth/admin/users/staff/teacher */
  createTeacher(data: CreateTeacherRequestDTO) {
    return api.post<string>("/auth/admin/users/staff/teacher", data);
  },

  /** POST /auth/admin/users/staff/principal */
  createPrincipal(data: CreatePrincipalRequestDTO) {
    return api.post<string>("/auth/admin/users/staff/principal", data);
  },

  /** POST /auth/admin/users/staff/librarian */
  createLibrarian(data: CreateLibrarianRequestDTO) {
    return api.post<string>("/auth/admin/users/staff/librarian", data);
  },

  /** POST /auth/admin/users/staff/security-guard */
  createSecurityGuard(data: any) {
    return api.post<string>("/auth/admin/users/staff/security-guard", data);
  },

  /** GET /auth/hrms/designations */
  listDesignations() {
    return api.get<any[]>("/auth/hrms/designations");
  },

  /** PUT /auth/admin/users/student/{studentId} — studentId is the UUID field */
  updateStudent(uuid: string, data: UpdateStudentRequestDTO) {
    return api.put<string>(`/auth/admin/users/student/${uuid}`, data);
  },

  /** PUT /auth/admin/users/staff/{staffId} — staffId is the UUID field */
  updateStaff(uuid: string, data: UpdateStaffRequestDTO) {
    return api.put<string>(`/auth/admin/users/staff/${uuid}`, data);
  },

  /** PATCH /auth/admin/users/student/{studentId}/activation */
  toggleStudentActivation(uuid: string, active: boolean) {
    return api.patch<string>(`/auth/admin/users/student/${uuid}/activation`, null, {
      params: { active },
    });
  },

  /** PATCH /auth/admin/users/staff/{staffId}/activation */
  toggleStaffActivation(uuid: string, active: boolean) {
    return api.patch<string>(`/auth/admin/users/staff/${uuid}/activation`, null, {
      params: { active },
    });
  },

  /** GET /auth/admin/users/student/{studentId}/details */
  getStudentFullDetails(uuid: string) {
    return api.get<ComprehensiveUserProfileResponseDTO>(`/auth/admin/users/student/${uuid}/details`);
  },

  /** GET /auth/admin/users/staff/{staffId}/details */
  getStaffFullDetails(uuid: string) {
    return api.get<ComprehensiveUserProfileResponseDTO>(`/auth/admin/users/staff/${uuid}/details`);
  },

  /** GET /auth/admin/users/student/{studentId}/kpi-metrics */
  getStudentKpiMetrics(uuid: string) {
    return api.get<StudentKpiMetricsDTO>(`/auth/admin/users/student/${uuid}/kpi-metrics`);
  },

  /** GET /auth/admin/users/staff/{staffId}/kpi-metrics */
  getStaffKpiMetrics(uuid: string) {
    return api.get<StaffKpiMetricsDTO>(`/auth/admin/users/staff/${uuid}/kpi-metrics`);
  },

  /** PUT /auth/teachers/bulk-subjects */
  bulkAssignSubjects(data: BulkAssignSubjectsRequestDTO) {
    return api.put<string>("/auth/teachers/bulk-subjects", data);
  },

  // ── Guardian Management ────────────────────────────────────────────────

  /** GET /auth/admin/users/student/{studentId}/guardians */
  getStudentGuardians(studentId: string) {
    return api.get<StudentGuardianDTO[]>(`/auth/admin/users/student/${studentId}/guardians`);
  },

  /** POST /auth/admin/users/student/{studentId}/guardian */
  createGuardian(studentId: string, data: CreateGuardianRequestDTO) {
    return api.post<string>(`/auth/admin/users/student/${studentId}/guardian`, data);
  },

  /** POST /auth/admin/users/student/{studentId}/guardian/link */
  linkGuardian(studentId: string, data: LinkGuardianRequestDTO) {
    return api.post<string>(`/auth/admin/users/student/${studentId}/guardian/link`, data);
  },

  /** PUT /auth/admin/users/student/{studentId}/guardian/{guardianId} */
  updateGuardian(studentId: string, guardianId: string, data: UpdateGuardianRequestDTO) {
    return api.put<string>(`/auth/admin/users/student/${studentId}/guardian/${guardianId}`, data);
  },

  /** DELETE /auth/admin/users/student/{studentId}/guardian/{guardianId}/unlink */
  unlinkGuardian(studentId: string, guardianId: string) {
    return api.delete<string>(`/auth/admin/users/student/${studentId}/guardian/${guardianId}/unlink`);
  },

  // ── Bulk Operations ──────────────────────────────────────────────────

  /** POST /auth/admin/bulk-upload/photos/{userType} */
  uploadBulkPhotos(userType: "students" | "staff", file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<BulkUploadReportDTO>(`/auth/admin/bulk-upload/photos/${userType}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // ── HR Admin Promotion ───────────────────────────────────────────────

  /**
   * POST /auth/admin/users/staff/{staffId}/promote-hr-admin
   * Additively grants ROLE_HR_ADMIN to a staff member. Preserves all existing roles.
   * Accessible by SUPER_ADMIN and SCHOOL_ADMIN.
   */
  promoteToHrAdmin(staffId: string) {
    return api.post<string>(`/auth/admin/users/staff/${staffId}/promote-hr-admin`);
  },

  /**
   * DELETE /auth/admin/users/staff/{staffId}/demote-hr-admin
   * Removes ROLE_HR_ADMIN from a staff member. Preserves all other roles.
   * Accessible by SUPER_ADMIN and SCHOOL_ADMIN.
   */
  demoteFromHrAdmin(staffId: string) {
    return api.delete<string>(`/auth/admin/users/staff/${staffId}/demote-hr-admin`);
  },

  /**
   * GET /auth/admin/users/generate-username
   * Returns a unique username suggestion derived from the given firstName and lastName.
   */
  generateUsername(firstName: string, lastName: string) {
    return api.get<{ username: string; available: boolean }>(
      "/auth/admin/users/generate-username",
      { params: { firstName, lastName } }
    );
  },

  checkUsername(username: string) {
    return api.get<{ username: string; available: boolean }>(
      "/auth/admin/users/check-username",
      { params: { username } }
    );
  },
};


export interface BulkUploadReportDTO {
  success: number;
  failed: number;
  errors: string[];
}


import axios from "axios";
import { api } from "@/lib/axios";
import type { PageResponse } from "./types/common";
import type {
  CalendarEventCreateDTO,
  CalendarEventResponseDTO,
  CalendarSummaryDTO,
  ComputedSalaryBreakdownDTO,
  HrmsApiErrorResponse,
  HrmsDashboardSummaryDTO,
  HrmsListParams,
  LeaveApplicationCreateDTO,
  LeaveApplicationResponseDTO,
  LeaveBalanceInitializeDTO,
  LeaveBalanceResponseDTO,
  LeaveReviewDTO,
  LeaveTypeConfigCreateUpdateDTO,
  LeaveTypeConfigResponseDTO,
  PayrollRunCreateDTO,
  PayrollRunResponseDTO,
  PayslipDetailDTO,
  PayslipSummaryDTO,
  SalaryComponentCreateUpdateDTO,
  SalaryComponentResponseDTO,
  SalaryTemplateCreateDTO,
  SalaryTemplateResponseDTO,
  SalaryTemplateUpdateDTO,
  StaffCategory,
  StaffAttendanceSummaryDTO,
  StaffDesignationCreateUpdateDTO,
  StaffDesignationResponseDTO,
  StaffGradeAssignDTO,
  StaffGradeAssignmentResponseDTO,
  StaffGradeCreateUpdateDTO,
  StaffGradeResponseDTO,
  StaffSalaryMappingBulkCreateDTO,
  StaffSummaryDTO,
  StaffSalaryMappingCreateDTO,
  StaffSalaryMappingResponseDTO,
} from "./types/hrms";

const HRMS = "/auth/hrms";

// ── Error normalizer ─────────────────────────────────────────────────

export interface NormalizedHrmsError {
  message: string;
  fieldErrors?: Record<string, string[]>;
}

function toStringArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

export function normalizeHrmsError(error: unknown): NormalizedHrmsError {
  if (!axios.isAxiosError(error)) {
    return { message: "Unexpected error occurred" };
  }
  const data = error.response?.data as HrmsApiErrorResponse | undefined;
  const fieldErrors = data?.fieldErrors
    ? Object.entries(data.fieldErrors).reduce<Record<string, string[]>>(
        (acc, [key, value]) => {
          acc[key] = toStringArray(value);
          return acc;
        },
        {},
      )
    : undefined;
  return {
    message: data?.message ?? "Request failed",
    fieldErrors,
  };
}

// ── Service ──────────────────────────────────────────────────────────

export const hrmsService = {
  // ── Calendar ─────────────────────────────────────────────────────
  listCalendarEvents(params?: HrmsListParams) {
    return api.get<CalendarEventResponseDTO[]>(`${HRMS}/calendar/events`, {
      params: { academicYear: params?.academicYear, month: params?.month },
    });
  },

  createCalendarEvent(payload: CalendarEventCreateDTO) {
    return api.post<CalendarEventResponseDTO>(`${HRMS}/calendar/events`, payload);
  },

  createCalendarEventsBulk(payload: CalendarEventCreateDTO[]) {
    return api.post<{ totalProcessed: number; successCount: number; failedCount: number; errors: string[] }>(
      `${HRMS}/calendar/events/bulk`,
      payload,
    );
  },

  updateCalendarEvent(identifier: string, payload: CalendarEventCreateDTO) {
    return api.put<CalendarEventResponseDTO>(`${HRMS}/calendar/events/${identifier}`, payload);
  },

  deleteCalendarEvent(identifier: string) {
    return api.delete<void>(`${HRMS}/calendar/events/${identifier}`);
  },

  getCalendarSummary(academicYear: string) {
    return api.get<CalendarSummaryDTO>(`${HRMS}/calendar/summary`, {
      params: { academicYear },
    });
  },

  // ── Leave Types ──────────────────────────────────────────────────
  listLeaveTypes(params?: { category?: StaffCategory }) {
    return api.get<LeaveTypeConfigResponseDTO[]>(`${HRMS}/leaves/types`, { params });
  },

  getLeaveType(identifier: string) {
    return api.get<LeaveTypeConfigResponseDTO>(`${HRMS}/leaves/types/${identifier}`);
  },

  createLeaveType(payload: LeaveTypeConfigCreateUpdateDTO) {
    return api.post<LeaveTypeConfigResponseDTO>(`${HRMS}/leaves/types`, payload);
  },

  updateLeaveType(identifier: string, payload: LeaveTypeConfigCreateUpdateDTO) {
    return api.put<LeaveTypeConfigResponseDTO>(`${HRMS}/leaves/types/${identifier}`, payload);
  },

  deleteLeaveType(identifier: string) {
    return api.delete<void>(`${HRMS}/leaves/types/${identifier}`);
  },

  // ── Leave Applications ───────────────────────────────────────────
  listLeaveApplications(params?: HrmsListParams) {
    return api.get<PageResponse<LeaveApplicationResponseDTO>>(`${HRMS}/leaves/applications`, {
      params,
    });
  },

  getLeaveApplication(identifier: string) {
    return api.get<LeaveApplicationResponseDTO>(`${HRMS}/leaves/applications/${identifier}`);
  },

  applyLeave(payload: LeaveApplicationCreateDTO) {
    return api.post<LeaveApplicationResponseDTO>(`${HRMS}/leaves/applications`, payload);
  },

  approveLeave(identifier: string, payload?: LeaveReviewDTO) {
    return api.post<LeaveApplicationResponseDTO>(
      `${HRMS}/leaves/applications/${identifier}/approve`,
      payload ?? {},
    );
  },

  rejectLeave(identifier: string, payload?: LeaveReviewDTO) {
    return api.post<LeaveApplicationResponseDTO>(
      `${HRMS}/leaves/applications/${identifier}/reject`,
      payload ?? {},
    );
  },

  cancelLeave(identifier: string, payload?: LeaveReviewDTO) {
    return api.post<LeaveApplicationResponseDTO>(
      `${HRMS}/leaves/applications/${identifier}/cancel`,
      payload ?? {},
    );
  },

  // ── Leave Balances ───────────────────────────────────────────────
  getMyLeaveBalance() {
    return api.get<LeaveBalanceResponseDTO[]>(`${HRMS}/leaves/balance/me`);
  },

  getStaffLeaveBalance(staffIdentifier: string, academicYear?: string) {
    return api.get<LeaveBalanceResponseDTO[]>(`${HRMS}/leaves/balance/${staffIdentifier}`, {
      params: { academicYear },
    });
  },

  getAllLeaveBalances(params?: HrmsListParams) {
    return api.get<PageResponse<LeaveBalanceResponseDTO>>(`${HRMS}/leaves/balance/all`, {
      params,
    });
  },

  initializeLeaveBalances(payload: LeaveBalanceInitializeDTO) {
    return api.post<{ totalProcessed: number; successCount: number; failedCount: number; errors: string[] }>(
      `${HRMS}/leaves/balance/initialize`,
      payload,
    );
  },

  // ── Staff Designations ──────────────────────────────────────────
  listDesignations(params?: { category?: StaffCategory; active?: boolean }) {
    return api.get<StaffDesignationResponseDTO[]>(`${HRMS}/designations`, { params });
  },

  listStaffForDropdown() {
    return api.get<PageResponse<StaffSummaryDTO>>("/auth/admin/users/staff", {
      params: { page: 0, size: 500, sortBy: "firstName", sortDir: "asc" },
    });
  },

  getDesignation(identifier: string) {
    return api.get<StaffDesignationResponseDTO>(`${HRMS}/designations/${identifier}`);
  },

  createDesignation(payload: StaffDesignationCreateUpdateDTO) {
    return api.post<StaffDesignationResponseDTO>(`${HRMS}/designations`, payload);
  },

  updateDesignation(identifier: string, payload: StaffDesignationCreateUpdateDTO) {
    return api.put<StaffDesignationResponseDTO>(`${HRMS}/designations/${identifier}`, payload);
  },

  deleteDesignation(identifier: string) {
    return api.delete<void>(`${HRMS}/designations/${identifier}`);
  },

  // ── Staff Grades ─────────────────────────────────────────────────
  listGrades() {
    return api.get<StaffGradeResponseDTO[]>(`${HRMS}/grades`);
  },

  createGrade(payload: StaffGradeCreateUpdateDTO) {
    return api.post<StaffGradeResponseDTO>(`${HRMS}/grades`, payload);
  },

  updateGrade(identifier: string, payload: StaffGradeCreateUpdateDTO) {
    return api.put<StaffGradeResponseDTO>(`${HRMS}/grades/${identifier}`, payload);
  },

  deleteGrade(identifier: string) {
    return api.delete<void>(`${HRMS}/grades/${identifier}`);
  },

  // ── Grade Assignments ────────────────────────────────────────────
  assignGrade(payload: StaffGradeAssignDTO) {
    return api.post<StaffGradeAssignmentResponseDTO>(`${HRMS}/grades/assign`, payload);
  },

  getStaffCurrentGrade(staffIdentifier: string) {
    return api.get<StaffGradeAssignmentResponseDTO>(`${HRMS}/grades/staff/${staffIdentifier}/current`);
  },

  getStaffGradeHistory(staffIdentifier: string) {
    return api.get<StaffGradeAssignmentResponseDTO[]>(`${HRMS}/grades/staff/${staffIdentifier}/history`);
  },

  listGradeAssignments(params?: HrmsListParams) {
    return api.get<PageResponse<StaffGradeAssignmentResponseDTO>>(`${HRMS}/grades/assignments`, {
      params,
    });
  },

  // ── Salary Components ────────────────────────────────────────────
  listSalaryComponents() {
    return api.get<SalaryComponentResponseDTO[]>(`${HRMS}/salary/components`);
  },

  createSalaryComponent(payload: SalaryComponentCreateUpdateDTO) {
    return api.post<SalaryComponentResponseDTO>(`${HRMS}/salary/components`, payload);
  },

  updateSalaryComponent(identifier: string, payload: SalaryComponentCreateUpdateDTO) {
    return api.put<SalaryComponentResponseDTO>(`${HRMS}/salary/components/${identifier}`, payload);
  },

  deleteSalaryComponent(identifier: string) {
    return api.delete<void>(`${HRMS}/salary/components/${identifier}`);
  },

  // ── Salary Templates ─────────────────────────────────────────────
  listSalaryTemplates(params?: { category?: StaffCategory }) {
    return api.get<SalaryTemplateResponseDTO[]>(`${HRMS}/salary/templates`, { params });
  },

  getSalaryTemplate(identifier: string) {
    return api.get<SalaryTemplateResponseDTO>(`${HRMS}/salary/templates/${identifier}`);
  },

  createSalaryTemplate(payload: SalaryTemplateCreateDTO) {
    return api.post<SalaryTemplateResponseDTO>(`${HRMS}/salary/templates`, payload);
  },

  updateSalaryTemplate(identifier: string, payload: SalaryTemplateUpdateDTO) {
    return api.put<SalaryTemplateResponseDTO>(`${HRMS}/salary/templates/${identifier}`, payload);
  },

  deleteSalaryTemplate(identifier: string) {
    return api.delete<void>(`${HRMS}/salary/templates/${identifier}`);
  },

  // ── Staff Salary Mappings ────────────────────────────────────────
  listSalaryMappings(params?: HrmsListParams) {
    return api.get<PageResponse<StaffSalaryMappingResponseDTO>>(`${HRMS}/salary/mappings`, {
      params,
    });
  },

  getStaffSalaryMapping(staffIdentifier: string) {
    return api.get<StaffSalaryMappingResponseDTO>(`${HRMS}/salary/mappings/staff/${staffIdentifier}`);
  },

  createSalaryMapping(payload: StaffSalaryMappingCreateDTO) {
    return api.post<StaffSalaryMappingResponseDTO>(`${HRMS}/salary/mappings`, payload);
  },

  updateSalaryMapping(identifier: string, payload: StaffSalaryMappingCreateDTO) {
    return api.put<StaffSalaryMappingResponseDTO>(`${HRMS}/salary/mappings/${identifier}`, payload);
  },

  deleteSalaryMapping(identifier: string) {
    return api.delete<void>(`${HRMS}/salary/mappings/${identifier}`);
  },

  bulkCreateSalaryMappings(payload: StaffSalaryMappingBulkCreateDTO) {
    return api.post<{ totalProcessed: number; successCount: number; failedCount: number; errors: string[] }>(
      `${HRMS}/salary/mappings/bulk`,
      payload,
    );
  },

  getComputedSalary(mappingIdentifier: string) {
    return api.get<ComputedSalaryBreakdownDTO>(`${HRMS}/salary/mappings/${mappingIdentifier}/computed`);
  },

  // ── Payroll Runs ─────────────────────────────────────────────────
  listPayrollRuns(params?: HrmsListParams) {
    return api.get<PageResponse<PayrollRunResponseDTO>>(`${HRMS}/payroll/runs`, { params });
  },

  getPayrollRun(runIdentifier: string) {
    return api.get<PayrollRunResponseDTO>(`${HRMS}/payroll/runs/${runIdentifier}`);
  },

  createPayrollRun(payload: PayrollRunCreateDTO) {
    return api.post<PayrollRunResponseDTO>(`${HRMS}/payroll/runs`, payload);
  },

  approvePayrollRun(runIdentifier: string) {
    return api.post<PayrollRunResponseDTO>(`${HRMS}/payroll/runs/${runIdentifier}/approve`);
  },

  disbursePayrollRun(runIdentifier: string) {
    return api.post<PayrollRunResponseDTO>(`${HRMS}/payroll/runs/${runIdentifier}/disburse`);
  },

  // ── Payslips (Admin) ─────────────────────────────────────────────
  listPayslipsByRun(runIdentifier: string, params?: HrmsListParams) {
    return api.get<PageResponse<PayslipSummaryDTO>>(`${HRMS}/payroll/runs/${runIdentifier}/payslips`, {
      params,
    });
  },

  getPayslip(payslipIdentifier: string) {
    return api.get<PayslipDetailDTO>(`${HRMS}/payroll/payslips/${payslipIdentifier}`);
  },

  downloadPayslipPdf(payslipIdentifier: string) {
    return api.get<Blob>(`${HRMS}/payroll/payslips/${payslipIdentifier}/pdf`, {
      responseType: "blob",
    });
  },

  listStaffPayslips(staffIdentifier: string, params?: HrmsListParams) {
    return api.get<PageResponse<PayslipSummaryDTO>>(`${HRMS}/payroll/staff/${staffIdentifier}/payslips`, {
      params,
    });
  },

  // ── Payslips (Self-service) ──────────────────────────────────────
  listMyPayslips(params?: HrmsListParams) {
    return api.get<PageResponse<PayslipSummaryDTO>>(`${HRMS}/payroll/self/payslips`, { params });
  },

  getMyPayslip(payslipIdentifier: string) {
    return api.get<PayslipDetailDTO>(`${HRMS}/payroll/self/payslips/${payslipIdentifier}`);
  },

  downloadMyPayslipPdf(payslipIdentifier: string) {
    return api.get<Blob>(`${HRMS}/payroll/self/payslips/${payslipIdentifier}/pdf`, {
      responseType: "blob",
    });
  },

  // ── Self-service Attendance ──────────────────────────────────────
  getMyAttendanceSummary(params?: Pick<HrmsListParams, "year" | "month">) {
    return api.get<StaffAttendanceSummaryDTO>(`${HRMS}/payroll/self/attendance`, {
      params,
    });
  },

  // ── Dashboard ────────────────────────────────────────────────────
  getDashboardSummary() {
    return api.get<HrmsDashboardSummaryDTO>(`${HRMS}/dashboard/summary`);
  },
};

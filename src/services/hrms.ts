import axios from "axios";
import { api } from "@/lib/axios";
import type { PageResponse } from "./types/common";
import type { ImageUploadInstruction } from "./types/media";
import type {
  AttendanceHeatmapDTO,
  Staff360ProfileDTO,
  StaffDocumentDTO,
  StaffDocumentUploadInitRequest,
  StaffDocumentUploadCompleteRequest,
  DocumentCategory,
  ApprovalChainConfigDTO,
  ApprovalChainConfigCreateDTO,
  ApprovalRequestDTO,
  ApprovalActionType,
  OnboardingTemplateDTO,
  OnboardingTemplateCreateDTO,
  OnboardingRecordDTO,
  OnboardingStartDTO,
  ExitRequestDTO,
  ExitRequestCreateDTO,
  ExitRequestStatus,
  ExitClearanceItemDTO,
  FullFinalSettlementDTO,
  FnFCreateDTO,
  AppraisalCycleDTO,
  AppraisalCycleCreateDTO,
  AppraisalGoalDTO,
  AppraisalGoalCreateDTO,
  AppraisalSummaryDTO,
  TrainingCourseDTO,
  TrainingCourseCreateDTO,
  CourseEnrollmentDTO,
  StaffLoanDTO,
  StaffLoanCreateDTO,
  LoanSummaryDTO,
  LoanStatus,
  LoanStatusUpdateDTO,
  LoanRepaymentRecordDTO,
  ExpenseClaimDTO,
  ExpenseClaimStatus,
  ExpenseClaimCreateDTO,
  ExpenseClaimItemCreateDTO,
  ExpenseClaimItemDTO,
  OvertimeRecordDTO,
  OvertimeStatus,
  OvertimeCreateDTO,
  CompOffRecordDTO,
  CompOffCreateDTO,
  CompOffBalanceSummaryDTO,
  AppraisalCycleStatus,
  StatutoryConfigDTO,
  StatutoryConfigCreateDTO,
  ReportType,
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
  LeaveTemplateCreateDTO,
  LeaveTemplateResponseDTO,
  PromotionCreateDTO,
  PromotionResponseDTO,
  PromotionReviewDTO,
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
  BankAccountType,
  BankDetailsUpdateDTO,
  BankDetailsBulkImportResultDTO,
  StaffBankStatusDTO,
  UnmappedStaffDTO,
} from "./types/hrms";
import type { PayrollPreflightDTO } from "./types/payrollPreflight";

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
      params: {
        academicYear: params?.academicYear,
        month: params?.month,
        fromDate: params?.fromDate,
        toDate: params?.toDate,
      },
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

  // ── Self-service Leaves (for TEACHER role) ───────────────────────
  listMyLeaveApplications(params?: HrmsListParams) {
    return api.get<PageResponse<LeaveApplicationResponseDTO>>(`${HRMS}/leaves/self/applications`, {
      params,
    });
  },

  applyMyLeave(payload: LeaveApplicationCreateDTO) {
    return api.post<LeaveApplicationResponseDTO>(`${HRMS}/leaves/self/applications`, payload);
  },

  cancelMyLeave(identifier: string) {
    return api.post<LeaveApplicationResponseDTO>(
      `${HRMS}/leaves/self/applications/${identifier}/cancel`,
      {},
    );
  },

  listMyLeaveTypes() {
    return api.get<LeaveTypeConfigResponseDTO[]>(`${HRMS}/leaves/self/types`);
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
  listSalaryMappings(params?: HrmsListParams & { view?: string; gradeCode?: string; templateRef?: string }) {
    return api.get<PageResponse<StaffSalaryMappingResponseDTO>>(`${HRMS}/salary/mappings`, {
      params,
    });
  },

  listUnmappedStaff() {
    return api.get<UnmappedStaffDTO[]>(`${HRMS}/salary/mappings/unmapped-staff`);
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

  /** GET /auth/hrms/payroll/preflight?month=&year= */
  getPayrollPreflight(month: number, year: number) {
    return api.get<PayrollPreflightDTO>(`${HRMS}/payroll/preflight`, {
      params: { month, year },
    });
  },

  approvePayrollRun(runIdentifier: string) {
    return api.post<PayrollRunResponseDTO>(`${HRMS}/payroll/runs/${runIdentifier}/approve`);
  },

  disbursePayrollRun(runIdentifier: string) {
    return api.post<PayrollRunResponseDTO>(`${HRMS}/payroll/runs/${runIdentifier}/disburse`);
  },

  voidPayrollRun(runIdentifier: string) {
    return api.delete<PayrollRunResponseDTO>(`${HRMS}/payroll/runs/${runIdentifier}/void`);
  },

  /** GET /auth/hrms/payroll/runs/{id}/bank-advice — returns PDF blob */
  downloadBankSalaryAdvice(runIdentifier: string) {
    return api.get<Blob>(`${HRMS}/payroll/runs/${runIdentifier}/bank-advice`, {
      responseType: "blob",
    });
  },

  /** POST /auth/hrms/payroll/preflight/mark-absent — bulk-mark all unmarked staff as absent */
  markAllAbsentForPeriod(month: number, year: number) {
    return api.post<{ markedAbsent: number; month: number; year: number }>(
      `${HRMS}/payroll/preflight/mark-absent`,
      null,
      { params: { month, year } }
    );
  },

  /** POST /auth/hrms/payroll/preflight/mark-present — bulk-mark all unmarked staff as present */
  markAllPresentForPeriod(month: number, year: number) {
    return api.post<{ markedPresent: number; month: number; year: number }>(
      `${HRMS}/payroll/preflight/mark-present`,
      null,
      { params: { month, year } }
    );
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

  // ── Self-service Salary ─────────────────────────────────────────
  getMySalaryStructure() {
    return api.get<ComputedSalaryBreakdownDTO>(`${HRMS}/salary/self/structure`);
  },

  // ── Leave Templates ─────────────────────────────────────────────
  listLeaveTemplates(academicYear?: string, category?: string) {
    return api.get<LeaveTemplateResponseDTO[]>(`${HRMS}/leave-templates`, {
      params: { academicYear, category }
    });
  },
  getLeaveTemplate(templateRef: string) {
    return api.get<LeaveTemplateResponseDTO>(`${HRMS}/leave-templates/${templateRef}`);
  },
  createLeaveTemplate(payload: LeaveTemplateCreateDTO) {
    return api.post<LeaveTemplateResponseDTO>(`${HRMS}/leave-templates`, payload);
  },
  updateLeaveTemplate(templateRef: string, payload: LeaveTemplateCreateDTO) {
    return api.put<LeaveTemplateResponseDTO>(`${HRMS}/leave-templates/${templateRef}`, payload);
  },
  deleteLeaveTemplate(templateRef: string) {
    return api.delete(`${HRMS}/leave-templates/${templateRef}`);
  },
  /**
   * Assign a leave template to an individual staff member.
   * Template ref goes in the path; staffRef + academicYear in body.
   */
  assignTemplateToStaff(templateRef: string, payload: { staffRef: string; academicYear: string }) {
    return api.post<import('./types/hrms').StaffLeaveTemplateMappingResponseDTO>(
      `${HRMS}/leave-templates/${templateRef}/assign`,
      payload,
    );
  },
  /**
   * Get all template mappings for a staff member (many-to-one support).
   */
  getStaffTemplateMappings(staffRef: string) {
    return api.get<import('./types/hrms').StaffLeaveTemplateMappingResponseDTO[]>(
      `${HRMS}/leave-templates/staff/${staffRef}`,
    );
  },
  /**
   * Bulk-assign a leave template to all staff under a designation.
   * Template ref goes in the path; designationRef + academicYear in body.
   */
  bulkAssignTemplates(templateRef: string, payload: { designationRef: string; academicYear: string }) {
    return api.post<{ totalProcessed: number; successCount: number; failedCount: number; errors: string[] }>(
      `${HRMS}/leave-templates/${templateRef}/assign-by-designation`,
      payload,
    );
  },

  // ── Promotions ──────────────────────────────────────────────────
  listPromotions(params?: HrmsListParams) {
    return api.get<PageResponse<PromotionResponseDTO>>(`${HRMS}/promotions`, { params });
  },
  getPromotion(ref: string) {
    return api.get<PromotionResponseDTO>(`${HRMS}/promotions/${ref}`);
  },
  initiatePromotion(payload: PromotionCreateDTO) {
    return api.post<PromotionResponseDTO>(`${HRMS}/promotions`, payload);
  },
  approvePromotion(ref: string, payload: PromotionReviewDTO) {
    return api.post<PromotionResponseDTO>(`${HRMS}/promotions/${ref}/approve`, payload);
  },
  rejectPromotion(ref: string, payload: PromotionReviewDTO) {
    return api.post<PromotionResponseDTO>(`${HRMS}/promotions/${ref}/reject`, payload);
  },
  getStaffPromotionHistory(staffRef: string) {
    return api.get<PromotionResponseDTO[]>(`${HRMS}/promotions/staff/${staffRef}/history`);
  },

  // ── Dashboard Heatmap ────────────────────────────────────────────
  getAttendanceHeatmap(year: number, month?: number, staffRef?: string) {
    return api.get<AttendanceHeatmapDTO>(`${HRMS}/dashboard/attendance-heatmap`, {
      params: { year, month, staffRef },
    });
  },

  // ── Staff 360° Profile ───────────────────────────────────────────
  getStaff360Profile(staffRef: string) {
    return api.get<Staff360ProfileDTO>(`${HRMS}/staff/${staffRef}/360-profile`);
  },

  // ── Phase 2A: Documents ──────────────────────────────────────────
  documentUploadInit(staffRef: string, payload: StaffDocumentUploadInitRequest) {
    return api.post<ImageUploadInstruction>(`${HRMS}/staff/${staffRef}/documents/upload-url`, payload);
  },
  documentUploadComplete(staffRef: string, payload: StaffDocumentUploadCompleteRequest) {
    return api.post<StaffDocumentDTO>(`${HRMS}/staff/${staffRef}/documents/confirm-upload`, payload);
  },
  listDocuments(staffRef: string, category?: DocumentCategory) {
    return api.get<StaffDocumentDTO[]>(`${HRMS}/staff/${staffRef}/documents`, { params: { category } });
  },
  deleteDocument(staffRef: string, docId: string) {
    return api.delete<void>(`${HRMS}/staff/${staffRef}/documents/${docId}`);
  },
  getDocumentDownloadUrl(staffRef: string, docId: string) {
    return api.get<{ downloadUrl: string; expiresAt: string }>(
      `${HRMS}/staff/${staffRef}/documents/${docId}/download-url`
    );
  },

  // ── Phase 2B: Approval Engine ────────────────────────────────────
  listApprovalChains() {
    return api.get<ApprovalChainConfigDTO[]>(`${HRMS}/approval-chains`);
  },
  createApprovalChain(payload: ApprovalChainConfigCreateDTO) {
    return api.post<ApprovalChainConfigDTO>(`${HRMS}/approval-chains`, payload);
  },
  updateApprovalChain(configId: string, payload: ApprovalChainConfigCreateDTO) {
    return api.put<ApprovalChainConfigDTO>(`${HRMS}/approval-chains/${configId}`, payload);
  },
  deleteApprovalChain(configId: string) {
    return api.delete<void>(`${HRMS}/approval-chains/${configId}`);
  },
  listApprovalRequests(params?: HrmsListParams & { actionType?: ApprovalActionType }) {
    return api.get<PageResponse<ApprovalRequestDTO>>(`${HRMS}/approval-requests`, { params });
  },
  getMyPendingApprovals() {
    return api.get<ApprovalRequestDTO[]>(`${HRMS}/approval-requests/my-pending`);
  },
  approveRequest(requestId: string, remarks?: string) {
    return api.post<ApprovalRequestDTO>(`${HRMS}/approval-requests/${requestId}/approve`, { remarks });
  },
  rejectRequest(requestId: string, remarks: string) {
    return api.post<ApprovalRequestDTO>(`${HRMS}/approval-requests/${requestId}/reject`, { remarks });
  },

  // ── Phase 2C: Onboarding ─────────────────────────────────────────
  listOnboardingTemplates() {
    return api.get<OnboardingTemplateDTO[]>(`${HRMS}/onboarding/templates`);
  },
  createOnboardingTemplate(payload: OnboardingTemplateCreateDTO) {
    return api.post<OnboardingTemplateDTO>(`${HRMS}/onboarding/templates`, payload);
  },
  updateOnboardingTemplate(id: string, payload: OnboardingTemplateCreateDTO) {
    return api.put<OnboardingTemplateDTO>(`${HRMS}/onboarding/templates/${id}`, payload);
  },
  deleteOnboardingTemplate(id: string) {
    return api.delete<void>(`${HRMS}/onboarding/templates/${id}`);
  },
  startOnboarding(payload: OnboardingStartDTO) {
    return api.post<OnboardingRecordDTO>(`${HRMS}/onboarding/records`, payload);
  },
  listOnboardingRecords(params?: HrmsListParams) {
    return api.get<OnboardingRecordDTO[]>(`${HRMS}/onboarding/records`, { params });
  },
  getOnboardingRecord(recordId: string) {
    return api.get<OnboardingRecordDTO>(`${HRMS}/onboarding/records/${recordId}`);
  },
  getStaffOnboarding(staffRef: string) {
    return api.get<OnboardingRecordDTO>(`${HRMS}/onboarding/staff/${staffRef}`);
  },
  completeOnboardingTask(recordId: string, taskRecordId: string, notes?: string) {
    return api.post<OnboardingRecordDTO>(
      `${HRMS}/onboarding/records/${recordId}/tasks/${taskRecordId}/complete`,
      { notes }
    );
  },
  skipOnboardingTask(recordId: string, taskRecordId: string, notes?: string) {
    return api.post<OnboardingRecordDTO>(
      `${HRMS}/onboarding/records/${recordId}/tasks/${taskRecordId}/skip`,
      { notes }
    );
  },

  // ── Phase 2D: Exit Management ────────────────────────────────────
  createExitRequest(payload: ExitRequestCreateDTO) {
    return api.post<ExitRequestDTO>(`${HRMS}/exit/requests`, payload);
  },
  listExitRequests(params?: HrmsListParams) {
    // Backend returns List<ExitRequestResponseDTO>, not a Page
    return api.get<ExitRequestDTO[]>(`${HRMS}/exit/requests`, { params });
  },
  getExitRequest(requestId: string) {
    return api.get<ExitRequestDTO>(`${HRMS}/exit/requests/${requestId}`);
  },
  updateExitStatus(requestId: string, status: ExitRequestStatus, remarks?: string) {
    return api.patch<ExitRequestDTO>(`${HRMS}/exit/requests/${requestId}/status`, { status, remarks });
  },
  listClearanceItems(requestId: string) {
    return api.get<ExitClearanceItemDTO[]>(`${HRMS}/exit/requests/${requestId}/clearance`);
  },
  /** itemId is the numeric Long ID from ExitClearanceItemDTO.id */
  clearItem(requestId: string, itemId: number, completedByName?: string, remarks?: string) {
    return api.post<ExitClearanceItemDTO>(
      `${HRMS}/exit/requests/${requestId}/clearance/${itemId}/complete`,
      null,
      { params: { completedByName: completedByName ?? "", remarks } }
    );
  },
  /** itemId is the numeric Long ID from ExitClearanceItemDTO.id */
  waiveItem(requestId: string, itemId: number, waivedBy?: string, remarks?: string) {
    return api.patch<ExitClearanceItemDTO>(
      `${HRMS}/exit/requests/${requestId}/clearance/${itemId}/waive`,
      { waivedBy, remarks }
    );
  },
  getFnF(requestId: string) {
    return api.get<FullFinalSettlementDTO>(`${HRMS}/exit/requests/${requestId}/fnf`);
  },
  createFnF(requestId: string, payload: FnFCreateDTO) {
    return api.post<FullFinalSettlementDTO>(`${HRMS}/exit/requests/${requestId}/fnf`, payload);
  },
  approveFnF(requestId: string) {
    return api.patch<FullFinalSettlementDTO>(`${HRMS}/exit/requests/${requestId}/fnf/status`, { status: "APPROVED" });
  },
  disburseFnF(requestId: string) {
    return api.patch<FullFinalSettlementDTO>(`${HRMS}/exit/requests/${requestId}/fnf/status`, { status: "DISBURSED" });
  },

  // ── Phase 3: Performance Appraisals ──────────────────────────────
  listAppraisalCycles() {
    return api.get<AppraisalCycleDTO[]>(`${HRMS}/appraisals/cycles`);
  },
  createAppraisalCycle(payload: AppraisalCycleCreateDTO) {
    return api.post<AppraisalCycleDTO>(`${HRMS}/appraisals/cycles`, payload);
  },
  advanceAppraisalCycle(cycleId: string, status: AppraisalCycleStatus) {
    return api.patch<AppraisalCycleDTO>(`${HRMS}/appraisals/cycles/${cycleId}/status`, null, { params: { status } });
  },
  listCycleGoals(cycleId: string, staffRef: string) {
    return api.get<AppraisalGoalDTO[]>(`${HRMS}/appraisals/cycles/${cycleId}/goals`, { params: { staffRef } });
  },
  createGoal(cycleId: string, payload: AppraisalGoalCreateDTO) {
    return api.post<AppraisalGoalDTO>(
      `${HRMS}/appraisals/cycles/${cycleId}/goals`,
      payload
    );
  },
  getCycleSummary(cycleId: string, params?: HrmsListParams) {
    return api.get<PageResponse<AppraisalSummaryDTO>>(
      `${HRMS}/appraisals/cycles/${cycleId}/summary`,
      { params }
    );
  },

  // ── Phase 3: Training ────────────────────────────────────────────
  listCourses() {
    return api.get<TrainingCourseDTO[]>(`${HRMS}/training/courses`);
  },
  createCourse(payload: TrainingCourseCreateDTO) {
    return api.post<TrainingCourseDTO>(`${HRMS}/training/courses`, payload);
  },
  updateCourse(courseId: string, payload: TrainingCourseCreateDTO) {
    return api.put<TrainingCourseDTO>(`${HRMS}/training/courses/${courseId}`, payload);
  },
  deleteCourse(courseId: string) {
    return api.delete<void>(`${HRMS}/training/courses/${courseId}`);
  },
  listEnrollments(courseId: string, params?: HrmsListParams) {
    return api.get<PageResponse<CourseEnrollmentDTO>>(
      `${HRMS}/training/courses/${courseId}/enrollments`,
      { params }
    );
  },
  enrollStaff(courseId: string, staffRef: string) {
    return api.post<CourseEnrollmentDTO>(`${HRMS}/training/courses/${courseId}/enroll`, { staffRef });
  },
  completeEnrollment(courseId: string, enrollmentId: string, score?: number) {
    return api.post<CourseEnrollmentDTO>(
      `${HRMS}/training/courses/${courseId}/enrollments/${enrollmentId}/complete`,
      { score }
    );
  },

  // ── Phase 3: Loans ───────────────────────────────────────────────
  listLoans(params?: HrmsListParams) {
    return api.get<StaffLoanDTO[]>(`${HRMS}/loans`, { params });
  },
  createLoan(payload: StaffLoanCreateDTO) {
    return api.post<StaffLoanDTO>(`${HRMS}/loans`, payload);
  },
  listMyLoans(params?: { status?: LoanStatus }) {
    return api.get<StaffLoanDTO[]>(`${HRMS}/loans/self`, { params });
  },
  createMyLoan(payload: Omit<StaffLoanCreateDTO, "staffRef">) {
    return api.post<StaffLoanDTO>(`${HRMS}/loans/self`, payload);
  },
  getMyLoanSummary() {
    return api.get<LoanSummaryDTO>(`${HRMS}/loans/summary/self`);
  },
  approveLoan(loanId: string, payload: LoanStatusUpdateDTO) {
    return api.patch<StaffLoanDTO>(`${HRMS}/loans/${loanId}/status`, payload);
  },
  rejectLoan(loanId: string, remarks: string) {
    return api.patch<StaffLoanDTO>(`${HRMS}/loans/${loanId}/status`, { status: "REJECTED", remarks });
  },
  getLoanRepayments(loanId: string) {
    return api.get<LoanRepaymentRecordDTO[]>(`${HRMS}/loans/${loanId}/repayments`);
  },
  downloadLoanDocument(loanId: string) {
    return api.get<Blob>(`${HRMS}/loans/${loanId}/document`, {
      responseType: "blob",
    });
  },

  // ── Phase 3: Expense Claims ──────────────────────────────────────
  listExpenseClaims(params?: HrmsListParams) {
    return api.get<ExpenseClaimDTO[]>(`${HRMS}/expense-claims`, { params });
  },
  getExpenseClaim(claimId: string) {
    return api.get<ExpenseClaimDTO>(`${HRMS}/expense-claims/${claimId}`);
  },
  createExpenseClaim(payload: ExpenseClaimCreateDTO) {
    return api.post<ExpenseClaimDTO>(`${HRMS}/expense-claims`, payload);
  },
  listMyExpenseClaims(params?: { status?: ExpenseClaimStatus }) {
    return api.get<ExpenseClaimDTO[]>(`${HRMS}/expense-claims/self/claims`, { params });
  },
  createMyExpenseClaim(payload: Omit<ExpenseClaimCreateDTO, "staffRef">) {
    return api.post<ExpenseClaimDTO>(`${HRMS}/expense-claims/self/claims`, payload);
  },
  addExpenseItem(claimId: string, payload: ExpenseClaimItemCreateDTO) {
    return api.post<ExpenseClaimItemDTO>(`${HRMS}/expense-claims/${claimId}/items`, payload);
  },
  addMyExpenseItem(claimId: string, payload: ExpenseClaimItemCreateDTO) {
    return api.post<ExpenseClaimItemDTO>(`${HRMS}/expense-claims/self/claims/${claimId}/items`, payload);
  },
  approveExpenseClaim(claimId: string, remarks?: string) {
    return api.patch<ExpenseClaimDTO>(`${HRMS}/expense-claims/${claimId}/status`, { status: "APPROVED", remarks });
  },
  rejectExpenseClaim(claimId: string, remarks: string) {
    return api.patch<ExpenseClaimDTO>(`${HRMS}/expense-claims/${claimId}/status`, { status: "REJECTED", remarks });
  },
  reimburseExpenseClaim(claimId: string) {
    return api.patch<ExpenseClaimDTO>(`${HRMS}/expense-claims/${claimId}/status`, { status: "PAID" });
  },
  submitExpenseClaim(claimId: string) {
    return api.patch<ExpenseClaimDTO>(`${HRMS}/expense-claims/${claimId}/status`, { status: "SUBMITTED" });
  },
  submitMyExpenseClaim(claimId: string) {
    return api.patch<ExpenseClaimDTO>(`${HRMS}/expense-claims/self/claims/${claimId}/submit`);
  },
  expenseReceiptUploadInit(payload: { fileName: string; contentType: string; sizeBytes: number }) {
    return api.post<ImageUploadInstruction>(`${HRMS}/expense-claims/self/claims/receipt/upload-init`, payload);
  },

  // ── Phase 3: Overtime ────────────────────────────────────────────
  listOvertime(params?: HrmsListParams) {
    return api.get<OvertimeRecordDTO[]>(`${HRMS}/overtime`, { params });
  },
  createOvertime(payload: OvertimeCreateDTO) {
    return api.post<OvertimeRecordDTO>(`${HRMS}/overtime`, payload);
  },
  listMyOvertime(params?: { status?: OvertimeStatus }) {
    return api.get<OvertimeRecordDTO[]>(`${HRMS}/overtime/self`, { params });
  },
  createMyOvertime(payload: Omit<OvertimeCreateDTO, "staffRef">) {
    return api.post<OvertimeRecordDTO>(`${HRMS}/overtime/self`, payload);
  },
  approveOvertime(recordId: string, payload?: { multiplier: number }) {
    return api.post<OvertimeRecordDTO>(`${HRMS}/overtime/${recordId}/approve`, payload);
  },
  rejectOvertime(recordId: string, remarks?: string) {
    return api.post<OvertimeRecordDTO>(`${HRMS}/overtime/${recordId}/reject`, null, { params: { remarks } });
  },

  // ── Phase 3: Comp-Off ────────────────────────────────────────────
  listCompOff(staffRef: string) {
    return api.get<CompOffRecordDTO[]>(`${HRMS}/comp-off/${staffRef}`);
  },
  listMyCompOff() {
    return api.get<CompOffRecordDTO[]>(`${HRMS}/comp-off/self`);
  },
  getCompOffSummary(staffRef: string) {
    return api.get<CompOffBalanceSummaryDTO>(`${HRMS}/comp-off/summary/${staffRef}`);
  },
  getMyCompOffSummary() {
    return api.get<CompOffBalanceSummaryDTO>(`${HRMS}/comp-off/summary/self`);
  },
  createCompOff(payload: CompOffCreateDTO) {
    return api.post<CompOffRecordDTO>(`${HRMS}/comp-off`, payload);
  },
  creditCompOff(compOffId: string) {
    return api.post<CompOffRecordDTO>(`${HRMS}/comp-off/${compOffId}/credit`);
  },

  // ── Phase 4: Statutory Config ────────────────────────────────────
  getStatutoryConfig(financialYear: string) {
    return api.get<StatutoryConfigDTO>(`${HRMS}/statutory/config/${financialYear}`);
  },
  createStatutoryConfig(payload: StatutoryConfigCreateDTO) {
    return api.post<StatutoryConfigDTO>(`${HRMS}/statutory/config`, payload);
  },

  // ── Phase 4: Statutory Reports ───────────────────────────────────
  downloadReport(
    type: ReportType,
    params: Record<string, unknown>,
    format: "json" | "xlsx" | "pdf" = "json"
  ) {
    const isBlob = format !== "json";
    return api.get(`${HRMS}/statutory/reports/${type}`, {
      params: { ...params, format },
      ...(isBlob ? { responseType: "blob" as const } : {}),
    });
  },

  // ── Bank Details ─────────────────────────────────────────────────
  /** GET /auth/hrms/bank-details — paginated list of all staff with bank status */
  listBankDetails(params?: { page?: number; size?: number }) {
    return api.get<import('./types/common').PageResponse<StaffBankStatusDTO>>(`${HRMS}/bank-details`, { params });
  },

  /** GET /auth/hrms/bank-details/missing — staff missing bank or IFSC */
  listMissingBankDetails() {
    return api.get<StaffBankStatusDTO[]>(`${HRMS}/bank-details/missing`);
  },

  /** GET /auth/hrms/bank-details/template — download pre-filled CSV */
  downloadBankDetailsTemplate() {
    return api.get<Blob>(`${HRMS}/bank-details/template`, { responseType: "blob" });
  },

  /** POST /auth/hrms/bank-details/bulk-import — upload filled CSV */
  bulkImportBankDetails(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<BankDetailsBulkImportResultDTO>(`${HRMS}/bank-details/bulk-import`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** GET /auth/hrms/bank-details/{staffRef} */
  getStaffBankDetails(staffRef: string) {
    return api.get<StaffBankStatusDTO>(`${HRMS}/bank-details/${staffRef}`);
  },

  /** PUT /auth/hrms/bank-details/{staffRef} — upsert bank details */
  upsertBankDetails(staffRef: string, dto: BankDetailsUpdateDTO) {
    return api.put<StaffBankStatusDTO>(`${HRMS}/bank-details/${staffRef}`, dto);
  },

  /** DELETE /auth/hrms/bank-details/{staffRef}/bank — clear bank details */
  clearBankDetails(staffRef: string) {
    return api.delete<void>(`${HRMS}/bank-details/${staffRef}/bank`);
  },
};

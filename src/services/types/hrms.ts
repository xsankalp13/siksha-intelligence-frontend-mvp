import type { Pageable } from "./common";

// ── Enums ────────────────────────────────────────────────────────────
export type StaffCategory = "TEACHING" | "NON_TEACHING_ADMIN" | "NON_TEACHING_SUPPORT";
export type DayType = "WORKING" | "HOLIDAY" | "HALF_DAY" | "RESTRICTED_HOLIDAY" | "EXAM_DAY" | "VACATION";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type HalfDayType = "FIRST_HALF" | "SECOND_HALF";
export type TeachingWing = "PRIMARY" | "SECONDARY" | "SENIOR_SECONDARY" | "HIGHER_SECONDARY";
export type SalaryComponentType = "EARNING" | "DEDUCTION";
export type CalculationMethod = "FIXED" | "PERCENTAGE_OF_BASIC" | "PERCENTAGE_OF_GROSS";
export type PayrollStatus = "DRAFT" | "PROCESSING" | "PROCESSED" | "APPROVED" | "DISBURSED" | "FAILED" | "VOIDED";

// ── Error handling ───────────────────────────────────────────────────
export interface HrmsFieldErrorMap {
  [fieldName: string]: string | string[];
}

export interface HrmsApiErrorResponse {
  statusCode?: number;
  message?: string;
  path?: string;
  timestamp?: string;
  fieldErrors?: HrmsFieldErrorMap;
}

// ── Academic Calendar ────────────────────────────────────────────────
export interface CalendarEventResponseDTO {
  eventId: number;
  uuid: string;
  academicYear: string;
  date: string;
  dayType: DayType;
  title?: string;
  description?: string;
  appliesToStaff: boolean;
  appliesToStudents: boolean;
  createdAt: string;
}

export interface CalendarEventCreateDTO {
  academicYear: string;
  date: string;
  dayType: DayType;
  title?: string;
  description?: string;
  appliesToStaff?: boolean;
  appliesToStudents?: boolean;
}

export interface CalendarSummaryDTO {
  academicYear: string;
  totalWorkingDays: number;
  totalHolidays: number;
  totalHalfDays: number;
  months: CalendarMonthSummary[];
}

export interface CalendarMonthSummary {
  month: number;
  monthName: string;
  workingDays: number;
  holidays: number;
  halfDays: number;
}

// ── Staff Designations ───────────────────────────────────────────────
/** Teaching level this designation targets. Backend field is pending — stored for future use. */
export type TeachingLevel = "PRIMARY" | "SECONDARY" | "HIGHER_SECONDARY" | "PRIMARY_SECONDARY" | "ALL";

export interface StaffDesignationCreateUpdateDTO {
  designationCode: string;
  designationName: string;
  category: StaffCategory;
  description?: string;
  sortOrder?: number;
  defaultSalaryTemplateRef?: string;
  defaultGradeRef?: string;
  /** Teaching level (backend field pending) */
  teachingLevel?: TeachingLevel;
}

export interface StaffDesignationResponseDTO {
  designationId: number;
  uuid: string;
  designationCode: string;
  designationName: string;
  category: StaffCategory;
  description?: string;
  sortOrder: number;
  active: boolean;
  defaultSalaryTemplateId?: number;
  defaultSalaryTemplateName?: string;
  defaultGradeId?: number;
  defaultGradeCode?: string;
  /** Teaching level (backend field pending) */
  teachingLevel?: TeachingLevel;
  createdAt: string;
  updatedAt: string;
}

// ── Leave Type Configuration ─────────────────────────────────────────
export interface LeaveTypeConfigResponseDTO {
  leaveTypeId: number;
  uuid: string;
  leaveCode: string;
  displayName: string;
  description?: string;
  annualQuota: number;
  carryForwardAllowed: boolean;
  maxCarryForward: number;
  encashmentAllowed: boolean;
  minDaysBeforeApply: number;
  maxConsecutiveDays?: number;
  requiresDocument: boolean;
  documentRequiredAfterDays?: number;
  isPaid: boolean;
  applicableCategories?: StaffCategory[];
  applicableGrades?: string[];
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveTypeConfigCreateUpdateDTO {
  leaveCode: string;
  displayName: string;
  description?: string;
  annualQuota: number;
  carryForwardAllowed?: boolean;
  maxCarryForward?: number;
  encashmentAllowed?: boolean;
  minDaysBeforeApply?: number;
  maxConsecutiveDays?: number;
  requiresDocument?: boolean;
  documentRequiredAfterDays?: number;
  isPaid?: boolean;
  applicableCategories?: StaffCategory[];
  applicableGrades?: string[];
  sortOrder?: number;
}

// ── Leave Applications ───────────────────────────────────────────────
export interface LeaveApplicationResponseDTO {
  applicationId: number;
  uuid: string | null;
  staffId: number;
  staffName: string;
  employeeId: string | null;
  staffCategory: StaffCategory | null;
  designationName: string | null;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayType?: HalfDayType;
  reason: string;
  attachmentUrl: string | null;
  status: LeaveStatus;
  appliedOn: string;
  reviewedByUserId: number | null;
  reviewedByName: string | null;
  reviewRemarks: string | null;
  reviewedAt: string | null;
}

export interface LeaveApplicationCreateDTO {
  leaveTypeRef: string;
  fromDate: string;
  toDate: string;
  isHalfDay?: boolean;
  halfDayType?: HalfDayType;
  reason: string;
  attachmentUrl?: string;
}

export interface LeaveReviewDTO {
  remarks?: string;
}

// ── Leave Balance ────────────────────────────────────────────────────
export interface LeaveBalanceResponseDTO {
  balanceId: number;
  staffId: number;
  staffName: string;
  leaveTypeId: number;
  leaveTypeCode: string;
  leaveTypeName: string;
  academicYear: string;
  totalQuota: number;
  used: number;
  carriedForward: number;
  remaining: number;
}

export interface LeaveBalanceInitializeDTO {
  academicYear: string;
  carryForwardFromYear?: string;
}

// ── Staff Grades ─────────────────────────────────────────────────────
export interface StaffGradeResponseDTO {
  gradeId: number;
  uuid: string;
  gradeCode: string;
  gradeName: string;
  teachingWing: TeachingWing;
  payBandMin: number;
  payBandMax: number;
  sortOrder: number;
  minYearsForPromotion?: number;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffGradeCreateUpdateDTO {
  gradeCode: string;
  gradeName: string;
  teachingWing: TeachingWing;
  payBandMin: number;
  payBandMax: number;
  sortOrder: number;
  minYearsForPromotion?: number;
  description?: string;
}

export interface StaffGradeAssignmentResponseDTO {
  assignmentId: number;
  uuid: string;
  staffId: number;
  staffName: string;
  gradeId: number;
  gradeCode: string;
  gradeName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  promotionOrderRef?: string;
  promotedByStaffId?: number;
  remarks?: string;
  createdAt: string;
}

export interface StaffGradeAssignDTO {
  staffRef: string;
  gradeRef: string;
  effectiveFrom: string;
  promotionOrderRef?: string;
  remarks?: string;
}

// ── Salary Components ────────────────────────────────────────────────
export interface SalaryComponentResponseDTO {
  componentId: number;
  uuid: string;
  componentCode: string;
  componentName: string;
  type: SalaryComponentType;
  calculationMethod: CalculationMethod;
  defaultValue: number;
  isTaxable: boolean;
  isStatutory: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryComponentCreateUpdateDTO {
  componentCode: string;
  componentName: string;
  type: SalaryComponentType;
  calculationMethod: CalculationMethod;
  defaultValue: number;
  isTaxable?: boolean;
  isStatutory?: boolean;
  sortOrder?: number;
}

// ── Salary Templates ─────────────────────────────────────────────────
export interface SalaryTemplateResponseDTO {
  templateId: number;
  uuid: string;
  templateName: string;
  description?: string;
  gradeId?: number;
  gradeCode?: string;
  gradeName?: string;
  academicYear: string;
  applicableCategory?: StaffCategory;
  components: SalaryTemplateComponentDTO[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryTemplateComponentDTO {
  componentId: number;
  componentCode: string;
  componentName: string;
  type: SalaryComponentType;
  calculationMethod: CalculationMethod;
  value: number;
}

export interface SalaryTemplateCreateDTO {
  templateName: string;
  description?: string;
  gradeRef?: string;
  academicYear: string;
  applicableCategory?: StaffCategory;
  components: { componentRef: string; value: number }[];
}

export interface SalaryTemplateUpdateDTO {
  templateName?: string;
  description?: string;
  gradeRef?: string;
  academicYear?: string;
  applicableCategory?: StaffCategory;
  components?: { componentRef: string; value: number }[];
}

// ── Staff Salary Mapping ─────────────────────────────────────────────
export interface StaffSalaryMappingResponseDTO {
  mappingId: number;
  uuid: string;
  staffId: number;
  staffName: string;
  employeeId: string;
  gradeId?: number;
  gradeCode?: string;
  templateId: number;
  templateName: string;
  effectiveFrom: string;
  effectiveTo?: string;
  remarks?: string;
  active: boolean;
  createdAt: string;
  overrides?: ComponentOverrideDTO[];
}

export interface UnmappedStaffDTO {
  staffId: number;
  uuid: string;
  staffName: string;
  employeeId: string;
  category?: string;
  designationName?: string;
  departmentName?: string;
}

export interface ComponentOverrideDTO {
  componentRef: string;
  overrideValue: number;
  reason?: string;
}

export interface StaffSalaryMappingCreateDTO {
  staffRef: string;
  templateRef: string;
  effectiveFrom: string;
  effectiveTo?: string;
  remarks?: string;
  overrides?: { componentRef: string; overrideValue: number; reason?: string }[];
}

export interface StaffSalaryMappingBulkCreateDTO {
  templateRef: string;
  staffRefs: string[];
  effectiveFrom: string;
  effectiveTo?: string;
  remarks?: string;
}

export interface ComputedSalaryBreakdownDTO {
  staffId: number;
  staffName: string;
  employeeId: string;
  templateName: string;
  gradeCode?: string;
  earnings: ComputedComponentDTO[];
  deductions: ComputedComponentDTO[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  ctc: number;
  hasOverrides: boolean;
}

export interface ComputedComponentDTO {
  componentCode: string;
  componentName: string;
  calculationMethod: string;
  configuredValue: number;
  computedAmount: number;
  isOverridden: boolean;
  isStatutory: boolean;
}

// ── Payroll ──────────────────────────────────────────────────────────
export interface PayrollRunCreateDTO {
  payYear: number;
  payMonth: number;
  remarks?: string;
}

export interface PayrollRunResponseDTO {
  runId: number;
  runUuid: string;
  payYear: number;
  payMonth: number;
  status: PayrollStatus;
  remarks?: string;
  totalStaff: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  processedOn?: string;
  entries: PayslipSummaryDTO[];
}

export interface PayslipSummaryDTO {
  payslipId: number;
  uuid: string;
  payrollRunId: number;
  staffId: number;
  staffName: string;
  employeeId: string;
  payMonth: number;
  payYear: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollStatus;
  generatedAt: string;
}

export interface PayslipDetailDTO {
  payslipId: number;
  uuid: string;
  payrollRunId: number;
  staffId: number;
  staffName: string;
  employeeId: string;
  payMonth: number;
  payYear: number;
  gradeCode?: string;
  gradeName?: string;
  department?: string;
  totalWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  lopDays: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollStatus;
  generatedAt: string;
  lineItems: PayslipLineItemDTO[];
}

export interface PayslipLineItemDTO {
  componentCode: string;
  componentName: string;
  amount: number;
}

// ── Dashboard ────────────────────────────────────────────────────────
export interface HrmsDashboardSummaryDTO {
  totalActiveStaff: number;
  staffWithSalaryMapping: number;
  staffWithoutSalaryMapping: number;
  totalPayrollThisMonth: number;
  totalPayrollLastMonth: number;
  pendingLeaveApplications: number;
  todayPresent: number;
  todayAbsent: number;
  todayOnLeave: number;
  totalTeachingStaff: number;
  totalNonTeachingAdmin: number;
  totalNonTeachingSupport: number;
  gradeDistribution: { gradeCode: string; gradeName: string; count: number }[];
  payrollTrend: { month: string; amount: number }[];
  categoryAttendance: CategoryAttendanceItem[];
  pendingApprovalRequests: number;
  // Phase 5 — Dashboard Intelligence (heatmap now via dedicated endpoint)
  pendingProxyCount: number;
  pendingLateClockInCount: number;
  staffPresentPercent: number;
}

export interface CategoryAttendanceItem {
  category: StaffCategory;
  present: number;
  absent: number;
  onLeave: number;
}

// ── Self-service attendance ──────────────────────────────────────────
export interface StaffAttendanceSummaryDTO {
  periodLabel: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidays: number;
  attendancePercentage: number;
  dailyRecords: StaffDayRecord[];
}

export interface StaffDayRecord {
  date: string;
  status: string;
}

// ── Staff Summary (for dropdowns) ────────────────────────────────────
export interface StaffSummaryDTO {
  staffId: number;
  uuid: string;
  employeeId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  username?: string;
  profileUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  jobTitle?: string;
  department?: string;
  staffType?: string;
  category?: StaffCategory;
  designationCode?: string;
  designationName?: string;
  hireDate?: string;
  officeLocation?: string;
  active: boolean;
  teachableSubjectIds?: number[];
}

// ── Query params ─────────────────────────────────────────────────────
export interface HrmsListParams extends Pageable {
  search?: string;
  status?: string;
  staffId?: number;
  leaveTypeCode?: string;
  fromDate?: string;
  toDate?: string;
  academicYear?: string;
  year?: number;
  month?: number;
  category?: StaffCategory;
}

// ── Leave Templates ──────────────────────────────────────────────────
// NOTE: leave templates are many-to-one — multiple templates can be assigned
// to a single staff member via POST /leave-templates/{ref}/assign
export type LeaveGenderRestriction = "ANY" | "MALE_ONLY" | "FEMALE_ONLY";
export type LeaveEmploymentTypeRestriction = "ANY" | "PERMANENT" | "PROBATION" | "CONTRACT";
export type LeaveEncashmentOverride = "SYSTEM_DEFAULT" | "ALLOWED" | "DISALLOWED";

export interface LeaveTemplateItemDTO {
  leaveTypeRef?: string;
  leaveTypeId?: number;
  uuid?: string;
  leaveTypeCode?: string;
  leaveTypeName?: string;
  customQuota?: number;
  // ── Eligibility Filters ──────────────────────────────────────────────
  /** Restrict leave to a specific gender. Used for Maternity (FEMALE_ONLY) / Paternity (MALE_ONLY). */
  genderRestriction?: LeaveGenderRestriction;
  /** Minimum months of service required to be eligible for this leave. 0 = no restriction. */
  minServiceMonths?: number;
  /** Restrict by employment type. E.g. exclude PROBATION staff from Earned Leave. */
  employmentTypeRestriction?: LeaveEmploymentTypeRestriction;
  /** Override global carry-forward cap for this specific leave in this template. Null = use global. */
  maxCarryForwardOverride?: number | null;
  /** Override global encashment policy for this specific leave in this template. */
  encashmentOverride?: LeaveEncashmentOverride;
}

export interface LeaveTemplateCreateDTO {
  templateName: string;
  academicYear: string;
  description?: string;
  applicableCategory?: StaffCategory;
  items: LeaveTemplateItemDTO[];
}

export interface LeaveTemplateResponseDTO {
  templateId: number;
  uuid: string;
  templateName: string;
  academicYear: string;
  description?: string;
  applicableCategory?: StaffCategory;
  active: boolean;
  items: LeaveTemplateItemDTO[];
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard heatmap (dedicated lazy-loaded endpoint) ───────────────

export interface AttendanceHeatmapDayEntry {
  date: string;           // ISO "YYYY-MM-DD"
  presentCount: number;
  absentCount: number;
  onLeaveCount: number;
}

export interface AttendanceHeatmapDTO {
  year: number;
  month: number;
  days: AttendanceHeatmapDayEntry[];
}

/** Unified loan lifecycle states */
export type LoanStatus = "PENDING" | "APPROVED" | "DISBURSED" | "ACTIVE" | "CLOSED" | "REJECTED" | "CANCELLED";

export interface LoanResponseDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  loanType: string;
  principalAmount: number;
  approvedAmount?: number;
  emiAmount?: number;
  emiCount?: number;
  remainingEmis?: number;
  interestRate: number;
  status: LoanStatus;
  disbursedAt?: string;
  remarks?: string;
  createdAt: string;
}

/** Unified overtime approval states */
export type OvertimeStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID" | "INCLUDED_IN_PAYROLL";

export interface OvertimeResponseDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  workDate: string;
  hoursWorked: number;
  reason?: string;
  status: OvertimeStatus;
  compensationType: string;
  approvedAt?: string;
  multiplier?: number;
  approvedAmount?: number;
  payrollRunRef?: string;
}

export interface Staff360ProfileDTO {
  personal: StaffSummaryDTO;
  currentGrade?: StaffGradeAssignmentResponseDTO;
  currentDesignation?: StaffDesignationResponseDTO;
  salaryStructure?: ComputedSalaryBreakdownDTO;
  leaveBalance: LeaveBalanceResponseDTO[];
  attendanceSummary?: StaffAttendanceSummaryDTO;
  recentPayslips: PayslipSummaryDTO[];
  promotionHistory: PromotionResponseDTO[];
  loans: LoanResponseDTO[];
  overtimes: OvertimeResponseDTO[];
  documentCount: number;
  activeLoans: number;
  onboardingStatus: "COMPLETED" | "IN_PROGRESS" | null;
}

// ── Phase 2A — Documents ──────────────────────────────────────────────
export type DocumentCategory =
  | "OFFER_LETTER" | "APPOINTMENT_LETTER" | "CONTRACT" | "ID_PROOF"
  | "PAN_CARD" | "AADHAR_CARD" | "EDUCATIONAL_CERTIFICATE"
  | "EXPERIENCE_LETTER" | "RESIGNATION_LETTER" | "OTHER";

export interface StaffDocumentDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  category: DocumentCategory;
  displayName: string;
  originalFileName: string;
  storageUrl: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  expiryDate?: string;
  isExpired: boolean;
}

export interface StaffDocumentUploadInitRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  category: DocumentCategory;
  displayName: string;
  expiryDate?: string;
}

export interface StaffDocumentUploadCompleteRequest {
  objectKey: string;
  storageUrl: string;
  contentType?: string;
  sizeBytes?: number;
  etag?: string;
  category: DocumentCategory;
  displayName: string;
  expiryDate?: string;
  originalFileName: string;
}

// ── Phase 2B — Approval Engine ────────────────────────────────────────
export type ApprovalActionType =
  | "LEAVE" | "PAYROLL_RUN" | "PROMOTION"
  | "EXPENSE_CLAIM" | "LOAN_REQUEST" | "EXIT_REQUEST";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalChainStepDTO {
  stepOrder: number;
  approverRole: string;
  stepLabel: string;
}

export interface ApprovalChainConfigDTO {
  uuid: string;
  actionType: ApprovalActionType;
  chainName: string;
  isActive: boolean;
  steps: ApprovalChainStepDTO[];
}

export interface ApprovalChainConfigCreateDTO {
  actionType: ApprovalActionType;
  chainName: string;
  isActive?: boolean;
  steps: ApprovalChainStepDTO[];
}

export interface ApprovalStepRecordDTO {
  stepOrder: number;
  stepLabel: string;
  approverRole: string;
  status: ApprovalStatus;
  approverName?: string;
  remarks?: string;
  actedAt?: string;
}

export interface ApprovalRequestDTO {
  uuid: string;
  actionType: ApprovalActionType;
  entityType: string;
  entityRef: string;
  requestedByRef: string;
  requestedByName: string;
  entitySummary: string;
  requestedAt: string;
  currentStepOrder: number;
  finalStatus: ApprovalStatus;
  completedAt?: string;
  steps: ApprovalStepRecordDTO[];
}

// ── Phase 2C — Onboarding ─────────────────────────────────────────────
export type AssignedParty = "HR" | "STAFF" | "BOTH";
export type OnboardingStatus = "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
export type TaskRecordStatus = "PENDING" | "DONE" | "SKIPPED";

export interface OnboardingTemplateTaskDTO {
  taskOrder: number;
  taskTitle: string;
  description?: string;
  dueAfterDays: number;
  assignedParty: AssignedParty;
}

export interface OnboardingTemplateDTO {
  uuid: string;
  templateName: string;
  description?: string;
  active: boolean;
  tasks: OnboardingTemplateTaskDTO[];
}

export interface OnboardingTemplateCreateDTO {
  templateName: string;
  description?: string;
  tasks: OnboardingTemplateTaskDTO[];
}

export interface OnboardingTaskRecordDTO {
  id: string;
  taskTitle: string;
  dueDate: string;
  status: TaskRecordStatus;
  assignedParty: AssignedParty;
  completedAt?: string;
  completedByName?: string;
  notes?: string;
}

export interface OnboardingRecordDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  templateName: string;
  startedAt: string;
  targetCompletionDate: string;
  status: OnboardingStatus;
  completionPercentage: number;
  tasks: OnboardingTaskRecordDTO[];
}

export interface OnboardingStartDTO {
  staffRef: string;
  templateRef: string;
  startDate: string;
}

// ── Phase 2D — Exit / Offboarding ─────────────────────────────────────
export type ExitRequestStatus =
  | "SUBMITTED" | "NOTICE_PERIOD" | "CLEARANCE"
  | "FNF_PROCESSING" | "COMPLETED" | "WITHDRAWN";
export type ClearanceItemType =
  | "ASSET_RETURN" | "ACCOUNT_CLOSURE" | "NOC"
  | "LIBRARY" | "IT_ACCESS" | "OTHER";
export type FnFStatus = "DRAFT" | "APPROVED" | "DISBURSED";

export interface ExitRequestDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  designationName?: string;
  category?: StaffCategory;
  /** Backend field: resignationDate */
  resignationDate: string;
  lastWorkingDate: string;
  /** Backend field: exitReason */
  exitReason: string;
  status: ExitRequestStatus;
  /** May not be present in all backend versions */
  clearanceComplete?: boolean;
  fnfStatus?: FnFStatus;
}

export interface ExitRequestCreateDTO {
  staffRef: string;
  /** ISO date string (YYYY-MM-DD) — maps to backend field resignationDate */
  resignationDate: string;
  lastWorkingDate: string;
  exitReason: string;
}

export interface ExitClearanceItemDTO {
  id: number;
  uuid: string;
  itemType: ClearanceItemType;
  description?: string;
  completedAt?: string;
  completedByName?: string;
  waived: boolean;
  waivedBy?: string;
  waivedAt?: string;
  remarks?: string;
}

export interface FullFinalSettlementDTO {
  uuid: string;
  exitRequestRef: string;
  grossSalaryDue: number;
  deductions: number;
  leaveEncashment: number;
  gratuity: number;
  otherAdditions: number;
  otherDeductions: number;
  netPayable: number;
  status: FnFStatus;
  disbursedAt?: string;
  remarks?: string;
}

export interface FnFCreateDTO {
  grossSalaryDue: number;
  deductions: number;
  leaveEncashment: number;
  gratuity: number;
  otherAdditions: number;
  otherDeductions: number;
  remarks?: string;
}

export interface StaffLeaveTemplateMappingResponseDTO {
  mappingId: number;
  uuid: string;
  staffId: number;
  employeeId: string;
  staffName: string;
  templateId: number;
  templateUuid: string;
  templateName: string;
  academicYear: string;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
  createdAt: string;
}

// ── Phase 3 — Performance Appraisals ─────────────────────────────────
export type AppraisalCycleStatus =
  | "DRAFT" | "GOAL_SETTING" | "SELF_REVIEW"
  | "MANAGER_REVIEW" | "HR_REVIEW" | "COMPLETED";
export type AppraisalCycleType = "ANNUAL" | "BIANNUAL" | "QUARTERLY";
export type GoalStatus = "DRAFT" | "APPROVED" | "ACHIEVED" | "NOT_ACHIEVED";

export interface AppraisalCycleDTO {
  uuid: string;
  cycleName: string;
  academicYear?: string;
  startDate: string;
  endDate: string;
  status: AppraisalCycleStatus;
  createdAt: string;
}

export interface AppraisalCycleCreateDTO {
  cycleName: string;
  academicYear?: string;
  startDate: string;
  endDate: string;
}

export interface AppraisalGoalDTO {
  id?: number;
  uuid: string;
  staffRef: string;
  staffName: string;
  goalTitle: string;
  description?: string;
  weightage?: number;
  targetMetric?: string;
}

export interface AppraisalGoalCreateDTO {
  staffRef: string;
  goalTitle: string;
  description?: string;
  weightage?: number;
  targetMetric?: string;
}

export interface SelfAppraisalReviewDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  submittedAt: string;
  overallRating: number;
  overallRemarks?: string;
  goalReviews: { goalId: string; rating: number; remarks?: string }[];
}

export interface ManagerAppraisalReviewDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  reviewerName: string;
  submittedAt: string;
  overallRating: number;
  recommendation?: string;
  remarks?: string;
}

export interface AppraisalSummaryDTO {
  staffRef: string;
  staffName: string;
  selfRating?: number;
  managerRating?: number;
  recommendation?: string;
}

// ── Phase 3 — Training ────────────────────────────────────────────────
export type EnrollmentStatus = "ENROLLED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";

export interface TrainingCourseDTO {
  uuid: string;
  title: string;
  description?: string;
  category?: string;
  durationHours: number;
  isMandatory: boolean;
  isActive: boolean;
  enrollmentCount?: number;
}

export interface TrainingCourseCreateDTO {
  title: string;
  description?: string;
  category?: string;
  durationHours: number;
  isMandatory?: boolean;
}

export interface CourseEnrollmentDTO {
  uuid: string;
  courseId: string;
  courseTitle: string;
  staffRef: string;
  staffName: string;
  enrolledAt: string;
  completedAt?: string;
  status: EnrollmentStatus;
  score?: number;
}

export interface CourseCertificateDTO {
  uuid: string;
  enrollmentId: string;
  courseTitle: string;
  staffName: string;
  certificateUrl: string;
  issuedAt: string;
}

// ── Phase 3 — Loans ───────────────────────────────────────────────────
// LoanStatus is defined above (unified)
export type RepaymentStatus = "SCHEDULED" | "DEDUCTED" | "OVERDUE";

export interface StaffLoanDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  loanType: string;
  principalAmount: number;
  approvedAmount?: number;
  emiAmount?: number;
  emiCount?: number;
  remainingEmis?: number;
  interestRate?: number;
  disbursedAt?: string;
  remarks?: string;
  status: LoanStatus;
  createdAt: string;
}

export interface StaffLoanCreateDTO {
  staffRef: string;
  loanType: string;
  principalAmount: number;
  emiCount?: number;
  interestRate?: number;
  reason?: string;
}

export interface LoanStatusUpdateDTO {
  status: LoanStatus;
  approvedAmount?: number;
  disbursedAt?: string;
  emiAmount?: number;
  emiCount?: number;
  remarks?: string;
}

export interface LoanRepaymentRecordDTO {
  id?: number;
  uuid: string;
  dueDate?: string;
  amount: number;
  paidDate?: string;
  payrollRunRef?: string;
  status: RepaymentStatus;
}

export interface LoanSummaryDTO {
  staffRef: string;
  staffName: string;
  totalPrincipal: number;
  totalRepaid: number;
  outstandingBalance: number;
  activeLoans: number;
  nextEmiDate?: string;
  nextEmiAmount?: number;
}

// ── Phase 3 — Expense Claims ──────────────────────────────────────────
export type ExpenseClaimStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PAID";
export type ExpenseCategory = "TRAVEL" | "FOOD" | "ACCOMMODATION" | "SUPPLIES" | "COMMUNICATION" | "OTHER";

export interface ExpenseClaimItemDTO {
  uuid: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl?: string;
}

export interface ExpenseClaimDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  title: string;
  submittedAt?: string;
  totalAmount: number;
  status: ExpenseClaimStatus;
  items: ExpenseClaimItemDTO[];
}

export interface ExpenseClaimCreateDTO {
  staffRef: string;
  title: string;
  description?: string;
}

export interface ExpenseClaimItemCreateDTO {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl?: string;
}

// ── Phase 3 — Overtime & Comp-Off ─────────────────────────────────────
// OvertimeStatus is defined above (unified)

export interface OvertimeRecordDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  workDate: string;
  hoursWorked: number;
  reason?: string;
  status: OvertimeStatus;
  compensationType: string;
  approvedAt?: string;
  multiplier?: number;
  approvedAmount?: number;
}

export interface OvertimeCreateDTO {
  staffRef: string;
  workDate: string;
  hoursWorked: number;
  reason?: string;
  compensationType?: string;
}

export interface CompOffRecordDTO {
  uuid: string;
  staffRef: string;
  staffName: string;
  overtimeRecordRef?: string;
  leaveTypeRef?: string;
  leaveTypeName?: string;
  creditDate: string;
  expiryDate?: string;
  credited: boolean;
  creditedAt?: string;
  remarks?: string;
}

export interface CompOffCreateDTO {
  staffRef: string;
  overtimeRecordRef?: string;
  leaveTypeRef?: string;
  creditDate: string;
  expiryDate?: string;
  remarks?: string;
}

export interface CompOffBalanceSummaryDTO {
  staffRef: string;
  staffName: string;
  available: { compOffRef: string; creditDate: string; expiryDate?: string; leaveTypeName?: string }[];
}

// ── Phase 4 — Statutory ───────────────────────────────────────────────
export interface PtSlabDTO {
  minSalary: number;
  maxSalary?: number;
  monthlyTax: number;
}

export interface StatutoryConfigDTO {
  uuid: string;
  financialYear: string;
  pfApplicable: boolean;
  pfEmployeeRate: number;
  pfEmployerRate: number;
  pfCeilingAmount: number;
  esiApplicable: boolean;
  esiEmployeeRate: number;
  esiEmployerRate: number;
  esiWageLimit: number;
  ptApplicable: boolean;
  ptState?: string;
  ptSlabs: PtSlabDTO[];
}

export interface StatutoryConfigCreateDTO {
  financialYear: string;
  pfApplicable?: boolean;
  pfEmployeeRate?: number;
  pfEmployerRate?: number;
  pfCeilingAmount?: number;
  esiApplicable?: boolean;
  esiEmployeeRate?: number;
  esiEmployerRate?: number;
  esiWageLimit?: number;
  ptApplicable?: boolean;
  ptState?: string;
  ptSlabs?: PtSlabDTO[];
}

export interface PFSummaryRowDTO {
  staffName: string;
  employeeId: string;
  uan?: string;
  grossWages: number;
  pfWages: number;
  employeeContribution: number;
  employerContribution: number;
}

export interface PFSummaryReportDTO {
  month: number;
  year: number;
  rows: PFSummaryRowDTO[];
  totals: {
    grossWages: number;
    pfWages: number;
    employeeTotal: number;
    employerTotal: number;
    totalRemittance: number;
  };
}

export type ReportType =
  | "pf-summary" | "esi-summary" | "pt-summary" | "tds-computation"
  | "attendance-register" | "salary-register" | "leave-register"
  | "headcount" | "attrition" | "compliance-summary";

// ── Promotions ───────────────────────────────────────────────────────
export type PromotionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface PromotionCreateDTO {
  staffRef: string;
  proposedDesignationRef: string;
  proposedGradeRef?: string;
  newSalaryTemplateRef?: string;
  effectiveDate: string;
  orderReference?: string;
  remarks?: string;
}

export interface PromotionReviewDTO {
  remarks?: string;
}

export interface PromotionResponseDTO {
  promotionId: number;
  uuid: string;
  staffId: number;
  staffName: string;
  employeeId: string;
  currentDesignationId?: number;
  currentDesignationCode?: string;
  currentDesignationName?: string;
  proposedDesignationId: number;
  proposedDesignationCode: string;
  proposedDesignationName: string;
  currentGradeId?: number;
  currentGradeCode?: string;
  proposedGradeId?: number;
  proposedGradeCode?: string;
  newSalaryTemplateId?: number;
  newSalaryTemplateName?: string;
  effectiveDate: string;
  status: PromotionStatus;
  initiatedByUserId?: number;
  approvedByUserId?: number;
  approvedByName?: string;
  approvedOn?: string;
  orderReference?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Bank Details ───────────────────────────────────────────────────────────
export type BankAccountType = "SAVINGS" | "CURRENT";

export interface StaffBankStatusDTO {
  staffId: number;
  uuid: string;
  employeeId: string;
  staffName: string;
  designation?: string;
  hasBankDetails: boolean;
  hasIfsc: boolean;
  bankName?: string;
  ifscCode?: string;
  /** Last 4 digits masked: "****1234" */
  maskedAccountNumber?: string;
  accountType?: BankAccountType;
  accountHolderName?: string;
}

export interface BankDetailsUpdateDTO {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  accountType?: BankAccountType;
}

export interface BankDetailsBulkImportResultDTO {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  errors: { rowNumber: number; employeeId: string; reason: string }[];
}

// ── Late Clock-In Review (Phase 2.2) ─────────────────────────────────
export type LateClockInStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LateClockInRequestDTO {
  uuid: string;
  staffId: number;
  staffName: string;
  employeeId: string;
  designation?: string;
  attendanceDate: string;
  clockInTime?: string;
  minutesLate: number;
  reason?: string;
  status: LateClockInStatus;
  adminRemarks?: string;
  createdAt: string;
}

export interface LateClockInReviewDTO {
  action: "APPROVE" | "REJECT";
  remarks?: string;
}

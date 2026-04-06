import type { Pageable } from "./common";

// ── Enums ────────────────────────────────────────────────────────────
export type StaffCategory = "TEACHING" | "NON_TEACHING_ADMIN" | "NON_TEACHING_SUPPORT";
export type DayType = "WORKING" | "HOLIDAY" | "HALF_DAY" | "RESTRICTED_HOLIDAY" | "EXAM_DAY" | "VACATION";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type HalfDayType = "FIRST_HALF" | "SECOND_HALF";
export type TeachingWing = "PRIMARY" | "SECONDARY" | "SENIOR_SECONDARY" | "HIGHER_SECONDARY";
export type SalaryComponentType = "EARNING" | "DEDUCTION";
export type CalculationMethod = "FIXED" | "PERCENTAGE_OF_BASIC" | "PERCENTAGE_OF_GROSS";
export type PayrollStatus = "PROCESSED" | "APPROVED" | "DISBURSED";

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
export interface StaffDesignationCreateUpdateDTO {
  designationCode: string;
  designationName: string;
  category: StaffCategory;
  description?: string;
  sortOrder?: number;
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

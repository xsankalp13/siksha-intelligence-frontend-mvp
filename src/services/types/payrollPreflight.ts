// -- Payroll Preflight DTOs -----------------------------------------------

export interface PayrollBlockerDTO {
  type: string; // e.g. 'INCOMPLETE_ATTENDANCE'
  message: string;
  details: Record<string, unknown>; // Backend: Map<String, Object>
}

export interface PayrollWarningDTO {
  type: string; // e.g. 'PENDING_LEAVE_APPLICATIONS'
  message: string;
  count: number;
}

export interface PayrollPreflightSummaryDTO {
  totalStaff: number;
  staffWithSalaryMapping: number;
  staffWithoutSalaryMapping: number;
  totalApprovedLeaves: number;
  totalLopDays: number;
  attendanceCompletionPercent: number;
}

export interface PayrollPreflightDTO {
  month: number;
  year: number;
  canProcess: boolean;
  alreadyProcessed: boolean;
  blockers: PayrollBlockerDTO[];
  warnings: PayrollWarningDTO[];
  summary: PayrollPreflightSummaryDTO;
}

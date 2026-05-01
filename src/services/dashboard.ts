import { api } from "@/lib/axios";

export interface MasterAnalyticsResponseDTO {
  financePayrollTrend: Array<{
    month: string;
    expected: number;
    collected: number;
    payroll: number;
  }>;
  attendanceTrend: Array<{
    day: string;
    student: number;
    staff: number;
  }>;
  demographics: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

export interface SystemEvent {
  id: string;
  type: 'finance' | 'attendance' | 'hrms' | 'system' | 'alert' | 'proxy' | 'late-clockin';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/** Live HRMS dashboard summary — returned by GET /auth/hrms/dashboard/summary */
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
  pendingApprovalRequests: number;
  // Phase 5 — Dashboard Intelligence
  pendingProxyCount: number;
  pendingLateClockInCount: number;
  staffPresentPercent: number;
}

export interface DashboardKpiTrendsDTO {
  revenueMtd: number;
  revenuePriorMtd: number;
  revenueDeltaPct: number;
  outstandingMtd: number;
  outstandingPriorMtd: number;
  outstandingDeltaPct: number;
  payrollMtd: number;
  payrollPriorMtd: number;
  payrollDeltaPct: number;
  pendingInvoiceCount: number;
}

export interface DashboardForecastDTO {
  revenueEomForecast: number;
  revenueMonthTarget: number;
  revenueTrajectoryPct: number;
  revenueTrajectory: "ON_TRACK" | "AT_RISK" | "CRITICAL";
  attendanceTrend: "IMPROVING" | "STABLE" | "DECLINING";
  attendanceTrendSlope: number;
  currentStaffAttendancePct: number;
  outstandingRisk: "LOW" | "MEDIUM" | "HIGH";
  outstandingGrowthRate: number;
}

export const dashboardService = {
  /** GET /auth/dashboard/master-analytics */
  getMasterAnalytics() {
    return api.get<MasterAnalyticsResponseDTO>("/auth/dashboard/master-analytics");
  },

  /** GET /auth/hrms/dashboard/summary — real-time HRMS KPIs for the admin overview */
  getHrmsSummary() {
    return api.get<HrmsDashboardSummaryDTO>("/auth/hrms/dashboard/summary");
  },

  /** GET /auth/dashboard/kpi-trends — precise MTD vs prior-MTD deltas */
  getKpiTrends() {
    return api.get<DashboardKpiTrendsDTO>("/auth/dashboard/kpi-trends");
  },

  /** GET /auth/dashboard/forecast — predictive intelligence signals */
  getForecast() {
    return api.get<DashboardForecastDTO>("/auth/dashboard/forecast");
  },

  /** GET /auth/dashboard/events */
  getEvents(params?: { page?: number; size?: number; since?: string; type?: string }) {
    return api.get<PageResponse<SystemEvent>>("/auth/dashboard/events", { params });
  },

  /** PATCH /auth/dashboard/events/read */
  markAsRead(eventIds: string[]) {
    return api.patch<void>("/auth/dashboard/events/read", eventIds);
  },

  /** GET /auth/dashboard/events/unread-count */
  getUnreadCount() {
    return api.get<{ unreadCount: number }>("/auth/dashboard/events/unread-count");
  }
};

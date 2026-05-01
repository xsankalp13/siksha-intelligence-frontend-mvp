/**
 * useDashboardQueries
 * -------------------
 * Per-widget react-query hooks for the Admin Dashboard.
 * Each hook is independent so a single slow API cannot block other widgets.
 * Stale time: 2 min (SSE handles real-time changes; polling is a safety net).
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/services/finance";
import { adminService } from "@/services/admin";
import { classesService } from "@/services/classes";
import { dashboardService } from "@/services/dashboard";

// ── Query Keys ───────────────────────────────────────────────────────
export const DASHBOARD_KEYS = {
  financeSummary: ["dashboard", "finance-summary"] as const,
  masterAnalytics: ["dashboard", "master-analytics"] as const,
  hrmsSummary: ["dashboard", "hrms-summary"] as const,
  studentCount: ["dashboard", "student-count"] as const,
  staffCount: ["dashboard", "staff-count"] as const,
  classCount: ["dashboard", "class-count"] as const,
  kpiTrends: ["dashboard", "kpi-trends"] as const,
  forecast: ["dashboard", "forecast"] as const,
} as const;

const STALE_TIME = 2 * 60 * 1000; // 2 minutes

// ── Finance Summary ──────────────────────────────────────────────────
export function useFinanceSummaryQuery() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.financeSummary,
    queryFn: () => financeService.getAdminDashboardSummary().then((r) => r.data),
    staleTime: STALE_TIME,
    retry: 1,
  });
}

// ── Master Analytics (Finance/Payroll Trend, Attendance, Demographics) ─
export function useMasterAnalyticsQuery() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.masterAnalytics,
    queryFn: () => dashboardService.getMasterAnalytics().then((r) => r.data),
    staleTime: STALE_TIME,
    retry: 1,
  });
}

// ── HRMS Summary ─────────────────────────────────────────────────────
export function useHrmsSummaryQuery() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.hrmsSummary,
    queryFn: () => dashboardService.getHrmsSummary().then((r) => r.data),
    staleTime: STALE_TIME,
    retry: 1,
  });
}

// ── Student Count ────────────────────────────────────────────────────
export function useStudentCountQuery() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.studentCount,
    queryFn: async () => {
      const res = await adminService.listStudents({ page: 0, size: 1 });
      return res.data?.page?.totalElements ?? res.data?.totalElements ?? 0;
    },
    staleTime: 5 * 60 * 1000, // 5 min — student count rarely changes intra-day
    retry: 1,
  });
}

// ── Staff Count ──────────────────────────────────────────────────────
export function useStaffCountQuery() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.staffCount,
    queryFn: async () => {
      const res = await adminService.listStaff({ page: 0, size: 1 });
      return res.data?.page?.totalElements ?? res.data?.totalElements ?? 0;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ── Class Count ──────────────────────────────────────────────────────
export function useClassCountQuery() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.classCount,
    queryFn: () => classesService.getClasses().then((r) => r.data.length),
    staleTime: 10 * 60 * 1000, // 10 min — class list is very stable
    retry: 1,
  });
}

// ── KPI Trends (MTD vs prior MTD — real deltas) ─────────────────────
export function useKpiTrendsQuery() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.kpiTrends,
    queryFn: () => dashboardService.getKpiTrends().then((r) => r.data),
    staleTime: 5 * 60 * 1000, // 5 min — MTD window moves slowly
    retry: 1,
  });
}

// ── Forecast (predictive intelligence) ───────────────────────────────
export function useForecastQuery() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.forecast,
    queryFn: () => dashboardService.getForecast().then((r) => r.data),
    staleTime: 10 * 60 * 1000, // 10 min — signals change slowly
    retry: 1,
  });
}

// ── Invalidate All Dashboard Queries (used by Refresh button) ─────────
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      Object.values(DASHBOARD_KEYS).map((key) =>
        queryClient.invalidateQueries({ queryKey: key })
      )
    );
}

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";
import {
  GraduationCap,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  IndianRupee,
  FileText,
  RefreshCw,
  Clock,
  Layers,
  Banknote,
  PieChart as PieChartIcon,
  Bell,
  ShieldAlert,
  ArrowRightLeft,
  TimerOff,
  Search,
  Wifi,
  WifiOff,
  Loader2,
  SlidersHorizontal,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";

import {
  useFinanceSummaryQuery,
  useMasterAnalyticsQuery,
  useHrmsSummaryQuery,
  useStudentCountQuery,
  useStaffCountQuery,
  useInvalidateDashboard,
  useKpiTrendsQuery,
  useForecastQuery,
} from "@/hooks/useDashboardQueries";

import {
  RevenuePayrollChart,
  AttendanceTrendChart,
  DemographicsPieChart,
  MiniSparkline,
} from "./components/DashboardCharts";
import { LiveActivityFeed } from "./components/LiveFeeds";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { LibraryRadialWidget } from "./components/MockModules";
import { HeroSummary } from "./components/HeroSummary";
import { PriorityInbox } from "./components/PriorityInbox";
import { CommandPalette, useCommandPalette } from "./components/CommandPalette";
import { CustomizeDrawer } from "./components/CustomizeDrawer";
import { ExportMenu } from "./components/ExportMenu";
import { ForecastBar } from "./components/ForecastBar";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";
import { useDashboardLayoutStore, type WidgetId } from "@/stores/dashboardLayoutStore";
import { WidgetErrorBoundary } from "@/components/WidgetErrorBoundary";

// ── Helpers & Formatters ──────────────────────────────────────────────
const formatCompact = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

// Compute month-over-month delta from financePayrollTrend (most-recent last)
function computeDelta(
  series: Array<{ [k: string]: any }>,
  key: string
): { value: number; positive: boolean } | undefined {
  if (!series || series.length < 2) return undefined;
  const current = Number(series[series.length - 1]?.[key] ?? 0);
  const prior = Number(series[series.length - 2]?.[key] ?? 0);
  if (prior === 0) return undefined;
  const pct = ((current - prior) / prior) * 100;
  return { value: Math.abs(Math.round(pct * 10) / 10), positive: pct >= 0 };
}

// ── Motion Variants ───────────────────────────────────────────────────
function useMotionVariants() {
  const prefersReduced = useReducedMotion();
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: prefersReduced ? {} : { staggerChildren: 0.05 },
    },
  };
  const item: Variants = prefersReduced
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, scale: 0.95 },
        show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
      };
  return { container, item };
}

// ── Widget Wrapper ────────────────────────────────────────────────────
function BentoWidget({
  children,
  title,
  subtitle,
  colSpan = "col-span-1",
  rowSpan = "row-span-1",
  action,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  colSpan?: string;
  rowSpan?: string;
  action?: React.ReactNode;
}) {
  const { item } = useMotionVariants();
  return (
    <motion.div
      variants={item}
      className={`${colSpan} ${rowSpan} flex flex-col rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="flex items-center justify-between mb-4 shrink-0 relative z-10">
        <div>
          <h3 className="text-base font-bold text-foreground leading-tight tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs font-medium text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="flex-1 min-h-0 relative z-10">{children}</div>
    </motion.div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────
function MetricKpi({
  title,
  value,
  subtitle,
  icon: Icon,
  gradientClass,
  trend,
  loading,
  sparklineData,
  sparklineKey,
  onClick,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  gradientClass: string;
  trend?: { value: number; positive: boolean };
  loading: boolean;
  sparklineData?: any[];
  sparklineKey?: string;
  onClick?: () => void;
}) {
  const { item } = useMotionVariants();
  return (
    <motion.div
      variants={item}
      onClick={onClick}
      className={`relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-sm transition-all duration-300 hover:shadow-md ${gradientClass} border border-border/50 ${onClick ? "cursor-pointer active:scale-[0.98]" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 dark:bg-black/20 shadow-inner backdrop-blur-sm">
          <Icon className="h-6 w-6 text-white" aria-hidden="true" />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white bg-white/20 backdrop-blur-md shadow-sm">
            {trend.positive ? (
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {trend.value}%
          </span>
        )}
      </div>
      <div className="mt-8 flex items-end justify-between">
        <div>
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-white/30" />
          ) : (
            <p className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">{value}</p>
          )}
          <p className="mt-1 text-sm font-semibold text-white/90">{title}</p>
          {loading ? (
            <div className="mt-1 h-3 w-32 animate-pulse rounded bg-white/20" />
          ) : (
            <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>
          )}
        </div>
        {sparklineData && sparklineKey && (
          <div className="shrink-0 -mr-2">
            <MiniSparkline data={sparklineData} datakey={sparklineKey} color="#ffffff" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Proxy Coverage Mini-Widget ────────────────────────────────────────
function ProxyCoverageWidget({
  hrms,
  loading,
}: {
  hrms: {
    pendingProxyCount: number;
    pendingLateClockInCount: number;
    pendingLeaveApplications: number;
    todayAbsent: number;
  } | null;
  loading: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 h-full w-full">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-full min-h-[80px] animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  if (!hrms) return null;

  const items = [
    {
      label: "Uncovered Proxy Periods",
      value: hrms.pendingProxyCount,
      icon: ArrowRightLeft,
      accent: hrms.pendingProxyCount > 0 ? "text-amber-600 bg-amber-500/10" : "text-emerald-600 bg-emerald-500/10",
      href: "/dashboard/admin/proxy",
    },
    {
      label: "Pending Late Clock-Ins",
      value: hrms.pendingLateClockInCount,
      icon: TimerOff,
      accent: hrms.pendingLateClockInCount > 0 ? "text-rose-600 bg-rose-500/10" : "text-emerald-600 bg-emerald-500/10",
      href: "/dashboard/admin/hrms",
    },
    {
      label: "Pending Leave Requests",
      value: hrms.pendingLeaveApplications,
      icon: FileText,
      accent: hrms.pendingLeaveApplications > 0 ? "text-violet-600 bg-violet-500/10" : "text-emerald-600 bg-emerald-500/10",
      href: "/dashboard/admin/hrms",
    },
    {
      label: "Absent Today",
      value: hrms.todayAbsent,
      icon: ShieldAlert,
      accent: hrms.todayAbsent > 0 ? "text-red-600 bg-red-500/10" : "text-emerald-600 bg-emerald-500/10",
      href: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 h-full w-full">
      {items.map((it) => (
        <button
          key={it.label}
          onClick={() => it.href && navigate(it.href)}
          aria-label={`${it.label}: ${it.value}`}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 transition-all ${it.accent.split(" ")[1]} ${it.href ? "hover:scale-[1.02] active:scale-95 cursor-pointer" : "cursor-default"}`}
        >
          <it.icon className={`h-5 w-5 ${it.accent.split(" ")[0]}`} aria-hidden="true" />
          <span className={`text-2xl font-extrabold ${it.accent.split(" ")[0]}`}>{it.value}</span>
          <span className="text-[10px] font-semibold text-center text-muted-foreground leading-tight">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── SSE Status Chip ───────────────────────────────────────────────────
function SseStatusChip({
  status,
  retryCountdown,
  onRetry,
}: {
  status: string;
  retryCountdown: number;
  onRetry: () => void;
}) {
  const isConnected = status === "connected";
  const isReconnecting = status === "reconnecting";

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold tracking-wide uppercase mb-3 ${
        isConnected
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          : isReconnecting
          ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
          : "bg-zinc-500/10 border-zinc-500/20 text-zinc-700 dark:text-zinc-400"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            isConnected ? "bg-emerald-500" : isReconnecting ? "bg-amber-500" : "bg-zinc-500"
          }`}
        />
      </span>
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" aria-hidden="true" /> System Live
        </>
      ) : isReconnecting ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          Reconnecting{retryCountdown > 0 ? ` in ${retryCountdown}s` : "…"}
          <button
            onClick={onRetry}
            className="ml-1 underline underline-offset-2 hover:no-underline normal-case"
            aria-label="Retry SSE connection now"
          >
            Retry
          </button>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" aria-hidden="true" /> Connecting…
        </>
      )}
    </div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────────
export default function AdminOverview() {
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(true);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const { widgetOrder, hiddenWidgets } = useDashboardLayoutStore();
  const isFetching = useIsFetching({ queryKey: ["dashboard"] });

  const {
    events,
    unreadCount,
    status: sseStatus,
    retryCountdown,
    missedWhileHidden,
    markEventAsRead,
    markAllAsRead,
    manualReconnect,
    clearMissedBadge,
  } = useRealtimeEvents();

  // ── Per-widget independent queries ──────────────────────────────────
  const { data: financeSummary, isLoading: financeLoading } = useFinanceSummaryQuery();
  const { data: masterAnalytics, isLoading: analyticsLoading } = useMasterAnalyticsQuery();
  const { data: hrmsSummary, isLoading: hrmsLoading } = useHrmsSummaryQuery();
  const { data: studentCount = 0, isLoading: studentLoading } = useStudentCountQuery();
  const { data: staffCount = 0, isLoading: staffLoading } = useStaffCountQuery();
  const { data: kpiTrends } = useKpiTrendsQuery();
  const { data: forecast, isLoading: forecastLoading } = useForecastQuery();
  const invalidateDashboard = useInvalidateDashboard();

  const handleRefresh = async () => {
    try {
      await invalidateDashboard();
      toast.success("Dashboard refreshed");
    } catch {
      toast.error("Refresh failed");
    }
  };

  // ── Chart data ───────────────────────────────────────────────────────
  const financePayrollData = useMemo(() => masterAnalytics?.financePayrollTrend ?? [], [masterAnalytics]);
  const attendanceData = useMemo(() => masterAnalytics?.attendanceTrend ?? [], [masterAnalytics]);
  const demographicsData = useMemo(() => masterAnalytics?.demographics ?? [], [masterAnalytics]);

  // Outstanding sparkline: expected − collected per month (real data, no hardcoded proxy)
  const outstandingSparklineData = useMemo(
    () =>
      financePayrollData.map((p) => ({
        ...p,
        outstanding: Math.max(0, Number(p.expected ?? 0) - Number(p.collected ?? 0)),
      })),
    [financePayrollData]
  );

  // ── Real KPI trends — prefer precise backend MTD data, fall back to 6-month trend series ──
  const revenueTrend = useMemo(() => {
    if (kpiTrends) return { value: Math.abs(kpiTrends.revenueDeltaPct), positive: kpiTrends.revenueDeltaPct >= 0 };
    return computeDelta(financePayrollData, "collected");
  }, [kpiTrends, financePayrollData]);

  const outstandingTrend = useMemo(() => {
    if (kpiTrends) {
      const pct = kpiTrends.outstandingDeltaPct;
      // Increasing outstanding is BAD → invert positive flag
      return { value: Math.abs(pct), positive: pct < 0 };
    }
    const raw = computeDelta(outstandingSparklineData, "outstanding");
    return raw ? { value: raw.value, positive: !raw.positive } : undefined;
  }, [kpiTrends, outstandingSparklineData]);

  // ── Campus Presence ─────────────────────────────────────────────────
  const campusPresenceDisplay = hrmsSummary ? `${hrmsSummary.staffPresentPercent.toFixed(1)}%` : "—";
  const campusPresenceSubtitle = hrmsSummary
    ? `${hrmsSummary.todayPresent} Present · ${hrmsSummary.todayAbsent} Absent · ${hrmsSummary.todayOnLeave} On Leave`
    : "Loading attendance data…";
  const staffPresenceTrend = hrmsSummary
    ? { value: Math.abs(Number((hrmsSummary.staffPresentPercent - 90).toFixed(1))), positive: hrmsSummary.staffPresentPercent >= 90 }
    : undefined;

  // ── Pending Actions ─────────────────────────────────────────────────
  const pendingActionsCount = hrmsSummary
    ? hrmsSummary.pendingProxyCount + hrmsSummary.pendingLateClockInCount + hrmsSummary.pendingLeaveApplications
    : unreadCount;
  const pendingActionsSubtitle = hrmsSummary
    ? `${hrmsSummary.pendingProxyCount} Proxy · ${hrmsSummary.pendingLateClockInCount} Late · ${hrmsSummary.pendingLeaveApplications} Leave`
    : "Unread dashboard events";

  // ── Greeting ─────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const timeGreet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { container } = useMotionVariants();

  return (
    <>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-20 max-w-[1600px] mx-auto pt-2">

        {/* ── "While you were away" chip ──────────────────────────── */}
        {missedWhileHidden > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5"
          >
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
              {missedWhileHidden} new event{missedWhileHidden > 1 ? "s" : ""} while you were away
            </p>
            <div className="flex gap-2">
              <button onClick={() => setIsDrawerOpen(true)} className="text-xs font-bold text-blue-700 dark:text-blue-400 underline underline-offset-2">View</button>
              <button onClick={clearMissedBadge} className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70">Dismiss</button>
            </div>
          </motion.div>
        )}

        {/* ── Header ──────────────────────────────────────────────── */}
        <motion.div variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
          <div>
            <SseStatusChip status={sseStatus} retryCountdown={retryCountdown} onRetry={manualReconnect} />
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{timeGreet}, Admin</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">Command center — Finance, HRMS & Operations intelligence, live.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              aria-label="Open command palette (Cmd-K)"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>Search…</span>
              <kbd className="inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
            </button>
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label={`Notifications — ${unreadCount} unread`}
              className="relative inline-flex items-center justify-center rounded-xl border border-border bg-card p-2.5 text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-card border-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <ExportMenu
              financePayrollData={financePayrollData}
              attendanceData={attendanceData}
              revenueMtd={kpiTrends?.revenueMtd ?? financeSummary?.totalCollected}
              outstandingMtd={kpiTrends?.outstandingMtd ?? financeSummary?.totalOutstanding}
              pendingInvoiceCount={kpiTrends?.pendingInvoiceCount ?? financeSummary?.pendingInvoicesCount}
            />
            <button
              onClick={() => navigate("/dashboard/admin/hrms/payroll")}
              aria-label="Start payroll run"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent/80 hover:shadow"
            >
              <Banknote className="h-4 w-4" aria-hidden="true" /> Start Payroll
            </button>
            <button
              onClick={() => setIsCustomizeOpen(true)}
              aria-label="Customize dashboard layout"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent/80 hover:shadow"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Customize
            </button>
            <button
              onClick={handleRefresh}
              aria-label="Refresh dashboard data"
              disabled={isFetching > 0}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-md transition hover:bg-foreground/90 hover:shadow-lg disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching > 0 ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
            </button>
          </div>
        </motion.div>

        {/* ── Hero Summary Strip ───────────────────────────────────── */}
        <HeroSummary
          hrmsSummary={hrmsSummary ?? null}
          pendingInvoices={financeSummary?.pendingInvoicesCount ?? 0}
          outstanding={financeSummary?.totalOutstanding ?? 0}
          hrmsLoading={hrmsLoading}
          financeLoading={financeLoading}
        />

        {/* ── Forecast Intelligence Bar ────────────────────────────── */}
        <ForecastBar forecast={forecast} isLoading={forecastLoading} />

        {/* ── KPI Row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricKpi
            title="Total Revenue (MTD)" value={formatCompact(financeSummary?.totalCollected ?? 0)}
            subtitle="Month-to-date fee collection"
            icon={IndianRupee} gradientClass="bg-gradient-to-br from-emerald-500 to-emerald-700"
            trend={revenueTrend} loading={financeLoading}
            sparklineData={financePayrollData} sparklineKey="collected"
            onClick={() => navigate("/dashboard/admin/finance")}
          />
          <MetricKpi
            title="Staff Campus Presence" value={hrmsLoading ? "—" : campusPresenceDisplay}
            subtitle={campusPresenceSubtitle}
            icon={Users} gradientClass="bg-gradient-to-br from-blue-500 to-indigo-600"
            trend={staffPresenceTrend} loading={hrmsLoading}
            sparklineData={attendanceData} sparklineKey="staff"
            onClick={() => navigate("/dashboard/admin/hrms")}
          />
          <MetricKpi
            title="Net Outstanding" value={formatCompact(kpiTrends?.outstandingMtd ?? financeSummary?.totalOutstanding ?? 0)}
            subtitle={`${kpiTrends?.pendingInvoiceCount ?? financeSummary?.pendingInvoicesCount ?? 0} Overdue Invoices`}
            icon={Clock} gradientClass="bg-gradient-to-br from-amber-500 to-orange-600"
            trend={outstandingTrend}
            loading={financeLoading}
            sparklineData={outstandingSparklineData} sparklineKey="outstanding"
            onClick={() => navigate("/dashboard/admin/finance")}
          />
          <MetricKpi
            title="Pending Actions" value={String(hrmsLoading ? "—" : pendingActionsCount)}
            subtitle={pendingActionsSubtitle}
            icon={Layers} gradientClass="bg-gradient-to-br from-rose-500 to-rose-700"
            loading={hrmsLoading}
            onClick={() => navigate("/dashboard/admin/hrms")}
          />
        </div>

        {/* ── Quick Stats Bar (collapsible on mobile) ───────────────── */}
        {(() => {
          const stats = [
            { label: "Students", value: studentLoading ? "—" : studentCount.toLocaleString("en-IN"), icon: GraduationCap, href: "/dashboard/admin/students", color: "text-violet-600", bg: "bg-violet-500/10 border-violet-500/20" },
            { label: "Active Staff", value: staffLoading ? "—" : staffCount.toLocaleString("en-IN"), icon: Users, href: "/dashboard/admin/staff", color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/20" },
            { label: "Present Today", value: hrmsSummary ? String(hrmsSummary.todayPresent) : "—", icon: ShieldAlert, href: "/dashboard/admin/hrms", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { label: "On Leave Today", value: hrmsSummary ? String(hrmsSummary.todayOnLeave) : "—", icon: FileText, href: "/dashboard/admin/hrms", color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/20" },
          ];
          return (
            <div>
              {/* Mobile collapse toggle — hidden on md+ */}
              <button
                onClick={() => setStatsOpen((v) => !v)}
                className="md:hidden flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground mb-2"
                aria-expanded={statsOpen}
                aria-label="Toggle quick stats"
              >
                <span>Quick Stats</span>
                <ChevronDownIcon className={`h-4 w-4 transition-transform text-muted-foreground ${statsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {(statsOpen || window.innerWidth >= 768) && (
                  <motion.div
                    key="stats"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {stats.map((s) => (
                        <button key={s.label} onClick={() => navigate(s.href)} aria-label={`${s.label}: ${s.value}`}
                          className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all hover:scale-[1.02] active:scale-95 ${s.bg}`}>
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                            <s.icon className={`h-5 w-5 ${s.color}`} aria-hidden="true" />
                          </div>
                          <div>
                            <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
                            <p className="text-xs font-semibold text-muted-foreground">{s.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {/* ── Bento Grid (order & visibility controlled by CustomizeDrawer) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(180px,auto)] gap-5">
          {widgetOrder
            .filter((id) => !hiddenWidgets.includes(id))
            .map((id: WidgetId) => {
              if (id === "finance-chart") return (
                <BentoWidget key={id} title="Finance & Payroll Analytics" subtitle="Revenue vs Expected vs Payroll Outflow"
                  colSpan="md:col-span-8" rowSpan="md:row-span-2"
                  action={
                    <button onClick={() => navigate("/dashboard/admin/finance")} aria-label="View finance ledger"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      View Ledger <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  }>
                  <div className="h-full w-full pt-4 pl-2">
                    <WidgetErrorBoundary title="Finance & Payroll Analytics">
                      <RevenuePayrollChart data={financePayrollData} loading={analyticsLoading} />
                    </WidgetErrorBoundary>
                  </div>
                </BentoWidget>
              );
              if (id === "demographics") return (
                <BentoWidget key={id} title="Institute Demographics" subtitle="Student & Staff Population" colSpan="md:col-span-4" rowSpan="md:row-span-1">
                  <div className="flex h-full items-center justify-center overflow-hidden">
                    <WidgetErrorBoundary title="Institute Demographics">
                      <DemographicsPieChart data={demographicsData} loading={analyticsLoading} />
                    </WidgetErrorBoundary>
                  </div>
                </BentoWidget>
              );
              if (id === "priority-inbox") return (
                <BentoWidget key={id} title="Priority Inbox" subtitle="Decisions & Approvals Needed" colSpan="md:col-span-4" rowSpan="md:row-span-1"
                  action={
                    <button onClick={() => navigate("/dashboard/admin/hrms")} aria-label="View all HRMS actions"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      View All <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  }>
                  <div className="h-full pt-2">
                    <PriorityInbox
                      hrmsSummary={hrmsSummary ?? null}
                      pendingInvoices={financeSummary?.pendingInvoicesCount ?? 0}
                      outstanding={financeSummary?.totalOutstanding ?? 0}
                    />
                  </div>
                </BentoWidget>
              );
              if (id === "attendance-chart") return (
                <BentoWidget key={id} title="Daily Attendance Pulse" subtitle="14-Day Trajectory (Student vs Staff)" colSpan="md:col-span-5" rowSpan="md:row-span-2">
                  <div className="h-full w-full pt-4">
                    <WidgetErrorBoundary title="Daily Attendance Pulse">
                      <AttendanceTrendChart data={attendanceData} loading={analyticsLoading} />
                    </WidgetErrorBoundary>
                  </div>
                </BentoWidget>
              );
              if (id === "hrms-intelligence") return (
                <BentoWidget key={id} title="HRMS Intelligence" subtitle="Live Pending Actions" colSpan="md:col-span-3" rowSpan="md:row-span-2"
                  action={
                    <button onClick={() => navigate("/dashboard/admin/hrms")} aria-label="Go to HRMS dashboard"
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      HRMS <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </button>
                  }>
                  <div className="flex h-full items-center justify-center pt-2">
                    <ProxyCoverageWidget hrms={hrmsSummary ?? null} loading={hrmsLoading} />
                  </div>
                </BentoWidget>
              );
              if (id === "live-feed") return (
                <BentoWidget key={id} title="Live System Feed" subtitle="Latest events across campus" colSpan="md:col-span-4" rowSpan="md:row-span-3">
                  <div className="h-full truncate">
                    <WidgetErrorBoundary title="Live System Feed">
                      <LiveActivityFeed activities={events} />
                    </WidgetErrorBoundary>
                  </div>
                </BentoWidget>
              );
              if (id === "quick-actions") return (
                <BentoWidget key={id} title="Command Menu" subtitle="Frequent Actions" colSpan="md:col-span-4" rowSpan="md:row-span-1">
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {[
                      { title: "Onboard Staff", icon: Users, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", href: "/dashboard/admin/staff", aria: "Onboard new staff member" },
                      { title: "Enroll Student", icon: GraduationCap, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", href: "/dashboard/admin/students", aria: "Enroll a new student" },
                      { title: "Leave Approvals", icon: FileText, color: "bg-amber-500/10 text-amber-600 border-amber-500/20", href: "/dashboard/admin/hrms", aria: "Review leave approvals" },
                      { title: "View Reports", icon: PieChartIcon, color: "bg-violet-500/10 text-violet-600 border-violet-500/20", href: "/dashboard/admin/finance", aria: "View finance reports" },
                    ].map((act) => (
                      <button key={act.title} onClick={() => navigate(act.href)} aria-label={act.aria}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${act.color}`}>
                        <act.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="text-xs font-bold">{act.title}</span>
                      </button>
                    ))}
                  </div>
                </BentoWidget>
              );
              if (id === "library") return (
                <BentoWidget key={id} title="Library System" subtitle="Resource Availability" colSpan="md:col-span-4" rowSpan="md:row-span-1">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden">
                    <LibraryRadialWidget />
                  </div>
                </BentoWidget>
              );
              return null;
            })}
        </div>

        <CustomizeDrawer open={isCustomizeOpen} onClose={() => setIsCustomizeOpen(false)} />

        <NotificationDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          events={events}
          unreadCount={unreadCount}
          markAllAsRead={markAllAsRead}
          markEventAsRead={markEventAsRead}
        />
      </motion.div>
    </>
  );
}

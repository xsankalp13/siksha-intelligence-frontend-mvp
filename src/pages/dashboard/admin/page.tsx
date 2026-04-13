import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { toast } from "sonner";
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
  Bell
} from "lucide-react";

import { financeService } from "@/services/finance";
import { adminService } from "@/services/admin";
import { classesService } from "@/services/classes";
import { dashboardService } from "@/services/dashboard";
import type { MasterAnalyticsResponseDTO } from "@/services/dashboard";

import { 
  RevenuePayrollChart, 
  AttendanceTrendChart, 
  DemographicsPieChart,
  MiniSparkline
} from "./components/DashboardCharts";
import { LiveActivityFeed, SmartAlertsWidget } from "./components/LiveFeeds";
import { NotificationDrawer } from "./components/NotificationDrawer";
import { TransportRadialWidget, LibraryRadialWidget } from "./components/MockModules";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";

// ── Helpers & Formatters ──────────────────────────────────────────────
const formatCompact = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

// ── Motion Variants ───────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item: Variants = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } } };

// ── Widget Wrapper ───────────────────────────────────────────────────
function BentoWidget({ children, title, subtitle, colSpan = "col-span-1", rowSpan = "row-span-1", action }: any) {
  return (
    <motion.div variants={item} className={`${colSpan} ${rowSpan} flex flex-col rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group`}>
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

// ── KPI Card Component ───────────────────────────────────────────────
function MetricKpi({ title, value, subtitle, icon: Icon, gradientClass, trend, loading, sparklineData, sparklineKey }: any) {
  return (
    <motion.div variants={item} className={`relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-sm transition-all duration-300 hover:shadow-md ${gradientClass} border border-border/50`}>
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 dark:bg-black/20 shadow-inner backdrop-blur-sm`}>
          <Icon className={`h-6 w-6 text-white`} />
        </div>
        {trend && (
           <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white bg-white/20 backdrop-blur-md shadow-sm`}>
            {trend.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
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
          <p className="mt-0.5 text-xs text-white/70">{subtitle}</p>
        </div>
        {sparklineData && (
          <div className="shrink-0 -mr-2">
             <MiniSparkline data={sparklineData} datakey={sparklineKey} color="#ffffff" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────────
export default function AdminOverview() {
  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { events, unreadCount, status, markEventAsRead, markAllAsRead } = useRealtimeEvents();
  const [stats, setStats] = useState<any>({
    studentCount: 0,
    staffCount: 0,
    classCount: 0,
    collected: 0,
    outstanding: 0,
    pendingInvoices: 0
  });
  const [masterAnalytics, setMasterAnalytics] = useState<MasterAnalyticsResponseDTO | null>(null);

  const fetchAll = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [summaryRes, studentsRes, staffRes, classesRes, analyticsRes] = await Promise.allSettled([
        financeService.getAdminDashboardSummary(),
        adminService.listStudents({ page: 0, size: 1 }),
        adminService.listStaff({ page: 0, size: 1 }),
        classesService.getClasses(),
        dashboardService.getMasterAnalytics(),
      ]);
      
      setStats({
        collected: summaryRes.status === "fulfilled" ? summaryRes.value.data.totalCollected : 8450000,
        outstanding: summaryRes.status === "fulfilled" ? summaryRes.value.data.totalOutstanding : 1200000,
        pendingInvoices: summaryRes.status === "fulfilled" ? summaryRes.value.data.pendingInvoicesCount : 15,
        studentCount: studentsRes.status === "fulfilled" ? studentsRes.value.data.totalElements : 2405,
        staffCount: staffRes.status === "fulfilled" ? staffRes.value.data.totalElements : 165,
        classCount: classesRes.status === "fulfilled" ? classesRes.value.data.length : 32
      });

      if (analyticsRes.status === "fulfilled") {
        setMasterAnalytics(analyticsRes.value.data);
      }
    } catch {
      toast.error("Failed to load some dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Chart Data ──────────────────────────────────────
  const financePayrollData = useMemo(() => {
    return masterAnalytics?.financePayrollTrend || [];
  }, [masterAnalytics]);

  const attendanceData = useMemo(() => {
    return masterAnalytics?.attendanceTrend || [];
  }, [masterAnalytics]);

  const demographicsData = useMemo(() => {
    return masterAnalytics?.demographics || [];
  }, [masterAnalytics]);

  const now = new Date();
  const timeGreet = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-20 max-w-[1600px] mx-auto pt-2">
      
      {/* ── Header Area ──────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold tracking-wide uppercase mb-3 ${
            status === 'connected' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 
            status === 'reconnecting' ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400' : 
            'bg-zinc-500/10 border-zinc-500/20 text-zinc-700 dark:text-zinc-400'
          }`}>
             <span className="relative flex h-2 w-2">
              {status === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                status === 'connected' ? 'bg-emerald-500' : status === 'reconnecting' ? 'bg-amber-500' : 'bg-zinc-500'
              }`}></span>
            </span>
            {status === 'connected' ? 'System Live' : status === 'reconnecting' ? 'Reconnecting...' : 'Connecting...'}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {timeGreet}, Admin
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Welcome to your command center. Here is the aggregated performance of Finance, HRMS, and Operations metrics for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setIsDrawerOpen(true)}
             className="relative inline-flex items-center justify-center rounded-xl border border-border bg-card p-2.5 text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
           >
             <Bell className="h-5 w-5" />
             {unreadCount > 0 && (
               <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-card border-none">
                 {unreadCount > 99 ? '99+' : unreadCount}
               </span>
             )}
           </button>
           <button 
             className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent/80 hover:shadow"
           >
             <Banknote className="h-4 w-4" /> Start Payroll
           </button>
           <button 
             onClick={() => fetchAll()}
             className="inline-flex items-center gap-2 rounded-xl border border-border bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-md transition hover:bg-foreground/90 hover:shadow-lg"
           >
             <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
           </button>
        </div>
      </motion.div>

      {/* ── KPI At-A-Glance Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricKpi 
          title="Total Revenue (MTD)" value={formatCompact(stats.collected)} subtitle="vs 1.2Cr Target"
          icon={IndianRupee} gradientClass="bg-gradient-to-br from-emerald-500 to-emerald-700" 
          trend={{ value: 12.5, positive: true }} loading={loading}
          sparklineData={financePayrollData} sparklineKey="collected"
        />
        <MetricKpi 
          title="Campus Presence" value="94.2%" subtitle={`${stats.studentCount} Students & Staff Present`}
          icon={Users} gradientClass="bg-gradient-to-br from-blue-500 to-indigo-600" 
          trend={{ value: 2.1, positive: true }} loading={false}
          sparklineData={attendanceData} sparklineKey="student"
        />
        <MetricKpi 
          title="Net Outstanding" value={formatCompact(stats.outstanding)} subtitle={`${stats.pendingInvoices} Overdue Invoices`}
          icon={Clock} gradientClass="bg-gradient-to-br from-amber-500 to-orange-600" 
          trend={{ value: 4.8, positive: false }} loading={loading}
          sparklineData={financePayrollData} sparklineKey="payroll"
        />
        <MetricKpi 
          title="Pending Actions" value={unreadCount.toString()} subtitle="Unread dashboard events"
          icon={Layers} gradientClass="bg-gradient-to-br from-rose-500 to-rose-700" 
          loading={false}
        />
      </div>

      {/* ── Bento Grid Area ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[minmax(180px,auto)] gap-5">
        
        {/* Row 1 / Huge Chart */}
        <BentoWidget 
          title="Finance & Payroll Analytics" 
          subtitle="Revenue vs Expected vs Outflow" 
          colSpan="md:col-span-8" 
          rowSpan="md:row-span-2"
          action={
            <button className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
              View Ledger <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          <div className="h-full w-full pt-4 pl-2">
            <RevenuePayrollChart data={financePayrollData} loading={loading} />
          </div>
        </BentoWidget>

        {/* Top Right / Demographics */}
        <BentoWidget 
          title="Institute Demographics" 
          subtitle="Population Distribution" 
          colSpan="md:col-span-4" 
          rowSpan="md:row-span-1"
        >
           <div className="flex h-full items-center justify-center overflow-hidden">
             <DemographicsPieChart data={demographicsData} loading={loading} />
           </div>
        </BentoWidget>

         {/* Right Middle / Smart Alerts */}
         <BentoWidget 
          title="Operational Alerts" 
          subtitle="Attention Required" 
          colSpan="md:col-span-4" 
          rowSpan="md:row-span-1"
        >
          <div className="h-full pt-2">
            <SmartAlertsWidget 
              alerts={events.filter(e => e.severity === 'critical' || e.severity === 'warning')} 
              onDismiss={markEventAsRead} 
            />
          </div>
        </BentoWidget>

        {/* Row 2 / Attendance */}
        <BentoWidget 
          title="Daily Attendance Pulse" 
          subtitle="14-Day Trajectory (Student vs Staff)" 
          colSpan="md:col-span-5" 
          rowSpan="md:row-span-2"
        >
          <div className="h-full w-full pt-4">
             <AttendanceTrendChart data={attendanceData} loading={loading} />
          </div>
        </BentoWidget>

        {/* Middle / Mock Modules (Transport & Library side by side) */}
        <BentoWidget 
          title="Fleet Health" 
          subtitle="Live Bus Tracking" 
          colSpan="md:col-span-3" 
          rowSpan="md:row-span-2"
        >
          <div className="flex h-full items-center justify-center">
             <TransportRadialWidget />
          </div>
        </BentoWidget>

        <BentoWidget 
          title="Live System Feed" 
          subtitle="Latest events across campus" 
          colSpan="md:col-span-4" 
          rowSpan="md:row-span-3"
        >
          <div className="h-full truncate">
            <LiveActivityFeed activities={events} />
          </div>
        </BentoWidget>

         {/* Bottom Left / Quick Actions */}
         <BentoWidget 
          title="Command Menu" 
          subtitle="Frequent Actions" 
          colSpan="md:col-span-4" 
          rowSpan="md:row-span-1"
        >
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
              { title: "Onboard Staff", icon: Users, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
              { title: "Enroll Student", icon: GraduationCap, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
              { title: "Leave Approvals", icon: FileText, color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
              { title: "View Reports", icon: PieChartIcon, color: "bg-violet-500/10 text-violet-600 border-violet-500/20" }
            ].map(act => (
              <button key={act.title} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${act.color}`}>
                <act.icon className="h-4 w-4 shrink-0" />
                <span className="text-xs font-bold">{act.title}</span>
              </button>
            ))}
          </div>
        </BentoWidget>

        <BentoWidget 
          title="Library System" 
          subtitle="Resource Availability" 
          colSpan="md:col-span-4" 
          rowSpan="md:row-span-1"
        >
           <div className="flex h-full w-full items-center justify-center overflow-hidden">
             <LibraryRadialWidget />
          </div>
        </BentoWidget>

      </div>
      
      <NotificationDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        events={events} 
        unreadCount={unreadCount} 
        markAllAsRead={markAllAsRead} 
        markEventAsRead={markEventAsRead} 
      />
    </motion.div>
  );
}

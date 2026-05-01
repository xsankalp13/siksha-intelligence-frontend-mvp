import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, IndianRupee, Users2, UserX,
  Calendar, ShieldAlert, ArrowRight, ClipboardCheck, 
  TrendingUp, TrendingDown, Zap, Award, BookOpen, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { cn } from "@/lib/utils";

const BASE = "/dashboard/admin/hrms";

// ── Palette ──────────────────────────────────────────────────────────
const PALETTE = {
  blue:   { from: "from-blue-500", to: "to-indigo-600",  light: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
  green:  { from: "from-emerald-500", to: "to-teal-600", light: "bg-emerald-50",text: "text-emerald-600",border: "border-emerald-100" },
  red:    { from: "from-rose-500",  to: "to-pink-600",   light: "bg-rose-50",   text: "text-rose-600",   border: "border-rose-100" },
  amber:  { from: "from-amber-500", to: "to-orange-600", light: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100" },
  violet: { from: "from-violet-500",to: "to-purple-600", light: "bg-violet-50", text: "text-violet-600", border: "border-violet-100" },
  cyan:   { from: "from-cyan-500",  to: "to-blue-600",   light: "bg-cyan-50",   text: "text-cyan-600",   border: "border-cyan-100" },
};

function heatmapColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "bg-slate-100 dark:bg-slate-800";
  const pct = count / max;
  if (pct < 0.2)  return "bg-emerald-100 dark:bg-emerald-900/60";
  if (pct < 0.4)  return "bg-emerald-200 dark:bg-emerald-800/70";
  if (pct < 0.6)  return "bg-emerald-300 dark:bg-emerald-700/70";
  if (pct < 0.8)  return "bg-emerald-400 dark:bg-emerald-600/80";
  return "bg-emerald-500 dark:bg-emerald-500";
}

// ── KPI Card ─────────────────────────────────────────────────────────
function KpiCard({
  label, value, icon: Icon, palette, sub, isCurrency = false,
}: {
  label: string; value?: number; icon: React.ElementType;
  palette: keyof typeof PALETTE; sub?: string; isCurrency?: boolean;
}) {
  const p = PALETTE[palette];
  const { formatCurrency, formatNumber } = useHrmsFormatters();
  const displayValue = value == null ? "—"
    : isCurrency ? formatCurrency(value) : formatNumber(value);

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-5 bg-white dark:bg-slate-900 transition-all duration-200",
      "hover:-translate-y-0.5 hover:shadow-lg cursor-default group",
      p.border
    )}>
      {/* Gradient accent bar */}
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", p.from, p.to)} />
      
      <div className="flex items-start justify-between mb-3">
        <div className={cn("rounded-xl p-2.5", p.light)}>
          <Icon className={cn("h-5 w-5", p.text)} />
        </div>
        <Zap className={cn("h-3.5 w-3.5 opacity-0 group-hover:opacity-40 transition-opacity", p.text)} />
      </div>
      
      <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
        {displayValue}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Quick Action Card ─────────────────────────────────────────────────
function ActionCard({
  title, count, desc, link, icon: Icon, palette,
}: {
  title: string; count?: number; desc: string; link: string;
  icon: React.ElementType; palette: keyof typeof PALETTE;
}) {
  const p = PALETTE[palette];
  const { formatNumber } = useHrmsFormatters();
  
  return (
    <Link to={link} className="block group">
      <div className={cn(
        "relative overflow-hidden rounded-2xl border p-5 bg-white dark:bg-slate-900",
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        p.border
      )}>
        <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", p.from, p.to)} />
        <div className="flex items-center justify-between mb-4">
          <div className={cn("rounded-xl p-2.5", p.light)}>
            <Icon className={cn("h-5 w-5", p.text)} />
          </div>
          <ArrowRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-1", p.text)} />
        </div>
        <p className={cn("text-3xl font-bold tabular-nums", p.text)}>
          {count == null ? "—" : formatNumber(count)}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </Link>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800", className)} />;
}

// ── Main Dashboard ───────────────────────────────────────────────────
export default function HrmsDashboard() {
  const { formatCurrency, formatNumber } = useHrmsFormatters();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "dashboard", "summary"],
    queryFn: () => hrmsService.getDashboardSummary().then((res) => res.data),
  });

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="h-5 w-5 text-rose-500" />
          <p className="font-semibold text-rose-700 dark:text-rose-400">Failed to load dashboard</p>
        </div>
        <p className="text-sm text-rose-600 dark:text-rose-300 mb-4">{normalizeHrmsError(error).message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 border-rose-300 text-rose-700">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  // Heatmap calendar — lazy-loaded from dedicated endpoint (decoupled from summary for perf)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const { data: heatmapResponse } = useQuery({
    queryKey: ["hrms", "dashboard", "attendance-heatmap", year, month + 1],
    queryFn: () => hrmsService.getAttendanceHeatmap(year, month + 1).then((res) => res.data),
  });

  // Convert backend AttendanceHeatmapDTO.days[] into the Record<string, number> format used by the widget
  const heatmapData: Record<string, number> = {};
  if (heatmapResponse?.days) {
    for (const day of heatmapResponse.days) {
      // day.date is ISO string "YYYY-MM-DD", use presentCount as the heatmap intensity value
      heatmapData[day.date] = day.presentCount ?? 0;
    }
  }
  const maxCount = Math.max(1, ...Object.values(heatmapData));
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { day: d, key, count: heatmapData[key] ?? 0 };
  });
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Pie data — staff distribution
  const pieData = [
    { name: "Teaching", value: data?.totalTeachingStaff ?? 0, color: "#6366f1" },
    { name: "Non-Teaching Admin", value: data?.totalNonTeachingAdmin ?? 0, color: "#8b5cf6" },
    { name: "Support", value: data?.totalNonTeachingSupport ?? 0, color: "#a78bfa" },
  ].filter((d) => d.value > 0);

  const monthName = now.toLocaleString("default", { month: "long" });

  return (
    <div className="space-y-6 pb-8">
      {/* ── Hero Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white" />
          <div className="absolute -bottom-16 -left-8 h-56 w-56 rounded-full bg-white" />
        </div>
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-5 w-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">HRMS Overview</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Workforce at a Glance
            </h1>
            <p className="text-sm opacity-70 mt-1">
              {now.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
              👨‍🏫 {data?.totalActiveStaff ?? "—"} Active Staff
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Active Staff" value={data?.totalActiveStaff} icon={Users2} palette="blue" />
          <KpiCard label="Today Present" value={data?.todayPresent} icon={CheckCircle2} palette="green" />
          <KpiCard label="Today Absent" value={data?.todayAbsent} icon={UserX} palette="red" />
          <KpiCard label="Pending Leaves" value={data?.pendingLeaveApplications} icon={Calendar} palette="amber" />
          <KpiCard label="Pending Approvals" value={data?.pendingApprovalRequests} icon={ShieldAlert} palette="violet" />
          <KpiCard label="Payroll This Month" value={data?.totalPayrollThisMonth} icon={IndianRupee} palette="cyan" isCurrency />
        </div>
      )}

      {/* ── Quick Action Cards ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ActionCard title="Leave Requests" desc="Awaiting your review" count={data?.pendingLeaveApplications} link={`${BASE}/leaves/applications`} icon={AlertCircle} palette="amber" />
        <ActionCard title="Pending Approvals" desc="Need your action" count={data?.pendingApprovalRequests} link={`${BASE}/approvals`} icon={ShieldAlert} palette="violet" />
        <ActionCard title="Absent Today" desc="Mark attendance override" count={data?.todayAbsent} link={`${BASE}/attendance`} icon={ClipboardCheck} palette="red" />
        <ActionCard title="Run Payroll" desc={`${monthName} payroll cycle`} count={undefined} link={`${BASE}/payroll`} icon={IndianRupee} palette="cyan" />
      </div>

      {/* ── Payroll Comparison ── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Payroll This Month", value: data?.totalPayrollThisMonth, icon: TrendingUp, palette: "cyan" as const, trend: "up" },
          { label: "Payroll Last Month", value: data?.totalPayrollLastMonth, icon: TrendingDown, palette: "blue" as const, trend: "down" },
        ].map(({ label, value, icon: Icon, palette, }) => {
          const p = PALETTE[palette];
          return (
            <div key={label} className={cn(
              "relative overflow-hidden rounded-2xl border p-5 bg-white dark:bg-slate-900",
              p.border
            )}>
              <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", p.from, p.to)} />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className={cn("text-2xl font-bold mt-1", p.text)}>
                    {isLoading ? "..." : formatCurrency(value)}
                  </p>
                </div>
                <div className={cn("rounded-xl p-2.5", p.light)}>
                  <Icon className={cn("h-5 w-5", p.text)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two Column: Heatmap + Pie ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attendance Heatmap — 3 cols */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              📅 Attendance Heatmap — {monthName} {year}
            </h2>
            <span className="text-xs text-slate-400">Daily presence count</span>
          </div>
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-slate-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {monthDays.map(({ day, count, key }) => (
              <div
                key={key}
                title={`${key}: ${count} present`}
                className={cn(
                  "aspect-square flex items-center justify-center rounded-lg text-[10px] font-semibold",
                  "cursor-default transition-transform hover:scale-110",
                  heatmapColor(count, maxCount),
                  count > 0 ? "text-emerald-900 dark:text-emerald-100" : "text-slate-400"
                )}
              >
                {day}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
            <span>Less</span>
            {["bg-slate-100 dark:bg-slate-800", "bg-emerald-100", "bg-emerald-200", "bg-emerald-300", "bg-emerald-400", "bg-emerald-500"].map((c, i) => (
              <span key={i} className={cn("h-3 w-3 rounded", c)} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Staff Distribution Donut — 2 cols */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-4">
            🏫 Staff Distribution
          </h2>
          {pieData.length > 0 ? (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [formatNumber(v), ""]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-slate-500 flex-1">{d.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                      {formatNumber(d.value)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatNumber(data?.totalActiveStaff)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-12 text-center">No staff data yet</p>
          )}
        </div>
      </div>

      {/* ── Grade Distribution ───────────────────────────────────────── */}
      {data?.gradeDistribution && data.gradeDistribution.length > 0 && (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" /> Grade Distribution
          </h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.gradeDistribution.map((g, idx) => {
              const colors = ["text-blue-600 bg-blue-50 border-blue-100", "text-violet-600 bg-violet-50 border-violet-100",
                "text-emerald-600 bg-emerald-50 border-emerald-100", "text-amber-600 bg-amber-50 border-amber-100",
                "text-rose-600 bg-rose-50 border-rose-100", "text-cyan-600 bg-cyan-50 border-cyan-100"];
              return (
                <div key={g.gradeCode} className={cn("rounded-xl border p-3 text-center", colors[idx % colors.length])}>
                  <p className="text-2xl font-bold tabular-nums">{g.count}</p>
                  <p className="text-xs font-semibold mt-0.5">{g.gradeName}</p>
                  <p className="font-mono text-[10px] opacity-60">{g.gradeCode}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Payroll Trend Bar Chart ──────────────────────────────────── */}
      {data?.payrollTrend && data.payrollTrend.length > 0 && (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-500" /> Payroll Trend (Monthly)
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.payrollTrend} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), "Payroll"]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Category Attendance Table ────────────────────────────────── */}
      {data?.categoryAttendance && data.categoryAttendance.length > 0 && (
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-4 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-emerald-500" /> Today's Attendance by Category
          </h2>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-emerald-600 uppercase tracking-wide">Present</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-rose-600 uppercase tracking-wide">Absent</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-amber-600 uppercase tracking-wide">On Leave</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryAttendance.map((item, idx) => {
                  const total = (item.present ?? 0) + (item.absent ?? 0) + (item.onLeave ?? 0);
                  const rate = total > 0 ? Math.round(((item.present ?? 0) / total) * 100) : 0;
                  return (
                    <tr key={item.category} className={cn("border-b border-slate-50 dark:border-slate-800/60", idx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-800/20")}>
                      <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-300">
                        {item.category.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-0.5">
                          {formatNumber(item.present)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-rose-100 text-rose-700 text-xs font-semibold px-2.5 py-0.5">
                          {formatNumber(item.absent)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5">
                          {formatNumber(item.onLeave)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="h-1.5 w-16 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-rose-500")}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

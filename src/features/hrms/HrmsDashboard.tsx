import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle, CheckCircle2, IndianRupee, Users2, UserX,
  Calendar, ShieldAlert, ArrowRight, ClipboardCheck, CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import AnimatedCounter from "@/components/shared/AnimatedCounter";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { cn } from "@/lib/utils";

const BASE = "/dashboard/admin/hrms";

function heatmapColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "bg-muted/40";
  const pct = count / max;
  if (pct < 0.25) return "bg-green-200 dark:bg-green-900";
  if (pct < 0.5)  return "bg-green-400 dark:bg-green-700";
  if (pct < 0.75) return "bg-green-600 dark:bg-green-500";
  return "bg-green-800 dark:bg-green-400";
}

export default function HrmsDashboard() {
  const { formatCurrency, formatNumber } = useHrmsFormatters();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "dashboard", "summary"],
    queryFn: () => hrmsService.getDashboardSummary().then((res) => res.data),
  });

  if (isError) {
    return (
      <Card>
        <CardHeader><CardTitle>HRMS Dashboard</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">{normalizeHrmsError(error).message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  // Heatmap: build day entries for current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const heatmapData = data?.currentMonthHeatmap ?? {};
  const maxCount = Math.max(1, ...Object.values(heatmapData));
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return { day: d, key, count: heatmapData[key] ?? 0 };
  });
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  // Category pie
  const pieData = [
    { name: "Teaching", value: data?.totalTeachingStaff ?? 0, color: "#3b82f6" },
    { name: "Admin", value: data?.totalNonTeachingAdmin ?? 0, color: "#8b5cf6" },
    { name: "Support", value: data?.totalNonTeachingSupport ?? 0, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  const kpis = [
    {
      label: "Total Active Staff",
      value: data?.totalActiveStaff ?? 0,
      icon: <Users2 className="h-4 w-4" />,
      color: "#3b82f6",
    },
    {
      label: "Today Present",
      value: data?.todayPresent ?? 0,
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "#22c55e",
    },
    {
      label: "Today Absent",
      value: data?.todayAbsent ?? 0,
      icon: <UserX className="h-4 w-4" />,
      color: "#ef4444",
    },
    {
      label: "Pending Leave Apps",
      value: data?.pendingLeaveApplications ?? 0,
      icon: <Calendar className="h-4 w-4" />,
      color: "#f59e0b",
    },
    {
      label: "Pending Approvals",
      value: data?.pendingApprovalRequests ?? 0,
      icon: <ShieldAlert className="h-4 w-4" />,
      color: "#8b5cf6",
    },
    {
      label: "Payroll This Month",
      value: data?.totalPayrollThisMonth ?? 0,
      icon: <IndianRupee className="h-4 w-4" />,
      color: "#06b6d4",
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HRMS Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your workforce, attendance, and payroll.</p>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <AnimatedCounter
            key={kpi.label}
            label={kpi.label}
            value={isLoading ? 0 : kpi.isCurrency ? 0 : kpi.value}
            icon={kpi.icon}
            color={kpi.color}
          />
        ))}

        {/* Currency card handled separately since AnimatedCounter only does integers */}
        {data && (
          <div className="hidden" /> /* placeholder — currency shown in kpis loop with value=0 */
        )}
      </div>

      {/* Currency KPIs */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Payroll This Month", value: data?.totalPayrollThisMonth, color: "#06b6d4", icon: IndianRupee },
          { label: "Payroll Last Month", value: data?.totalPayrollLastMonth, color: "#94a3b8", icon: CreditCard },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <p className="text-2xl font-semibold tabular-nums" style={{ color }}>
                {isLoading ? "..." : formatCurrency(value)}
              </p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Pending Leave Requests",
            count: data?.pendingLeaveApplications,
            desc: "awaiting review",
            link: `${BASE}/leaves/applications`,
            icon: AlertCircle,
            color: "text-amber-500",
          },
          {
            title: "Pending Approvals",
            count: data?.pendingApprovalRequests,
            desc: "need your action",
            link: `${BASE}/approvals`,
            icon: ShieldAlert,
            color: "text-purple-500",
          },
          {
            title: "Mark Attendance",
            count: data?.todayAbsent,
            desc: "staff absent today",
            link: `${BASE}/attendance`,
            icon: ClipboardCheck,
            color: "text-red-500",
          },
        ].map(({ title, count, desc, link, icon: Icon, color }) => (
          <Card key={title} className="group hover:border-primary/50 transition-colors">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1">
                    <span className={cn("text-2xl font-bold", color)}>
                      {isLoading ? "..." : formatNumber(count)}
                    </span>{" "}
                    <span className="text-xs text-muted-foreground">{desc}</span>
                  </p>
                </div>
                <Icon className={cn("h-5 w-5", color)} />
              </div>
              <Link to={link}>
                <Button variant="ghost" size="sm" className="mt-3 w-full justify-between px-0 h-7 text-xs">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two-column: Heatmap + Pie */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Heatmap */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Attendance — {now.toLocaleString("default", { month: "long" })} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
                <div key={d} className="text-center text-[10px] text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Leading empty cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthDays.map(({ day, count, key }) => (
                <div
                  key={key}
                  title={`${key}: ${count} present`}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded text-[10px] font-medium cursor-default transition-opacity",
                    heatmapColor(count, maxCount)
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              {["bg-muted/40", "bg-green-200 dark:bg-green-900", "bg-green-400 dark:bg-green-700", "bg-green-600 dark:bg-green-500", "bg-green-800 dark:bg-green-400"].map((c, i) => (
                <span key={i} className={cn("h-3 w-3 rounded-sm", c)} />
              ))}
              <span>More</span>
            </div>
          </CardContent>
        </Card>

        {/* Staff Category Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Staff Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [formatNumber(v), ""]}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-muted-foreground flex-1">{d.name}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatNumber(d.value)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t flex justify-between text-xs text-muted-foreground">
                    <span>Total</span>
                    <span className="font-semibold">{formatNumber(data?.totalActiveStaff)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No staff data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      {data?.gradeDistribution && data.gradeDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grade Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
              {data.gradeDistribution.map((g) => (
                <div key={g.gradeCode} className="rounded border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{g.gradeName}</p>
                  <p className="text-xl font-semibold">{g.count}</p>
                  <p className="font-mono text-xs text-muted-foreground">{g.gradeCode}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Trend */}
      {data?.payrollTrend && data.payrollTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payroll Trend (Monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-6">
              {data.payrollTrend.map((t) => (
                <div key={t.month} className="rounded border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{t.month}</p>
                  <p className="text-sm font-semibold">{formatCurrency(t.amount)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Attendance */}
      {data?.categoryAttendance && data.categoryAttendance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Present</th>
                    <th className="px-3 py-2">Absent</th>
                    <th className="px-3 py-2">On Leave</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryAttendance.map((item) => (
                    <tr key={item.category} className="border-t">
                      <td className="px-3 py-2">{item.category.replace(/_/g, " ")}</td>
                      <td className="px-3 py-2">{formatNumber(item.present)}</td>
                      <td className="px-3 py-2">{formatNumber(item.absent)}</td>
                      <td className="px-3 py-2">{formatNumber(item.onLeave)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, IndianRupee, Users2, UserCheck, UserX, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";

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

  const kpis = [
    { label: "Total Active Staff", value: formatNumber(data?.totalActiveStaff), icon: Users2 },
    { label: "With Salary Mapping", value: formatNumber(data?.staffWithSalaryMapping), icon: UserCheck },
    { label: "Without Salary Mapping", value: formatNumber(data?.staffWithoutSalaryMapping), icon: UserX },
    { label: "Pending Leave Apps", value: formatNumber(data?.pendingLeaveApplications), icon: AlertCircle },
    { label: "Payroll This Month", value: formatCurrency(data?.totalPayrollThisMonth), icon: IndianRupee },
    { label: "Payroll Last Month", value: formatCurrency(data?.totalPayrollLastMonth), icon: IndianRupee },
    { label: "Today Present", value: formatNumber(data?.todayPresent), icon: CheckCircle2 },
    { label: "Today Absent", value: formatNumber(data?.todayAbsent), icon: UserX },
    { label: "Today On Leave", value: formatNumber(data?.todayOnLeave), icon: Calendar },
    { label: "Teaching Staff", value: formatNumber(data?.totalTeachingStaff), icon: Users2 },
    { label: "Admin Staff", value: formatNumber(data?.totalNonTeachingAdmin), icon: Users2 },
    { label: "Support Staff", value: formatNumber(data?.totalNonTeachingSupport), icon: Users2 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        {kpis.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-end justify-between">
                <p className="text-2xl font-semibold tracking-tight">{isLoading ? "..." : card.value}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
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
                  <p className="font-mono text-xs">{g.gradeCode}</p>
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

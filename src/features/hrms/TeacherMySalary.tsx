import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService } from "@/services/hrms";
import { cn } from "@/lib/utils";
import type { ComputedSalaryBreakdownDTO } from "@/services/types/hrms";

export default function TeacherMySalary() {
  const { formatCurrency } = useHrmsFormatters();
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = useQuery<ComputedSalaryBreakdownDTO | null>({
    queryKey: ["hrms", "self", "salary-structure"],
    queryFn: async () => {
      try {
        return (await hrmsService.getMySalaryStructure()).data;
      } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 403)) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <Wallet className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <p className="text-base font-semibold text-muted-foreground">No Salary Mapping Found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          You haven't been assigned a salary template yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              💰
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">My Salary Structure</h2>
              <p className="text-sm text-white/70">
                Template:{" "}
                <span className="font-semibold">{data.templateName || "Custom"}</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {data.gradeCode && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                    {data.gradeCode}
                  </span>
                )}
                {data.employeeId && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                    EMP: {data.employeeId}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-xs text-white/70">Net Pay / Month</p>
              <p className="text-3xl font-bold tabular-nums">{formatCurrency(data.netPay)}</p>
            </div>
            <Button
              onClick={() => setDetailOpen(true)}
              className="border border-white/30 bg-white/20 text-sm font-semibold text-white hover:bg-white/30"
            >
              View Full Breakdown →
            </Button>
          </div>
        </div>
      </div>

      {/* KPI strip — identical to Staff360 */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "CTC (Annual)", value: formatCurrency((data.grossPay ?? 0) * 12), color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
          { label: "Gross Pay", value: formatCurrency(data.grossPay), color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Total Deductions", value: formatCurrency(data.totalDeductions), color: "text-red-600", bg: "bg-red-50 border-red-200" },
          { label: "Net Pay / Month", value: formatCurrency(data.netPay), color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className={`border ${bg}`}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("mt-1 text-xl font-bold", color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compact earnings/deductions preview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-600">Earnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.earnings ?? []).map((e) => (
              <div key={e.componentCode}>
                <div className="mb-0.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">{e.componentName}</span>
                  <span className="font-medium">{formatCurrency(e.computedAmount)}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-400"
                    style={{ width: `${Math.min(100, (e.computedAmount / (data.grossPay || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-sm font-semibold">
              <span>Gross Pay</span>
              <span className="text-emerald-600">{formatCurrency(data.grossPay)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">Deductions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data.deductions ?? []).map((d) => (
              <div key={d.componentCode}>
                <div className="mb-0.5 flex justify-between text-sm">
                  <span className="text-muted-foreground">{d.componentName}</span>
                  <span className="font-medium text-red-600">{formatCurrency(d.computedAmount)}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-red-400"
                    style={{ width: `${Math.min(100, (d.computedAmount / (data.grossPay || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-sm font-bold">
              <span>Total Deductions</span>
              <span className="text-red-600">{formatCurrency(data.totalDeductions)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Breakdown Modal */}
      <SalaryDetailModal
        data={data}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function SalaryDetailModal({
  data,
  open,
  onClose,
  formatCurrency,
}: {
  data: ComputedSalaryBreakdownDTO;
  open: boolean;
  onClose: () => void;
  formatCurrency: (n: number) => string;
}) {
  const pieData = [
    { name: "Net Pay", value: data.netPay, fill: "#7c3aed" },
    { name: "Deductions", value: data.totalDeductions, fill: "#ef4444" },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Full Salary Breakdown</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Template: {data.templateName || "Custom"}
            {data.gradeCode && ` · ${data.gradeCode}`}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "CTC (Annual)", value: formatCurrency((data.grossPay ?? 0) * 12), color: "text-blue-600" },
              { label: "Gross Pay", value: formatCurrency(data.grossPay), color: "text-emerald-600" },
              { label: "Total Deductions", value: formatCurrency(data.totalDeductions), color: "text-red-600" },
              { label: "Net Pay / Month", value: formatCurrency(data.netPay), color: "text-violet-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className={cn("mt-0.5 text-sm font-bold", color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Pay Composition Pie + breakdowns */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pay Composition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3} dataKey="value"
                      >
                        <Cell fill="#7c3aed" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-3 grid gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-emerald-600">Earnings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data.earnings ?? []).map((e) => (
                    <div key={e.componentCode}>
                      <div className="mb-0.5 flex justify-between text-sm">
                        <span className="text-muted-foreground">{e.componentName}</span>
                        <span className="font-medium">{formatCurrency(e.computedAmount)}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${Math.min(100, (e.computedAmount / (data.grossPay || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                    <span>Gross Pay</span>
                    <span className="text-emerald-600">{formatCurrency(data.grossPay)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-red-600">Deductions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(data.deductions ?? []).map((d) => (
                    <div key={d.componentCode}>
                      <div className="mb-0.5 flex justify-between text-sm">
                        <span className="text-muted-foreground">{d.componentName}</span>
                        <span className="font-medium text-red-600">{formatCurrency(d.computedAmount)}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{ width: `${Math.min(100, (d.computedAmount / (data.grossPay || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-2 text-sm font-bold">
                    <span>Total Deductions</span>
                    <span className="text-red-600">{formatCurrency(data.totalDeductions)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Net Pay / Month</span>
            <span className="text-violet-700">{formatCurrency(data.netPay)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

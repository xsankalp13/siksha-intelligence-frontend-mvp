import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { AlertTriangle, Banknote, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {} from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { hrmsService } from "@/services/hrms";
import type { ComputedSalaryBreakdownDTO } from "@/services/types/hrms";

export default function TeacherMySalary() {
  const { data, isLoading, isError, error } = useQuery<ComputedSalaryBreakdownDTO | null>({
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
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">
          {axios.isAxiosError(error) ? "Failed to load salary structure" : "An error occurred"}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
        <Wallet className="mx-auto mb-3 h-10 w-10 text-amber-600" />
        <h3 className="text-lg font-semibold">Salary Structure Not Configured</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Your salary structure has not been set up yet. Please contact your administrator or HR department for assistance.
        </p>
      </div>
    );
  }

  const fmt = (n?: number | null) =>
    n != null ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—";

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
                Template: <span className="font-semibold">{data.templateName || "Custom"}</span>
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {data.gradeCode && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">{data.gradeCode}</span>}
                {data.employeeId && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">EMP: {data.employeeId}</span>}
                {data.hasOverrides && <span className="rounded-full bg-amber-400/30 px-2 py-0.5 text-xs font-medium text-amber-100">Has Overrides</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70">Net Pay</p>
            <p className="text-3xl font-bold tabular-nums">{fmt(Number(data.netPay))}</p>
          </div>
        </div>
      </div>

      {/* Earnings & Deductions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Earnings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.earnings ?? []).map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{comp.componentName}</span>
                  <span className="text-sm font-semibold text-emerald-700">{fmt(Number(comp.computedAmount))}</span>
                </div>
              ))}
              {(!data.earnings || data.earnings.length === 0) && (
                <p className="text-sm text-muted-foreground">No earning components</p>
              )}
            </div>
            <div className="mt-3 border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Gross Pay</span>
                <span className="text-sm font-bold text-emerald-600">{fmt(Number(data.grossPay))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data.deductions ?? []).map((comp, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{comp.componentName}</span>
                  <span className="text-sm font-semibold text-red-600">{fmt(Number(comp.computedAmount))}</span>
                </div>
              ))}
              {(!data.deductions || data.deductions.length === 0) && (
                <p className="text-sm text-muted-foreground">No deduction components</p>
              )}
            </div>
            <div className="mt-3 border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total Deductions</span>
                <span className="text-sm font-bold text-red-600">{fmt(Number(data.totalDeductions))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Footer */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SumCard label="Gross Pay" value={fmt(Number(data.grossPay))} icon={Banknote} color="text-emerald-600" />
        <SumCard label="Deductions" value={fmt(Number(data.totalDeductions))} icon={TrendingDown} color="text-red-600" />
        <SumCard label="Net Pay" value={fmt(Number(data.netPay))} icon={Wallet} color="text-primary" />
        {data.ctc && <SumCard label="CTC" value={fmt(Number(data.ctc))} icon={TrendingUp} color="text-indigo-600" />}
      </div>
    </div>
  );
}

function SumCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <Icon className={cn("mx-auto mb-1 h-5 w-5", color)} />
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-base font-bold", color)}>{value}</p>
    </div>
  );
}

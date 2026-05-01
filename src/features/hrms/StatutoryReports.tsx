import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileBarChart, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { PFSummaryReportDTO, ReportType } from "@/services/types/hrms";

const REPORT_LABELS: { type: ReportType; label: string; description: string }[] = [
  {
    type: "pf-summary",
    label: "PF Summary",
    description: "Employee & employer PF contribution by month",
  },
  {
    type: "esi-summary",
    label: "ESI Summary",
    description: "ESI contributions for eligible employees",
  },
  {
    type: "pt-summary",
    label: "Professional Tax",
    description: "State-wise professional tax deductions",
  },
  {
    type: "tds-computation",
    label: "TDS Computation",
    description: "Income tax deduction summary (Form 16 ready)",
  },
  {
    type: "salary-register",
    label: "Salary Register",
    description: "Month-wise salary disbursement register",
  },
  {
    type: "attendance-register",
    label: "Attendance Register",
    description: "Monthly attendance summary by employee",
  },
  {
    type: "leave-register",
    label: "Leave Register",
    description: "Leave taken and balance by employee",
  },
  {
    type: "headcount",
    label: "Headcount",
    description: "Current headcount by department and category",
  },
  {
    type: "attrition",
    label: "Attrition Report",
    description: "Employee turnover and exit analysis",
  },
  {
    type: "compliance-summary",
    label: "Compliance Summary",
    description: "Overall statutory compliance health check",
  },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

function PFSummaryTable({ data }: { data: PFSummaryReportDTO }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="mt-4 overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Employee</th>
            <th className="px-3 py-2 text-left font-medium">UAN</th>
            <th className="px-3 py-2 text-right font-medium">Gross Wages</th>
            <th className="px-3 py-2 text-right font-medium">PF Wages</th>
            <th className="px-3 py-2 text-right font-medium">Employee PF</th>
            <th className="px-3 py-2 text-right font-medium">Employer PF</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">
                <div className="font-medium">{row.staffName}</div>
                <div className="text-xs text-muted-foreground">{row.employeeId}</div>
              </td>
              <td className="px-3 py-2 text-muted-foreground">{row.uan ?? "—"}</td>
              <td className="px-3 py-2 text-right">{fmt(row.grossWages)}</td>
              <td className="px-3 py-2 text-right">{fmt(row.pfWages)}</td>
              <td className="px-3 py-2 text-right">{fmt(row.employeeContribution)}</td>
              <td className="px-3 py-2 text-right">{fmt(row.employerContribution)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/50 font-semibold">
          <tr>
            <td className="px-3 py-2" colSpan={2}>
              Total ({data.rows.length} employees)
            </td>
            <td className="px-3 py-2 text-right">{fmt(data.totals.grossWages)}</td>
            <td className="px-3 py-2 text-right">{fmt(data.totals.pfWages)}</td>
            <td className="px-3 py-2 text-right">{fmt(data.totals.employeeTotal)}</td>
            <td className="px-3 py-2 text-right">{fmt(data.totals.employerTotal)}</td>
          </tr>
          <tr>
            <td className="px-3 py-2 text-primary" colSpan={5}>
              Total Remittance
            </td>
            <td className="px-3 py-2 text-right text-primary">
              {fmt(data.totals.totalRemittance)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function StatutoryReports() {
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  const { data: pfReport, isLoading: loadingPf } = useQuery({
    queryKey: ["hrms", "reports", "pf-summary", selectedYear, selectedMonth],
    queryFn: () =>
      hrmsService
        .downloadReport("pf-summary", {
          year: parseInt(selectedYear),
          month: parseInt(selectedMonth),
        })
        .then((r) => r.data as PFSummaryReportDTO),
    retry: false,
  });

  const downloadMutation = useMutation({
    mutationFn: async ({ type }: { type: ReportType }) => {
      const resp = await hrmsService.downloadReport(
        type,
        {
          year: parseInt(selectedYear),
          month: parseInt(selectedMonth),
        }
      );
      const blob = new Blob([JSON.stringify(resp.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-${selectedYear}-${selectedMonth.padStart(2, "0")}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
            📊
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Statutory Reports</h2>
            <p className="text-sm text-white/70">Generate and download compliance reports for PF, ESI, PT, and TDS</p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Month</p>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Year</p>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_LABELS.map((r) => (
          <Card key={r.type} className="group">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">{r.label}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">{r.description}</p>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={downloadMutation.isPending}
                onClick={() => downloadMutation.mutate({ type: r.type })}
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-2 h-3.5 w-3.5" />
                )}
                Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bank Salary Advice callout */}
      <Card className="border-blue-200 bg-blue-50/60">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm text-blue-800">Bank Salary Advice PDF</CardTitle>
          </div>
          <p className="text-xs text-blue-700">
            The Bank Salary Advice — a formal disbursement statement with staff-wise bank details, gross
            pay, deductions, and net pay for NEFT/RTGS submission — is generated per payroll run. To download
            it, go to the <strong>Payroll</strong> tab, find an APPROVED or DISBURSED run, and click{" "}
            <strong>Bank Advice PDF</strong> in the actions column.
          </p>
        </CardHeader>
      </Card>

      {/* PF Summary Preview */}
      <div>
        <h2 className="text-base font-semibold">PF Summary Preview</h2>
        <p className="text-xs text-muted-foreground">
          {MONTHS[parseInt(selectedMonth) - 1]} {selectedYear}
        </p>
        {loadingPf ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pfReport ? (
          <PFSummaryTable data={pfReport} />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No PF data available for the selected period.
          </p>
        )}
      </div>
    </div>
  );
}

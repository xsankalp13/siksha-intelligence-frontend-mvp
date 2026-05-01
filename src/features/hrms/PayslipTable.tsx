import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DataTable, { type Column } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {} from "@/components/ui/label";
import PayslipViewer from "@/features/hrms/PayslipViewer";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { triggerBlobDownload } from "@/services/idCard";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { PageResponse } from "@/services/types/common";
import type { PayslipSummaryDTO } from "@/services/types/hrms";

export default function PayslipTable() {
  const { formatCurrency } = useHrmsFormatters();
  const [viewerPayslipId, setViewerPayslipId] = useState<string | null>(null);
  const [runIdFilter, setRunIdFilter] = useState<string>("");
  const runId = Number(runIdFilter);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "payroll", "payslips", runId || "all"],
    queryFn: async (): Promise<PageResponse<PayslipSummaryDTO>> => {
      if (runId > 0) {
        return hrmsService.listPayslipsByRun(String(runId), { page: 0, size: 100 }).then((res) => res.data);
      }
      // If no run ID, list from most recent runs
      const runResponse = await hrmsService.listPayrollRuns({ page: 0, size: 1, sort: ["payYear,desc", "payMonth,desc"] });
      const latestRun = runResponse.data.content?.[0];
      if (!latestRun) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 0,
          first: true,
          last: true,
          numberOfElements: 0,
          empty: true,
          sort: { empty: true, sorted: false, unsorted: true },
          pageable: {
            offset: 0,
            sort: { empty: true, sorted: false, unsorted: true },
            paged: true,
            pageNumber: 0,
            pageSize: 0,
            unpaged: false,
          },
        };
      }
      return hrmsService.listPayslipsByRun(latestRun.runUuid ?? String(latestRun.runId), { page: 0, size: 100 }).then((r) => r.data);
    },
  });

  const downloadPayslip = async (row: PayslipSummaryDTO) => {
    try {
      const response = await hrmsService.downloadPayslipPdf(row.uuid ?? String(row.payslipId));
      triggerBlobDownload(response.data, `payslip-${row.payYear}-${String(row.payMonth).padStart(2, "0")}-${row.staffName}.pdf`);
    } catch (downloadError) {
      toast.error(normalizeHrmsError(downloadError).message);
    }
  };

  const columns = useMemo<Column<PayslipSummaryDTO>[]>(
    () => [
      { key: "payslipId", header: "ID", searchable: true },
      { key: "staffName", header: "Staff", searchable: true },
      { key: "employeeId", header: "Employee ID", searchable: true },
      {
        key: "period",
        header: "Period",
        render: (row) => `${String(row.payMonth).padStart(2, "0")}/${row.payYear}`,
      },
      { key: "grossPay", header: "Gross", render: (row) => formatCurrency(row.grossPay) },
      { key: "totalDeductions", header: "Deductions", render: (row) => formatCurrency(row.totalDeductions) },
      { key: "netPay", header: "Net Pay", render: (row) => formatCurrency(row.netPay) },
      {
        key: "status",
        header: "Status",
        render: (row) => <Badge variant={row.status === "DISBURSED" ? "default" : "secondary"}>{row.status}</Badge>,
      },
      {
        key: "viewer",
        header: "View",
        render: (row) => (
          <Button size="sm" variant="outline" onClick={() => setViewerPayslipId(row.uuid)}>
            View
          </Button>
        ),
      },
      {
        key: "download",
        header: "PDF",
        render: (row) => (
          <Button size="sm" variant="outline" onClick={() => void downloadPayslip(row)}>
            Download
          </Button>
        ),
      },
    ],
    [formatCurrency],
  );

  if (isError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm text-destructive">{normalizeHrmsError(error).message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🧾
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Payslips</h2>
              <p className="text-sm text-white/70">View and download individual staff payslips by payroll run</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-white/70">Filter by Run ID</label>
              <Input
                id="payslip-run-filter"
                type="number"
                min={1}
                className="w-[140px] h-8 bg-white/20 border-white/30 text-white placeholder:text-white/50 backdrop-blur-sm"
                value={runIdFilter}
                onChange={(e) => setRunIdFilter(e.target.value)}
                placeholder="Latest"
              />
            </div>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        getRowId={(row) => row.uuid}
        emptyMessage={isLoading ? "Loading payslips..." : "No payslips found."}
      />

      <PayslipViewer
        payslipId={viewerPayslipId}
        open={Boolean(viewerPayslipId)}
        onOpenChange={(open) => { if (!open) setViewerPayslipId(null); }}
      />
    </div>
  );
}

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import DataTable, { type Column } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { triggerBlobDownload } from "@/services/idCard";
import type { PayslipSummaryDTO } from "@/services/types/hrms";

export default function TeacherMyPayslips() {
  const { formatCurrency } = useHrmsFormatters();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "self", "payslips"],
    queryFn: () =>
      hrmsService
        .listMyPayslips({ page: 0, size: 50, sort: ["payYear,desc", "payMonth,desc"] })
        .then((res) => res.data),
  });

  const downloadPayslip = async (row: PayslipSummaryDTO) => {
    try {
      const response = await hrmsService.downloadMyPayslipPdf(row.uuid ?? String(row.payslipId));
      triggerBlobDownload(
        response.data,
        `payslip-${row.payYear}-${String(row.payMonth).padStart(2, "0")}.pdf`,
      );
    } catch (downloadError) {
      toast.error(normalizeHrmsError(downloadError).message);
    }
  };

  const columns = useMemo<Column<PayslipSummaryDTO>[]>(
    () => [
      {
        key: "period",
        header: "Period",
        render: (row) => `${String(row.payMonth).padStart(2, "0")}/${row.payYear}`,
        searchable: true,
      },
      { key: "netPay", header: "Net Pay", render: (row) => formatCurrency(row.netPay) },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge variant={row.status === "DISBURSED" ? "default" : "secondary"}>{row.status}</Badge>
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
    <DataTable
      columns={columns}
      data={data?.content ?? []}
      getRowId={(row) => row.uuid}
      emptyMessage={isLoading ? "Loading payslips..." : "No payslips available."}
    />
  );
}

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { triggerBlobDownload } from "@/services/idCard";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";

interface PayslipViewerProps {
  payslipId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PayslipViewer({ payslipId, open, onOpenChange }: PayslipViewerProps) {
  const { formatCurrency, formatDate } = useHrmsFormatters();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "payslip", "detail", payslipId],
    queryFn: () => hrmsService.getPayslip(payslipId as string).then((res) => res.data),
    enabled: Boolean(payslipId),
  });

  const handleDownload = async () => {
    if (!payslipId) return;
    try {
      const response = await hrmsService.downloadPayslipPdf(payslipId);
      triggerBlobDownload(response.data, `payslip-${payslipId}.pdf`);
    } catch (downloadError) {
      toast.error(normalizeHrmsError(downloadError).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payslip Details</DialogTitle>
          <DialogDescription>
            {data ? `${data.staffName} — ${String(data.payMonth).padStart(2, "0")}/${data.payYear}` : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 p-3">
            <p className="text-sm text-destructive">{normalizeHrmsError(error).message}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Staff Info */}
            <div className="grid gap-1 text-sm">
              <p>Staff: <span className="font-semibold">{isLoading ? "..." : data?.staffName ?? "-"}</span></p>
              <p>Employee ID: <span className="font-semibold">{isLoading ? "..." : data?.employeeId ?? "-"}</span></p>
              {data?.gradeCode && <p>Grade: <span className="font-semibold">{data.gradeCode} — {data.gradeName}</span></p>}
              <p>Period: <span className="font-semibold">{isLoading ? "..." : `${String(data?.payMonth ?? 0).padStart(2, "0")}/${data?.payYear ?? "-"}`}</span></p>
              <p>Generated: <span className="font-semibold">{isLoading ? "..." : formatDate(data?.generatedAt)}</span></p>
              <p>Status: <span className="font-semibold">{isLoading ? "..." : data?.status ?? "-"}</span></p>
            </div>

            {/* Attendance Metrics */}
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">Attendance Metrics (Server-computed)</p>
              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <p>Working Days: <span className="font-semibold">{data?.totalWorkingDays ?? "-"}</span></p>
                <p>Present: <span className="font-semibold">{data?.daysPresent ?? "-"}</span></p>
                <p>Absent: <span className="font-semibold">{data?.daysAbsent ?? "-"}</span></p>
                <p>LOP Days: <span className="font-semibold">{data?.lopDays ?? "-"}</span></p>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <p className="mb-1 text-sm font-medium">Salary Line Items</p>
              <div className="space-y-1 text-sm">
                {(data?.lineItems ?? []).map((item) => (
                  <div key={item.componentCode} className="flex justify-between rounded border px-3 py-1.5">
                    <span>{item.componentName}</span>
                    <span className="font-semibold">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="grid gap-1 rounded-lg border bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span>Gross Pay</span>
                <span className="font-semibold">{formatCurrency(data?.grossPay)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Deductions</span>
                <span className="font-semibold text-destructive">−{formatCurrency(data?.totalDeductions)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 text-base">
                <span className="font-semibold">Net Pay</span>
                <span className="font-bold">{formatCurrency(data?.netPay)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleDownload} disabled={!payslipId}>
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

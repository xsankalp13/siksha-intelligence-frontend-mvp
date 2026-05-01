import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, IndianRupee, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import EmptyState from "@/features/hrms/components/EmptyState";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { triggerBlobDownload } from "@/services/idCard";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { cn } from "@/lib/utils";
import type { PayslipDetailDTO, PayslipSummaryDTO, PayrollStatus } from "@/services/types/hrms";

const STATUS_BG: Partial<Record<PayrollStatus, string>> = {
  PROCESSED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-300",
  DISBURSED: "bg-violet-100 text-violet-700 border-violet-300",
  DRAFT: "bg-gray-100 text-gray-600 border-gray-200",
  PROCESSING: "bg-amber-100 text-amber-700 border-amber-300",
  FAILED: "bg-red-100 text-red-700 border-red-300",
  VOIDED: "bg-red-100 text-red-700 border-red-300",
};

function PayslipDetailModal({
  payslip,
  onClose,
  formatCurrency,
}: {
  payslip: PayslipSummaryDTO | null;
  onClose: () => void;
  formatCurrency: (n: number) => string;
}) {
  const { data: detail, isLoading } = useQuery<PayslipDetailDTO>({
    queryKey: ["hrms", "self", "payslips", payslip?.uuid],
    queryFn: () => hrmsService.getMyPayslip(payslip!.uuid).then((r) => r.data),
    enabled: !!payslip,
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!payslip) return;
      const res = await hrmsService.downloadMyPayslipPdf(payslip.uuid);
      return { blob: res.data, name: `payslip-${payslip.payYear}-${String(payslip.payMonth).padStart(2, "0")}.pdf` };
    },
    onSuccess: (result) => {
      if (result) triggerBlobDownload(result.blob, result.name);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  if (!payslip) return null;

  const monthLabel = new Date(payslip.payYear, payslip.payMonth - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const earningItems = (detail?.lineItems ?? []).filter((li) => li.amount >= 0);
  const deductionItems = (detail?.lineItems ?? []).filter((li) => li.amount < 0);

  return (
    <Dialog open={!!payslip} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{monthLabel} Payslip</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {payslip.staffName}
            {payslip.employeeId ? ` · EMP: ${payslip.employeeId}` : ""}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Gross Pay", value: formatCurrency(payslip.grossPay), color: "text-emerald-600" },
                { label: "Total Deductions", value: formatCurrency(payslip.totalDeductions), color: "text-red-600" },
                { label: "Net Pay", value: formatCurrency(payslip.netPay), color: "text-violet-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg bg-muted/40 p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className={cn("mt-0.5 text-sm font-bold", color)}>{value}</p>
                </div>
              ))}
            </div>

            {detail && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Working Days", value: detail.totalWorkingDays },
                  { label: "Days Present", value: detail.daysPresent },
                  { label: "Days Absent", value: detail.daysAbsent },
                  { label: "LOP Days", value: detail.lopDays },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg bg-muted/30 p-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-0.5 text-sm font-bold">{value}</p>
                  </div>
                ))}
              </div>
            )}

            {detail && earningItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-semibold text-emerald-600">Earnings</p>
                  <div className="space-y-1.5">
                    {earningItems.map((li) => (
                      <div key={li.componentCode} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{li.componentName}</span>
                        <span className="font-medium">{formatCurrency(li.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1.5 text-sm font-semibold">
                      <span>Gross Pay</span>
                      <span className="text-emerald-600">{formatCurrency(payslip.grossPay)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {detail && deductionItems.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="mb-2 text-sm font-semibold text-red-600">Deductions</p>
                  <div className="space-y-1.5">
                    {deductionItems.map((li) => (
                      <div key={li.componentCode} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{li.componentName}</span>
                        <span className="font-medium text-red-600">{formatCurrency(Math.abs(li.amount))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1.5 text-sm font-bold">
                      <span>Total Deductions</span>
                      <span className="text-red-600">{formatCurrency(payslip.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Net Pay</span>
              <span className="text-violet-700">{formatCurrency(payslip.netPay)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            disabled={downloadMutation.isPending}
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={() => downloadMutation.mutate()}
          >
            {downloadMutation.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-1.5 h-4 w-4" />
            )}
            Download PDF
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeacherMyPayslips() {
  const { formatCurrency } = useHrmsFormatters();
  const [selected, setSelected] = useState<PayslipSummaryDTO | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hrms", "self", "payslips"],
    queryFn: () =>
      hrmsService
        .listMyPayslips({ page: 0, size: 50, sort: ["payYear,desc", "payMonth,desc"] })
        .then((res) => res.data),
  });

  const payslips: PayslipSummaryDTO[] = data?.content ?? [];
  const latest = payslips[0];

  const downloadMutation = useMutation({
    mutationFn: async (row: PayslipSummaryDTO) => {
      const res = await hrmsService.downloadMyPayslipPdf(row.uuid);
      return {
        blob: res.data,
        name: `payslip-${row.payYear}-${String(row.payMonth).padStart(2, "0")}.pdf`,
      };
    },
    onSuccess: ({ blob, name }) => triggerBlobDownload(blob, name),
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
            🧾
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">My Payslips</h2>
            <p className="text-sm text-white/70">Download and view your monthly salary slips</p>
          </div>
        </div>
      </div>

      {payslips.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Total Payslips", value: String(payslips.length), color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Latest Gross Pay", value: latest ? formatCurrency(latest.grossPay) : "—", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Latest Net Pay", value: latest ? formatCurrency(latest.netPay) : "—", color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
          ].map(({ label, value, color, bg }) => (
            <Card key={label} className={`border ${bg}`}>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("mt-1 text-xl font-bold", color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : payslips.length === 0 ? (
        <EmptyState
          icon={IndianRupee}
          title="No payslips yet"
          description="Payslips will appear here once your school processes payroll."
        />
      ) : (
        <div className="space-y-2">
          {payslips.map((p) => {
            const monthLabel = new Date(p.payYear, p.payMonth - 1).toLocaleString("en-IN", {
              month: "long",
              year: "numeric",
            });
            const badgeCls = STATUS_BG[p.status] ?? "bg-gray-100 text-gray-600 border-gray-200";
            return (
              <div
                key={p.uuid}
                className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{monthLabel}</p>
                  <p className="text-xs text-muted-foreground">Gross: {formatCurrency(p.grossPay)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(p.netPay)}</p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", badgeCls)}>
                      {p.status}
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => setSelected(p)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloadMutation.isPending}
                      onClick={() => downloadMutation.mutate(p)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PayslipDetailModal
        payslip={selected}
        onClose={() => setSelected(null)}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

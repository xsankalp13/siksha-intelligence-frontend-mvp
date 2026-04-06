import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import DataTable, { type Column } from "@/components/common/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StatusTimeline from "@/features/hrms/components/StatusTimeline";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { useAppSelector } from "@/store/hooks";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { PayrollRunCreateDTO, PayrollRunResponseDTO, PayrollStatus } from "@/services/types/hrms";

const now = new Date();

const statusColor: Record<PayrollStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PROCESSED: "secondary",
  APPROVED: "default",
  DISBURSED: "default",
};

type PayrollReviewTarget =
  | { action: "approve"; run: PayrollRunResponseDTO }
  | { action: "disburse"; run: PayrollRunResponseDTO };

export default function PayrollProcessing() {
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<PayrollReviewTarget | null>(null);
  const [form, setForm] = useState<PayrollRunCreateDTO>({
    payMonth: now.getMonth() + 1,
    payYear: now.getFullYear(),
    remarks: "",
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "payroll", "runs"],
    queryFn: () =>
      hrmsService
        .listPayrollRuns({ page: 0, size: 100, sort: ["payYear,desc", "payMonth,desc"] })
        .then((res) => res.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrms", "payroll", "runs"] });

  const normalizeRole = (role: string): string => {
    const upper = role.toUpperCase().trim();
    return upper.startsWith("ROLE_") ? upper.substring(5) : upper;
  };

  const canManagePayroll = roles
    .map(normalizeRole)
    .some((role) => role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN" || role === "ADMIN");

  const createMutation = useMutation({
    mutationFn: (payload: PayrollRunCreateDTO) => hrmsService.createPayrollRun(payload),
    onSuccess: () => {
      toast.success("Payroll run created & processed");
      setCreateError(null);
      setIsProcessDialogOpen(false);
      refresh();
    },
    onError: (mutationError) => {
      const normalized = normalizeHrmsError(mutationError);
      setCreateError(normalized.message);
      toast.error(normalized.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (runUuid: string) => hrmsService.approvePayrollRun(runUuid),
    onSuccess: () => {
      toast.success("Payroll run approved");
      setReviewTarget(null);
      refresh();
    },
    onError: (mutationError) => toast.error(normalizeHrmsError(mutationError).message),
  });

  const disburseMutation = useMutation({
    mutationFn: (runUuid: string) => hrmsService.disbursePayrollRun(runUuid),
    onSuccess: () => {
      toast.success("Payroll run disbursed");
      setReviewTarget(null);
      refresh();
    },
    onError: (mutationError) => toast.error(normalizeHrmsError(mutationError).message),
  });

  const columns = useMemo<Column<PayrollRunResponseDTO>[]>(
    () => [
      { key: "runId", header: "Run ID", searchable: true },
      {
        key: "period",
        header: "Period",
        render: (row) => `${String(row.payMonth).padStart(2, "0")}/${row.payYear}`,
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <Badge variant={statusColor[row.status] ?? "secondary"}>{row.status}</Badge>
        ),
      },
      { key: "totalStaff", header: "Staff", render: (row) => row.totalStaff ?? "-" },
      {
        key: "totalGross",
        header: "Gross",
        render: (row) => formatCurrency(row.totalGross),
      },
      {
        key: "totalDeductions",
        header: "Deductions",
        render: (row) => formatCurrency(row.totalDeductions),
      },
      {
        key: "totalNet",
        header: "Net Pay",
        render: (row) => formatCurrency(row.totalNet),
      },
      {
        key: "processedOn",
        header: "Processed",
        render: (row) => formatDate(row.processedOn),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={
                !canManagePayroll ||
                row.status !== "PROCESSED" ||
                approveMutation.isPending
              }
              onClick={() => setReviewTarget({ action: "approve", run: row })}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                !canManagePayroll ||
                row.status !== "APPROVED" ||
                disburseMutation.isPending
              }
              onClick={() => setReviewTarget({ action: "disburse", run: row })}
            >
              Disburse
            </Button>
          </div>
        ),
      },
    ],
    [approveMutation.isPending, canManagePayroll, disburseMutation.isPending, formatCurrency, formatDate],
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
      <div className="space-y-3 rounded-lg border p-4">
        <h3 className="text-base font-semibold">Create Payroll Run</h3>

        {!canManagePayroll && (
          <p className="text-sm text-muted-foreground">
            You can view payroll runs, but run/approve/disburse actions are restricted for your
            role.
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-4 md:items-end">
          <div className="grid gap-2">
            <Label htmlFor="payroll-month">Month</Label>
            <Input
              id="payroll-month"
              type="number"
              min={1}
              max={12}
              value={form.payMonth}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, payMonth: Number(e.target.value || 1) }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payroll-year">Year</Label>
            <Input
              id="payroll-year"
              type="number"
              min={2000}
              max={2100}
              value={form.payYear}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  payYear: Number(e.target.value || now.getFullYear()),
                }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payroll-remarks">Remarks</Label>
            <Textarea
              id="payroll-remarks"
              value={form.remarks ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
              placeholder="Optional notes"
              className="min-h-[38px]"
            />
          </div>
          <Button
            onClick={() => setIsProcessDialogOpen(true)}
            disabled={
              !canManagePayroll ||
              createMutation.isPending ||
              form.payMonth < 1 ||
              form.payMonth > 12 ||
              form.payYear < 2000
            }
          >
            Run Payroll
          </Button>
        </div>

        {createError && (
          <div className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">{createError}</p>
            <p className="text-xs text-muted-foreground">
              Attendance policy check: verify attendance completeness, leave approvals, and staff
              mappings for the selected period.
            </p>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        getRowId={(row) => row.runUuid}
        emptyMessage={isLoading ? "Loading payroll runs..." : "No payroll runs found."}
      />

      <ReviewDialog
        open={isProcessDialogOpen}
        onOpenChange={setIsProcessDialogOpen}
        title="Run Payroll For Selected Period?"
        description={`This will process payroll for ${String(form.payMonth).padStart(2, "0")}/${form.payYear}.`}
        severity="warning"
        confirmLabel="Run Payroll"
        isPending={createMutation.isPending}
        requireCheckbox
        checkboxLabel="I have verified attendance, mappings, and financial totals for this run."
        onConfirm={() => createMutation.mutate(form)}
      >
        <div className="space-y-3 text-sm">
          <StatusTimeline
            steps={[
              { label: "Process", status: "current" },
              { label: "Approve", status: "pending" },
              { label: "Disburse", status: "pending" },
            ]}
          />
          <p>
            Period: <span className="font-medium">{String(form.payMonth).padStart(2, "0")}/{form.payYear}</span>
          </p>
          <p>
            Remarks: <span className="font-medium">{form.remarks?.trim() || "-"}</span>
          </p>
        </div>
      </ReviewDialog>

      <ReviewDialog
        open={reviewTarget?.action === "approve"}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        title="Approve Payroll Run?"
        description={
          reviewTarget?.action === "approve"
            ? `Run #${reviewTarget.run.runId} for ${String(reviewTarget.run.payMonth).padStart(2, "0")}/${reviewTarget.run.payYear}.`
            : undefined
        }
        severity="warning"
        confirmLabel="Approve"
        isPending={approveMutation.isPending}
        requireCheckbox
        checkboxLabel="I have reviewed the totals and authorize this payroll run for approval."
        onConfirm={() => {
          if (reviewTarget?.action !== "approve") return;
          approveMutation.mutate(reviewTarget.run.runUuid);
        }}
      >
        <div className="space-y-2 text-sm">
          {reviewTarget?.action === "approve" && (
            <StatusTimeline
              steps={[
                {
                  label: "Processed",
                  status: "completed",
                  date: formatDate(reviewTarget.run.processedOn),
                },
                { label: "Approve", status: "current" },
                { label: "Disburse", status: "pending" },
              ]}
            />
          )}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <tbody>
                <tr className="border-b">
                  <th className="bg-muted/40 px-3 py-2 font-medium">Run ID</th>
                  <td className="px-3 py-2">{reviewTarget?.action === "approve" ? reviewTarget.run.runId : "-"}</td>
                </tr>
                <tr className="border-b">
                  <th className="bg-muted/40 px-3 py-2 font-medium">Staff Count</th>
                  <td className="px-3 py-2">{reviewTarget?.action === "approve" ? reviewTarget.run.totalStaff : "-"}</td>
                </tr>
                <tr className="border-b">
                  <th className="bg-muted/40 px-3 py-2 font-medium">Gross</th>
                  <td className="px-3 py-2">{reviewTarget?.action === "approve" ? formatCurrency(reviewTarget.run.totalGross) : "-"}</td>
                </tr>
                <tr className="border-b">
                  <th className="bg-muted/40 px-3 py-2 font-medium">Deductions</th>
                  <td className="px-3 py-2">{reviewTarget?.action === "approve" ? formatCurrency(reviewTarget.run.totalDeductions) : "-"}</td>
                </tr>
                <tr>
                  <th className="bg-muted/40 px-3 py-2 font-medium">Net Pay</th>
                  <td className="px-3 py-2">{reviewTarget?.action === "approve" ? formatCurrency(reviewTarget.run.totalNet) : "-"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ReviewDialog>

      <ReviewDialog
        open={reviewTarget?.action === "disburse"}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        title="Disburse Payroll Run?"
        description={
          reviewTarget?.action === "disburse"
            ? `Run #${reviewTarget.run.runId} for ${String(reviewTarget.run.payMonth).padStart(2, "0")}/${reviewTarget.run.payYear}.`
            : undefined
        }
        severity="danger"
        confirmLabel="Disburse"
        isPending={disburseMutation.isPending}
        requireCheckbox
        checkboxLabel="I confirm payment instructions are final and funds are ready for disbursement."
        requireTypeConfirm="DISBURSE"
        typeConfirmLabel={'Type "DISBURSE" to confirm final payout action:'}
        onConfirm={() => {
          if (reviewTarget?.action !== "disburse") return;
          disburseMutation.mutate(reviewTarget.run.runUuid);
        }}
      >
        <div className="space-y-3 text-sm">
          {reviewTarget?.action === "disburse" && (
            <StatusTimeline
              steps={[
                {
                  label: "Processed",
                  status: "completed",
                  date: formatDate(reviewTarget.run.processedOn),
                },
                { label: "Approved", status: "completed" },
                { label: "Disburse", status: "current" },
              ]}
            />
          )}
          <p>
            Run ID: <span className="font-medium">{reviewTarget?.action === "disburse" ? reviewTarget.run.runId : "-"}</span>
          </p>
          <p>
            Staff: <span className="font-medium">{reviewTarget?.action === "disburse" ? reviewTarget.run.totalStaff : "-"}</span>
          </p>
          <p>
            Total Net: <span className="font-medium">{reviewTarget?.action === "disburse" ? formatCurrency(reviewTarget.run.totalNet) : "-"}</span>
          </p>
        </div>
      </ReviewDialog>
    </div>
  );
}

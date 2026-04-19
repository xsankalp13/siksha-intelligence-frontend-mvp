import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { LoanRepaymentRecordDTO, LoanStatus, StaffLoanDTO } from "@/services/types/hrms";
import { triggerBlobDownload } from "@/services/idCard";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  PENDING: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  APPROVED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  DISBURSED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  ACTIVE: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function computeEmi(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0) return 0;
  if (annualRatePct <= 0) return Math.round((principal / months) * 100) / 100;

  const r = annualRatePct / 100 / 12;
  const pow = Math.pow(1 + r, months);
  const emi = (principal * r * pow) / (pow - 1);
  return Math.round(emi * 100) / 100;
}

interface ScheduleRow {
  month: number;
  year: number;
  emi: number;
  balance: number;
}

function buildSchedulePreview(
  principal: number,
  annualRatePct: number,
  months: number,
  disbursedAt: string,
): ScheduleRow[] {
  if (!disbursedAt || months <= 0) return [];

  const emi = computeEmi(principal, annualRatePct, months);
  const monthlyRate = annualRatePct > 0 ? annualRatePct / 100 / 12 : 0;
  const base = new Date(disbursedAt + "T00:00:00");

  let balance = principal;
  const rows: ScheduleRow[] = [];

  for (let i = 1; i <= months; i++) {
    const scheduleDate = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const interest = Math.round(balance * monthlyRate * 100) / 100;
    const principalPart = Math.round((emi - interest) * 100) / 100;
    balance = Math.max(0, Math.round((balance - principalPart) * 100) / 100);

    rows.push({
      month: scheduleDate.getMonth() + 1,
      year: scheduleDate.getFullYear(),
      emi,
      balance,
    });
  }

  return rows;
}

interface CreateFormState {
  staffRef: string | null;
  loanType: string;
  principalAmount: string;
  emiCount: string;
  interestRate: string;
}

function LoanRepaymentView({ loan }: { loan: StaffLoanDTO }) {
  const { formatCurrency } = useHrmsFormatters();

  const { data: repayments = [], isLoading } = useQuery({
    queryKey: ["hrms", "loans", loan.uuid, "repayments"],
    queryFn: () => hrmsService.getLoanRepayments(loan.uuid).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  const sorted = [...repayments].sort((a, b) => {
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return aTime - bTime;
  });
  const paidCount = sorted.filter((r) => r.status === "DEDUCTED").length;

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-1.5 pr-3 font-medium">#</th>
            <th className="pb-1.5 pr-3 font-medium">Month</th>
            <th className="pb-1.5 pr-3 text-right font-medium">EMI Amount</th>
            <th className="pb-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr key={row.uuid} className="border-b last:border-0">
              <td className="py-1 pr-3 text-muted-foreground">{idx + 1}</td>
              <td className="py-1 pr-3">{row.dueDate ? new Date(row.dueDate + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "-"}</td>
              <td className="py-1 pr-3 text-right font-medium">{formatCurrency(row.amount)}</td>
              <td className="py-1">
                <Badge
                  variant="secondary"
                  className={
                    row.status === "DEDUCTED"
                      ? "bg-green-100 text-green-800"
                      : row.status === "SCHEDULED"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                  }
                >
                  {row.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t font-medium">
            <td colSpan={2} className="pt-1.5 text-muted-foreground">Total</td>
            <td className="pt-1.5 text-right">
              {formatCurrency(sorted.reduce((sum, row) => sum + (row.amount ?? 0), 0))}
            </td>
            <td className="pt-1.5 text-muted-foreground">{paidCount}/{sorted.length} paid</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function LoanManagement() {
  const qc = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();

  const [createOpen, setCreateOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<StaffLoanDTO | null>(null);
  const [rejectTarget, setRejectTarget] = useState<StaffLoanDTO | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateFormState>({
    staffRef: null,
    loanType: "",
    principalAmount: "",
    emiCount: "12",
    interestRate: "",
  });

  const [disbursedAt, setDisbursedAt] = useState(() => new Date().toISOString().substring(0, 10));
  const [approveRemarks, setApproveRemarks] = useState("");
  const [rejectRemarks, setRejectRemarks] = useState("");

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["hrms", "loans"],
    queryFn: () => hrmsService.listLoans().then((r) => r.data),
  });

  const schedulePreview = useMemo(() => {
    if (!approveTarget) return [];
    const principal = approveTarget.approvedAmount ?? approveTarget.principalAmount ?? 0;
    const months = approveTarget.emiCount ?? 12;
    const rate = approveTarget.interestRate ?? 0;
    return buildSchedulePreview(principal, rate, months, disbursedAt);
  }, [approveTarget, disbursedAt]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!createForm.staffRef || !createForm.principalAmount || !createForm.loanType)
        throw new Error("Staff, amount, and loan type are required.");
      return hrmsService.createLoan({
        staffRef: createForm.staffRef,
        loanType: createForm.loanType,
        principalAmount: parseFloat(createForm.principalAmount),
        emiCount: parseInt(createForm.emiCount) || 12,
        interestRate: createForm.interestRate ? parseFloat(createForm.interestRate) : undefined,
      });
    },
    onSuccess: () => {
      toast.success("Loan application created");
      qc.invalidateQueries({ queryKey: ["hrms", "loans"] });
      setCreateOpen(false);
      setCreateForm({ staffRef: null, loanType: "", principalAmount: "", emiCount: "12", interestRate: "" });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const approveMutation = useMutation({
    mutationFn: (loan: StaffLoanDTO) => {
      const principal = loan.approvedAmount ?? loan.principalAmount ?? 0;
      const months = loan.emiCount ?? 12;
      const annualRate = loan.interestRate ?? 0;
      const emiAmount = computeEmi(principal, annualRate, months);

      return hrmsService.approveLoan(loan.uuid, {
        status: "DISBURSED",
        approvedAmount: principal,
        emiAmount,
        emiCount: months,
        disbursedAt,
        remarks: approveRemarks || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Loan approved and disbursed. Repayment schedule generated.");
      qc.invalidateQueries({ queryKey: ["hrms", "loans"] });
      setApproveTarget(null);
      setApproveRemarks("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const loanDocMutation = useMutation({
    mutationFn: async (loan: StaffLoanDTO) => {
      const response = await hrmsService.downloadLoanDocument(loan.uuid);
      return { loan, blob: response.data };
    },
    onSuccess: ({ loan, blob }) => {
      const safeName = (loan.staffName ?? "staff").replace(/\s+/g, "-").toLowerCase();
      triggerBlobDownload(blob, `loan-sanction-letter-${safeName}.pdf`);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const rejectMutation = useMutation({
    mutationFn: (loanId: string) => hrmsService.rejectLoan(loanId, rejectRemarks),
    onSuccess: () => {
      toast.success("Loan rejected");
      qc.invalidateQueries({ queryKey: ["hrms", "loans"] });
      setRejectTarget(null);
      setRejectRemarks("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const active = loans.filter((l: StaffLoanDTO) =>
    ["PENDING", "APPROVED", "DISBURSED", "ACTIVE"].includes(l.status),
  );
  const closed = loans.filter((l: StaffLoanDTO) =>
    ["CLOSED", "REJECTED"].includes(l.status),
  );

  const renderLoan = (loan: StaffLoanDTO) => {
    const showSchedule = ["DISBURSED", "ACTIVE", "CLOSED"].includes(loan.status);
    const totalEmis = loan.emiCount ?? 0;
    const paidEmis = showSchedule && loan.emiCount && loan.remainingEmis != null
      ? loan.emiCount - loan.remainingEmis
      : 0;

    return (
      <Card key={loan.uuid}>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{loan.staffName}</CardTitle>
                <Badge variant="outline" className="text-xs">{loan.loanType}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(loan.principalAmount)} · {loan.createdAt ? formatDate(loan.createdAt) : ""}
              </p>
              <Badge variant="secondary" className={LOAN_STATUS_COLORS[loan.status]}>
                {loan.status}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {loan.status === "PENDING" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => {
                      setApproveTarget(loan);
                      setDisbursedAt(new Date().toISOString().substring(0, 10));
                      setApproveRemarks("");
                    }}
                  >
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setRejectTarget(loan);
                      setRejectRemarks("");
                    }}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Reject
                  </Button>
                </>
              )}

              {loan.status === "APPROVED" && (
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => {
                    setApproveTarget(loan);
                    setDisbursedAt(new Date().toISOString().substring(0, 10));
                    setApproveRemarks("");
                  }}
                >
                  <Banknote className="mr-1.5 h-3.5 w-3.5" />
                  Disburse
                </Button>
              )}

              {showSchedule && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedLoan((prev) => (prev === loan.uuid ? null : loan.uuid))}
                  >
                    {expandedLoan === loan.uuid ? "Hide Schedule" : "View Schedule"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loanDocMutation.isPending}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => loanDocMutation.mutate(loan)}
                  >
                    {loanDocMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Loan Document
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        {showSchedule && (
          <CardContent className="pb-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Repayment Progress</span>
                <span>{paidEmis}/{totalEmis} EMIs</span>
              </div>
              <Progress value={(paidEmis / Math.max(totalEmis, 1)) * 100} className="h-1.5" />
            </div>

            {loan.emiAmount && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                EMI: {formatCurrency(loan.emiAmount)} · {loan.interestRate != null ? `${loan.interestRate}% p.a.` : "No interest"}
              </p>
            )}

            {expandedLoan === loan.uuid && (
              <>
                <Separator className="my-2" />
                <LoanRepaymentView loan={loan} />
              </>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  const approvePrincipal = approveTarget?.approvedAmount ?? approveTarget?.principalAmount ?? 0;
  const approveMonths = approveTarget?.emiCount ?? 0;
  const approveRate = approveTarget?.interestRate ?? 0;
  const previewEmi = schedulePreview[0]?.emi ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loan Management</h1>
          <p className="text-sm text-muted-foreground">Manage staff loan applications and repayment schedules</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Loan Application
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active
            {active.length > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 text-xs" variant="secondary">
                {active.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="closed">Closed / Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : active.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No active loans"
              description="No loan applications pending or active at the moment."
              actionLabel="New Application"
              onAction={() => setCreateOpen(true)}
            />
          ) : (
            active.map(renderLoan)
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4 space-y-3">
          {closed.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No closed loans"
              description="Completed and rejected loan records will appear here."
            />
          ) : (
            closed.map(renderLoan)
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Loan Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <StaffSearchSelect
              value={createForm.staffRef}
              onChange={(uuid) => setCreateForm((prev) => ({ ...prev, staffRef: uuid }))}
              label="Staff Member"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Loan Type <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={createForm.loanType}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, loanType: e.target.value }))}
                  placeholder="e.g. Personal, Medical"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={createForm.principalAmount}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, principalAmount: e.target.value }))}
                  placeholder="50000"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Number of EMIs</Label>
              <Input
                type="number"
                min={1}
                value={createForm.emiCount}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, emiCount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Interest Rate (% p.a.)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={createForm.interestRate}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, interestRate: e.target.value }))}
                placeholder="e.g. 12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={
                createMutation.isPending ||
                !createForm.staffRef ||
                !createForm.principalAmount ||
                !createForm.loanType
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {approveTarget?.status === "APPROVED" ? "Disburse Loan" : "Approve Loan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 px-3 py-2.5">
              <p className="text-sm font-medium">
                {approveTarget?.staffName} · {formatCurrency(approveTarget?.principalAmount ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                EMI schedule below is auto-generated from principal, interest rate, and EMI count provided at application time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded border bg-muted/30 px-2.5 py-2 text-xs">
                <p className="text-muted-foreground">Principal</p>
                <p className="font-semibold">{formatCurrency(approvePrincipal)}</p>
              </div>
              <div className="rounded border bg-muted/30 px-2.5 py-2 text-xs">
                <p className="text-muted-foreground">Interest</p>
                <p className="font-semibold">{approveRate}% p.a.</p>
              </div>
              <div className="rounded border bg-muted/30 px-2.5 py-2 text-xs">
                <p className="text-muted-foreground">Total EMIs</p>
                <p className="font-semibold">{approveMonths}</p>
              </div>
              <div className="rounded border bg-muted/30 px-2.5 py-2 text-xs">
                <p className="text-muted-foreground">Monthly EMI</p>
                <p className="font-semibold">{formatCurrency(previewEmi)}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Disbursement Date</Label>
              <Input
                type="date"
                value={disbursedAt}
                onChange={(e) => setDisbursedAt(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Input
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                placeholder="Optional approval remarks"
              />
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Repayment Schedule Preview
              </p>
              <div className="max-h-56 overflow-y-auto rounded border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 text-right font-medium">EMI Amount</th>
                      <th className="px-3 py-2 text-right font-medium">Balance After EMI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedulePreview.map((row, idx) => (
                      <tr key={`${row.year}-${row.month}-${idx}`} className="border-t">
                        <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-1.5">{MONTH_NAMES[row.month - 1]} {row.year}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{formatCurrency(row.emi)}</td>
                        <td className="px-3 py-1.5 text-right text-muted-foreground">{formatCurrency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button
              disabled={approveMutation.isPending || !approveTarget || !disbursedAt}
              onClick={() => approveTarget && approveMutation.mutate(approveTarget)}
            >
              {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {approveTarget?.status === "APPROVED" ? "Confirm Disbursement" : "Approve & Disburse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReviewDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject Loan Application"
        description={`Reject loan application for ${rejectTarget?.staffName}?`}
        severity="danger"
        confirmLabel="Reject"
        onConfirm={() => rejectTarget && rejectMutation.mutate(rejectTarget.uuid)}
        isPending={rejectMutation.isPending}
      >
        <div className="space-y-1.5">
          <Label>
            Rejection Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            placeholder="Reason for rejection..."
            rows={2}
          />
        </div>
      </ReviewDialog>
    </div>
  );
}

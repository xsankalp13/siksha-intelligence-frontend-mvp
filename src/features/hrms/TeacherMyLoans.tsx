import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CreditCard, FileText, IndianRupee, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/features/hrms/components/EmptyState";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { triggerBlobDownload } from "@/services/idCard";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { cn } from "@/lib/utils";
import type { LoanRepaymentRecordDTO, StaffLoanDTO } from "@/services/types/hrms";


const ACCENT_BAR: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  DISBURSED: "bg-green-500",
  APPROVED: "bg-blue-500",
  CLOSED: "bg-gray-300",
  PENDING: "bg-amber-400",
  REJECTED: "bg-red-400",
  CANCELLED: "bg-slate-400",
};

const BADGE_BORDER: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-300",
  DISBURSED: "bg-green-100 text-green-700 border-green-300",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-300",
  CLOSED: "bg-gray-100 text-gray-600 border-gray-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-300",
  REJECTED: "bg-red-100 text-red-700 border-red-300",
  CANCELLED: "bg-red-100 text-red-700 border-red-300",
};

interface LoanFormState {
  loanType: string;
  principalAmount: string;
  emiCount: string;
  interestRate: string;
  reason: string;
}

// ─── Repayment schedule table ────────────────────────────────────────────────

function LoanRepaymentTable({ loan }: { loan: StaffLoanDTO }) {
  const { formatCurrency } = useHrmsFormatters();

  const { data: repayments = [], isLoading } = useQuery({
    queryKey: ["hrms", "loans", loan.uuid, "repayments"],
    queryFn: () => hrmsService.getLoanRepayments(loan.uuid).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sorted = [...repayments].sort((a: LoanRepaymentRecordDTO, b: LoanRepaymentRecordDTO) => {
    const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return aTime - bTime;
  });
  const paidCount = sorted.filter((r) => r.status === "DEDUCTED").length;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr className="text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Month</th>
            <th className="px-3 py-2 text-right font-medium">EMI Amount</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => (
            <tr key={row.uuid} className="border-t">
              <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
              <td className="px-3 py-2">
                {row.dueDate
                  ? new Date(row.dueDate + "T00:00:00").toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })
                  : "-"}
              </td>
              <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.amount)}</td>
              <td className="px-3 py-2">
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
        <tfoot className="bg-muted/30">
          <tr className="border-t font-medium">
            <td colSpan={2} className="px-3 py-2 text-muted-foreground">
              Total
            </td>
            <td className="px-3 py-2 text-right">
              {formatCurrency(sorted.reduce((sum, row) => sum + (row.amount ?? 0), 0))}
            </td>
            <td className="px-3 py-2 text-muted-foreground">
              {paidCount}/{sorted.length} paid
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Loan detail modal ───────────────────────────────────────────────────────

function LoanDetailModal({
  loan,
  onClose,
  onDownload,
  isDownloading,
}: {
  loan: StaffLoanDTO | null;
  onClose: () => void;
  onDownload: (loan: StaffLoanDTO) => void;
  isDownloading: boolean;
}) {
  const { formatCurrency, formatDate } = useHrmsFormatters();

  if (!loan) return null;

  const showSchedule = ["DISBURSED", "ACTIVE", "CLOSED"].includes(loan.status);
  const emisPaid =
    showSchedule && loan.emiCount && loan.remainingEmis != null
      ? loan.emiCount - loan.remainingEmis
      : 0;
  const totalEmis = loan.emiCount ?? 0;
  const paidPct = totalEmis > 0 ? Math.round((emisPaid / totalEmis) * 100) : 0;
  const loanOutstanding = Math.max(
    0,
    (loan.approvedAmount ?? loan.principalAmount) - emisPaid * (loan.emiAmount ?? 0),
  );
  const barColor =
    loan.status === "CLOSED"
      ? "bg-gray-400"
      : paidPct >= 75
        ? "bg-emerald-500"
        : paidPct >= 40
          ? "bg-amber-500"
          : "bg-red-400";

  const pieData = [
    { name: "Paid", value: emisPaid, fill: "#10b981" },
    { name: "Remaining", value: loan.remainingEmis ?? 0, fill: "#e5e7eb" },
  ].filter((d) => d.value > 0);

  return (
    <Dialog open={!!loan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-lg">{loan.loanType}</DialogTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {loan.disbursedAt
                  ? `Disbursed on ${formatDate(loan.disbursedAt)}`
                  : `Applied on ${formatDate(loan.createdAt)}`}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${BADGE_BORDER[loan.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              {loan.status}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Principal", value: formatCurrency(loan.principalAmount), hi: "" },
              {
                label: "Approved Amount",
                value: loan.approvedAmount != null ? formatCurrency(loan.approvedAmount) : "—",
                hi: "",
              },
              {
                label: "EMI / Month",
                value: loan.emiAmount != null ? formatCurrency(loan.emiAmount) : "—",
                hi: "text-amber-600",
              },
              {
                label: "Interest Rate",
                value: loan.interestRate != null ? `${loan.interestRate}% p.a.` : "—",
                hi: "",
              },
              { label: "Total EMIs", value: String(loan.emiCount ?? "—"), hi: "" },
              { label: "EMIs Paid", value: String(emisPaid), hi: "text-emerald-600" },
              {
                label: "EMIs Remaining",
                value: String(loan.remainingEmis ?? "—"),
                hi: "text-rose-600",
              },
              {
                label: "Outstanding Balance",
                value: showSchedule && loanOutstanding > 0 ? formatCurrency(loanOutstanding) : "—",
                hi: "text-rose-600",
              },
            ].map(({ label, value, hi }) => (
              <div key={label} className="rounded-lg bg-muted/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className={cn("mt-0.5 text-sm font-bold", hi)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Repayment progress bar */}
          {totalEmis > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-muted-foreground">Repayment Progress</span>
                <span
                  className={cn(
                    "font-bold",
                    paidPct >= 75
                      ? "text-emerald-600"
                      : paidPct >= 40
                        ? "text-amber-600"
                        : "text-rose-600",
                  )}
                >
                  {paidPct}% complete
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{emisPaid} paid</span>
                <span>{loan.remainingEmis ?? 0} remaining</span>
              </div>
            </div>
          )}

          {/* Donut + legend */}
          {totalEmis > 0 && pieData.length > 0 && (
            <div className="flex items-center gap-6">
              <div className="h-[110px] w-[110px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={44}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">{emisPaid} EMIs paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-gray-300 bg-gray-200" />
                  <span className="text-muted-foreground">
                    {loan.remainingEmis ?? 0} EMIs remaining
                  </span>
                </div>
                {loan.remarks && (
                  <p className="border-t pt-1.5 text-xs text-muted-foreground">{loan.remarks}</p>
                )}
              </div>
            </div>
          )}

          {/* Repayment schedule */}
          {showSchedule && (
            <>
              <Separator />
              <div>
                <p className="mb-3 text-sm font-semibold">Repayment Schedule</p>
                <LoanRepaymentTable loan={loan} />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2">
          {showSchedule && (
            <Button
              variant="outline"
              disabled={isDownloading}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
              onClick={() => onDownload(loan)}
            >
              {isDownloading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-1.5 h-4 w-4" />
              )}
              Loan Document
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TeacherMyLoans() {
  const qc = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();
  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<StaffLoanDTO | null>(null);
  const [form, setForm] = useState<LoanFormState>({
    loanType: "",
    principalAmount: "",
    emiCount: "12",
    interestRate: "",
    reason: "",
  });

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["hrms", "self", "loans"],
    queryFn: () => hrmsService.listMyLoans().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.loanType || !form.principalAmount) {
        throw new Error("Loan type and amount are required.");
      }
      return hrmsService.createMyLoan({
        loanType: form.loanType,
        principalAmount: parseFloat(form.principalAmount),
        emiCount: parseInt(form.emiCount, 10) || 12,
        interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
        reason: form.reason || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Loan application submitted");
      qc.invalidateQueries({ queryKey: ["hrms", "self", "loans"] });
      setApplyOpen(false);
      setForm({ loanType: "", principalAmount: "", emiCount: "12", interestRate: "", reason: "" });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const loanDocMutation = useMutation({
    mutationFn: async (loan: StaffLoanDTO) => {
      const response = await hrmsService.downloadLoanDocument(loan.uuid);
      return { loan, blob: response.data };
    },
    onSuccess: ({ loan, blob }) => {
      triggerBlobDownload(
        blob,
        `loan-sanction-letter-${loan.loanType.replace(/\s+/g, "-").toLowerCase()}.pdf`,
      );
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const active = loans.filter((l: StaffLoanDTO) =>
    ["PENDING", "APPROVED", "DISBURSED", "ACTIVE"].includes(l.status),
  );
  const closed = loans.filter((l: StaffLoanDTO) =>
    ["CLOSED", "REJECTED", "CANCELLED"].includes(l.status),
  );

  const renderLoan = (loan: StaffLoanDTO) => {
    const showProgress = ["DISBURSED", "ACTIVE", "CLOSED"].includes(loan.status);
    const totalEmis = loan.emiCount ?? 0;
    const emisPaid =
      showProgress && loan.emiCount && loan.remainingEmis != null
        ? loan.emiCount - loan.remainingEmis
        : 0;
    const paidPct = totalEmis > 0 ? Math.round((emisPaid / totalEmis) * 100) : 0;
    const amountPaid = emisPaid * (loan.emiAmount ?? 0);
    const amountLeft = (loan.remainingEmis ?? 0) * (loan.emiAmount ?? 0);
    const barColor =
      loan.status === "CLOSED"
        ? "bg-gray-400"
        : paidPct >= 75
          ? "bg-emerald-500"
          : paidPct >= 40
            ? "bg-amber-500"
            : "bg-red-400";
    const badgeCls = BADGE_BORDER[loan.status] ?? "bg-gray-100 text-gray-600 border-gray-200";

    return (
      <Card
        key={loan.uuid}
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setSelectedLoan(loan)}
      >
        {/* Coloured top accent bar */}
        <div className={cn("h-1.5", ACCENT_BAR[loan.status] ?? "bg-gray-300")} />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{loan.loanType}</CardTitle>
              {loan.disbursedAt ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Disbursed on {formatDate(loan.disbursedAt)}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Applied on {formatDate(loan.createdAt)}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeCls}`}
            >
              {loan.status}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 3 key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Loan Amount</p>
              <p className="mt-0.5 text-sm font-bold">
                {formatCurrency(loan.approvedAmount ?? loan.principalAmount)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">EMI / Month</p>
              <p className="mt-0.5 text-sm font-bold text-amber-600">
                {loan.emiAmount != null ? formatCurrency(loan.emiAmount) : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Interest Rate</p>
              <p className="mt-0.5 text-sm font-bold">
                {loan.interestRate != null ? `${loan.interestRate}% p.a.` : "—"}
              </p>
            </div>
          </div>

          {/* Repayment progress bar with hover tooltip */}
          {totalEmis > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-muted-foreground">Repayment Progress</span>
                <span
                  className={cn(
                    "font-bold",
                    paidPct >= 75
                      ? "text-emerald-600"
                      : paidPct >= 40
                        ? "text-amber-600"
                        : "text-rose-600",
                  )}
                >
                  {paidPct}%
                </span>
              </div>
              {/* Outer track — `group` so the tooltip can respond to hover */}
              <div className="group relative h-3 overflow-visible rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", barColor)}
                  style={{ width: `${paidPct}%` }}
                />
                {/* Hover tooltip */}
                <div className="pointer-events-none absolute -top-14 left-1/2 z-10 -translate-x-1/2 scale-95 rounded-lg bg-gray-900 px-3 py-2 text-center text-[11px] text-white opacity-0 shadow-lg transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 whitespace-nowrap">
                  <p className="font-semibold">{paidPct}% repaid</p>
                  <p className="text-gray-300">
                    Paid: {formatCurrency(amountPaid)} · Left: {formatCurrency(amountLeft)}
                  </p>
                  {/* Arrow */}
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{emisPaid} of {totalEmis} EMIs paid</span>
                <span>{loan.remainingEmis ?? 0} remaining</span>
              </div>
            </div>
          )}

          <p className="text-right text-xs text-muted-foreground italic">
            Click to view full details &amp; schedule →
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🏦
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">My Loans</h2>
              <p className="text-sm text-white/70">Apply for loans and track repayment status</p>
            </div>
          </div>
          <Button
            onClick={() => setApplyOpen(true)}
            className="bg-white text-sky-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
          >
            ➕ Apply Loan
          </Button>
        </div>
      </div>

      {/* Aggregate KPI strip */}
      {loans.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Borrowed",
              value: formatCurrency(
                loans.reduce((s: number, l: StaffLoanDTO) => s + (l.principalAmount ?? 0), 0),
              ),
              color: "text-blue-600",
              bg: "bg-blue-50 border-blue-200",
            },
            {
              label: "Active Loans",
              value: String(
                loans.filter(
                  (l: StaffLoanDTO) => l.status === "ACTIVE" || l.status === "APPROVED",
                ).length,
              ),
              color: "text-emerald-600",
              bg: "bg-emerald-50 border-emerald-200",
            },
            {
              label: "Monthly EMI Outflow",
              value: formatCurrency(
                loans
                  .filter((l: StaffLoanDTO) => l.status === "ACTIVE")
                  .reduce((s: number, l: StaffLoanDTO) => s + (l.emiAmount ?? 0), 0),
              ),
              color: "text-amber-600",
              bg: "bg-amber-50 border-amber-200",
            },
            {
              label: "Closed / Settled",
              value: String(
                loans.filter((l: StaffLoanDTO) => l.status === "CLOSED").length,
              ),
              color: "text-gray-600",
              bg: "bg-gray-50 border-gray-200",
            },
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

        <TabsContent value="active" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : active.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No active loans"
              description="Apply for a loan to track approval and repayment status."
              actionLabel="Apply Loan"
              onAction={() => setApplyOpen(true)}
            />
          ) : (
            active.map(renderLoan)
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : closed.length === 0 ? (
            <EmptyState
              icon={IndianRupee}
              title="No closed loans"
              description="Completed and rejected loan records will appear here."
            />
          ) : (
            closed.map(renderLoan)
          )}
        </TabsContent>
      </Tabs>

      {/* Loan detail modal */}
      <LoanDetailModal
        loan={selectedLoan}
        onClose={() => setSelectedLoan(null)}
        onDownload={loanDocMutation.mutate}
        isDownloading={loanDocMutation.isPending}
      />

      {/* Apply loan dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>
                Loan Type <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.loanType}
                onChange={(e) => setForm((p) => ({ ...p, loanType: e.target.value }))}
                placeholder="e.g. Personal, Medical"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.principalAmount}
                  onChange={(e) => setForm((p) => ({ ...p, principalAmount: e.target.value }))}
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Number of EMIs</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.emiCount}
                  onChange={(e) => setForm((p) => ({ ...p, emiCount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Interest Rate (% p.a.)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.interestRate}
                onChange={(e) => setForm((p) => ({ ...p, interestRate: e.target.value }))}
                placeholder="e.g. 12"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


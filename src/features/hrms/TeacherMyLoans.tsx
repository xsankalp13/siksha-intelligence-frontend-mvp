import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Loader2, } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/features/hrms/components/EmptyState";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { LoanStatus, StaffLoanDTO } from "@/services/types/hrms";

const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  PENDING: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  APPROVED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  DISBURSED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  ACTIVE: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  CLOSED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  CANCELLED: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

interface LoanFormState {
  loanType: string;
  principalAmount: string;
  emiCount: string;
  interestRate: string;
  reason: string;
}

export default function TeacherMyLoans() {
  const qc = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();
  const [open, setOpen] = useState(false);
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
      setOpen(false);
      setForm({ loanType: "", principalAmount: "", emiCount: "12", interestRate: "", reason: "" });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  return (
    <div className="space-y-4">
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
            onClick={() => setOpen(true)}
            className="bg-white text-sky-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
          >
            ➕ Apply Loan
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : loans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No loan applications"
          description="Apply for a loan to track approval and repayment status."
          actionLabel="Apply Loan"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {loans.map((loan: StaffLoanDTO) => (
            <Card key={loan.uuid}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{loan.loanType}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Applied {formatDate(loan.createdAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className={LOAN_STATUS_COLORS[loan.status]}>{loan.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
                {loan.interestRate != null && (
                  <p className="text-xs text-muted-foreground">Interest: {loan.interestRate}% p.a.</p>
                )}
                {loan.emiAmount != null && loan.emiCount != null && (
                  <p className="text-xs text-muted-foreground">EMI: {formatCurrency(loan.emiAmount)} x {loan.emiCount}</p>
                )}
                {loan.remarks && <p className="mt-1 text-xs text-muted-foreground">{loan.remarks}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Loan Type <span className="text-destructive">*</span></Label>
              <Input value={form.loanType} onChange={(e) => setForm((p) => ({ ...p, loanType: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (INR) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={form.principalAmount} onChange={(e) => setForm((p) => ({ ...p, principalAmount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>EMIs</Label>
                <Input type="number" min={1} value={form.emiCount} onChange={(e) => setForm((p) => ({ ...p, emiCount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Interest Rate (% p.a.)</Label>
              <Input type="number" min={0} step={0.01} value={form.interestRate} onChange={(e) => setForm((p) => ({ ...p, interestRate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

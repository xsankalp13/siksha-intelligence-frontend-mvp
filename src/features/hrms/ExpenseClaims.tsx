import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Receipt,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  ExpenseCategory,
  ExpenseClaimDTO,
  ExpenseClaimStatus,
} from "@/services/types/hrms";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const STATUS_COLORS: Record<ExpenseClaimStatus, string> = {
  DRAFT:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  APPROVED:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  REJECTED:
    "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  PAID:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRAVEL: "Travel",
  FOOD: "Food",
  ACCOMMODATION: "Accommodation",
  SUPPLIES: "Supplies",
  COMMUNICATION: "Communication",
  OTHER: "Other",
};

export default function ExpenseClaims() {
  const qc = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();

  const [approveTarget, setApproveTarget] = useState<ExpenseClaimDTO | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ExpenseClaimDTO | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["hrms", "expense-claims"],
    queryFn: () => hrmsService.listExpenseClaims().then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: (claimId: string) => hrmsService.approveExpenseClaim(claimId),
    onSuccess: () => {
      toast.success("Expense claim approved");
      qc.invalidateQueries({ queryKey: ["hrms", "expense-claims"] });
      setApproveTarget(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const rejectMutation = useMutation({
    mutationFn: (claimId: string) =>
      hrmsService.rejectExpenseClaim(claimId, rejectRemarks),
    onSuccess: () => {
      toast.success("Expense claim rejected");
      qc.invalidateQueries({ queryKey: ["hrms", "expense-claims"] });
      setRejectTarget(null);
      setRejectRemarks("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const reimburseMutation = useMutation({
    mutationFn: (claimId: string) =>
      hrmsService.reimburseExpenseClaim(claimId),
    onSuccess: () => {
      toast.success("Marked as reimbursed");
      qc.invalidateQueries({ queryKey: ["hrms", "expense-claims"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const pending = claims.filter(
    (c: ExpenseClaimDTO) => c.status === "SUBMITTED"
  );
  const approved = claims.filter(
    (c: ExpenseClaimDTO) => c.status === "APPROVED" || c.status === "PAID"
  );
  const rejected = claims.filter(
    (c: ExpenseClaimDTO) => c.status === "REJECTED" || c.status === "DRAFT"
  );

  const renderClaim = (claim: ExpenseClaimDTO) => (
    <Card key={claim.uuid}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">{claim.title}</CardTitle>
              <Badge variant="secondary" className={STATUS_COLORS[claim.status]}>
                {claim.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {claim.staffName}
              {claim.submittedAt && ` · Submitted ${formatDate(claim.submittedAt)}`}
            </p>
            <p className="text-sm font-semibold">
              {formatCurrency(claim.totalAmount)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {claim.status === "SUBMITTED" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  onClick={() => setApproveTarget(claim)}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setRejectTarget(claim);
                    setRejectRemarks("");
                  }}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Reject
                </Button>
              </>
            )}
            {claim.status === "APPROVED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={reimburseMutation.isPending}
                onClick={() => reimburseMutation.mutate(claim.uuid)}
              >
                Mark Reimbursed
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {claim.items.length > 0 && (
        <CardContent>
          <div className="space-y-1">
            {claim.items.map((item) => (
              <div key={item.uuid} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[item.category]}
                  </Badge>
                  <span className="text-muted-foreground">{item.description}</span>
                </div>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense Claims</h1>
          <p className="text-sm text-muted-foreground">
            Review and process staff expense reimbursements
          </p>
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Review
            {pending.length > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 text-xs" variant="secondary">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected / Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pending.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No pending claims"
              description="All submitted expense claims have been processed."
            />
          ) : (
            pending.map(renderClaim)
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approved.length === 0 ? (
            <EmptyState icon={Receipt} title="No approved claims" description="" />
          ) : (
            approved.map(renderClaim)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejected.length === 0 ? (
            <EmptyState icon={Receipt} title="No rejected claims" description="" />
          ) : (
            rejected.map(renderClaim)
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Confirm */}
      <ReviewDialog
        open={!!approveTarget}
        onOpenChange={(o) => !o && setApproveTarget(null)}
        title="Approve Expense Claim"
        description={`Approve "${approveTarget?.title}" for ${approveTarget?.staffName} (${formatCurrency(approveTarget?.totalAmount ?? 0)})?`}
        severity="info"
        confirmLabel="Approve"
        onConfirm={() => approveTarget && approveMutation.mutate(approveTarget.uuid)}
        isPending={approveMutation.isPending}
      >
        <div />
      </ReviewDialog>

      {/* Reject Claim */}
      <ReviewDialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
        title="Reject Expense Claim"
        description={`Reject "${rejectTarget?.title}"?`}
        severity="danger"
        confirmLabel="Reject"
        onConfirm={() => {
          if (!rejectRemarks.trim()) {
            toast.error("Rejection reason is required.");
            return;
          }
          rejectTarget && rejectMutation.mutate(rejectTarget.uuid);
        }}
        isPending={rejectMutation.isPending}
      >
        <div className="space-y-1.5">
          <Label>Reason <span className="text-destructive">*</span></Label>
          <Textarea
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            placeholder="State the reason for rejection..."
            rows={2}
          />
        </div>
      </ReviewDialog>
    </div>
  );
}

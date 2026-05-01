import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Inbox,
  Loader2,
  Settings,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  ApprovalActionType,
  ApprovalRequestDTO,
  ApprovalStatus,
} from "@/services/types/hrms";
import EmptyState from "@/features/hrms/components/EmptyState";
import StatusTimeline from "@/features/hrms/components/StatusTimeline";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const ACTION_TYPE_CONFIG: Record<
  ApprovalActionType,
  { label: string; color: string }
> = {
  LEAVE: { label: "Leave", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  PAYROLL_RUN: { label: "Payroll Run", color: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  PROMOTION: { label: "Promotion", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  EXPENSE_CLAIM: { label: "Expense Claim", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  LOAN_REQUEST: { label: "Loan Request", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  EXIT_REQUEST: { label: "Exit Request", color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

const STATUS_COLORS: Record<ApprovalStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

interface ActionDialogState {
  request: ApprovalRequestDTO;
  action: "approve" | "reject";
}

function RequestCard({
  req,
  onAction,
  formatDate,
}: {
  req: ApprovalRequestDTO;
  onAction?: (req: ApprovalRequestDTO, action: "approve" | "reject") => void;
  formatDate: (v: string | null | undefined) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = ACTION_TYPE_CONFIG[req.actionType];
  const isPending = req.finalStatus === "PENDING";

  const timelineItems = req.steps.map((s) => ({
    label: s.stepLabel,
    actor: s.approverRole,
    status:
      s.status === "APPROVED"
        ? ("completed" as const)
        : s.status === "REJECTED" || req.currentStepOrder === s.stepOrder
          ? ("current" as const)
          : ("pending" as const),
    date: s.actedAt ? formatDate(s.actedAt) : undefined,
    remarks: s.remarks,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cfg.color}>
                {cfg.label}
              </Badge>
              <Badge variant="secondary" className={STATUS_COLORS[req.finalStatus]}>
                {req.finalStatus}
              </Badge>
            </div>
            <CardTitle className="text-sm">{req.entitySummary}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Requested by{" "}
              <span className="font-medium">{req.requestedByName}</span> ·{" "}
              {formatDate(req.requestedAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {isPending && onAction && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
                  onClick={() => onAction(req, "approve")}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
                  onClick={() => onAction(req, "reject")}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Reject
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded((p) => !p)}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  expanded ? "rotate-90" : ""
                }`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <Separator className="mb-3" />
          <StatusTimeline steps={timelineItems} direction="vertical" />
        </CardContent>
      )}
    </Card>
  );
}

export default function ApprovalCenter() {
  const qc = useQueryClient();
  const { formatDate } = useHrmsFormatters();
  const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);
  const [remarks, setRemarks] = useState("");

  const { data: myPending = [], isLoading: loadingMine } = useQuery({
    queryKey: ["hrms", "approvals", "mine"],
    queryFn: () => hrmsService.getMyPendingApprovals().then((r) => r.data),
  });

  const { data: allRequests = [], isLoading: loadingAll } = useQuery({
    queryKey: ["hrms", "approvals", "all"],
    queryFn: () => hrmsService.listApprovalRequests().then((r) => r.data.content),
  });

  const actMutation = useMutation({
    mutationFn: ({
      requestId,
      action,
      remarks: r,
    }: {
      requestId: string;
      action: "approve" | "reject";
      remarks: string;
    }) =>
      action === "approve"
        ? hrmsService.approveRequest(requestId, r)
        : hrmsService.rejectRequest(requestId, r),
    onSuccess: (_, vars) => {
      toast.success(vars.action === "approve" ? "Request approved" : "Request rejected");
      qc.invalidateQueries({ queryKey: ["hrms", "approvals"] });
      setActionDialog(null);
      setRemarks("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const handleAction = (req: ApprovalRequestDTO, action: "approve" | "reject") => {
    setRemarks("");
    setActionDialog({ request: req, action });
  };

  const handleSubmit = () => {
    if (!actionDialog) return;
    if (actionDialog.action === "reject" && !remarks.trim()) {
      toast.error("Remarks are required when rejecting a request.");
      return;
    }
    actMutation.mutate({
      requestId: actionDialog.request.uuid,
      action: actionDialog.action,
      remarks: remarks.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              ✅
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Approval Center</h2>
              <p className="text-sm text-white/70">Review and act on pending approval requests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {myPending.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-400/20 border border-amber-300/30 rounded-xl px-3 py-1.5 text-amber-200 text-sm font-semibold">
                🔔 {myPending.length} pending
              </div>
            )}
            <Button
              variant="outline"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm gap-1.5"
              asChild
            >
              <Link to="/dashboard/admin/hrms/approvals/config">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Configure Chains</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">
            My Pending
            {myPending.length > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 text-xs" variant="secondary">
                {myPending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4 space-y-3">
          {loadingMine ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : myPending.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No pending approvals"
              description="You're all caught up! Nothing waiting for your approval."
            />
          ) : (
            myPending.map((req) => (
              <RequestCard
                key={req.uuid}
                req={req}
                onAction={handleAction}
                formatDate={formatDate}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {loadingAll ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : allRequests.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No approval requests found"
              description="Approval requests will appear here once any workflows are triggered."
            />
          ) : (
            allRequests.map((req: ApprovalRequestDTO) => (
              <RequestCard
                key={req.uuid}
                req={req}
                formatDate={formatDate}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Approve / Reject Dialog */}
      <Dialog
        open={!!actionDialog}
        onOpenChange={(o) => !o && setActionDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === "approve"
                ? "Approve Request"
                : "Reject Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {actionDialog?.request.entitySummary}
            </p>
            <div className="space-y-1.5">
              <Label>
                Remarks{" "}
                {actionDialog?.action === "reject" && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  actionDialog?.action === "reject"
                    ? "Reason for rejection (required)..."
                    : "Optional remarks..."
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={
                actionDialog?.action === "reject" ? "destructive" : "default"
              }
              disabled={actMutation.isPending}
              onClick={handleSubmit}
            >
              {actMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionDialog?.action === "approve" ? "Confirm Approve" : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

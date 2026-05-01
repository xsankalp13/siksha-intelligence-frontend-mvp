import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import type {
  LeaveApplicationCreateDTO,
  LeaveApplicationResponseDTO,
  LeaveReviewDTO,
  StaffCategory,
  LeaveStatus,
} from "@/services/types/hrms";

const initialApplyForm: LeaveApplicationCreateDTO = {
  leaveTypeRef: "",
  fromDate: "",
  toDate: "",
  isHalfDay: false,
  halfDayType: undefined,
  reason: "",
  attachmentUrl: "",
};

type LeaveAction = "approve" | "reject" | "cancel";


const CATEGORY_OPTIONS: Array<{ value: "ALL" | StaffCategory; label: string }> = [
  { value: "ALL", label: "All Categories" },
  { value: "TEACHING", label: "Teaching" },
  { value: "NON_TEACHING_ADMIN", label: "Admin" },
  { value: "NON_TEACHING_SUPPORT", label: "Support" },
];

const STATUS_META: Record<LeaveStatus, { label: string; bg: string; text: string; border: string; icon: React.ElementType }> = {
  PENDING:   { label: "Pending",   bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  icon: Clock },
  APPROVED:  { label: "Approved",  bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200",icon: CheckCircle2 },
  REJECTED:  { label: "Rejected",  bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200",    icon: XCircle },
  CANCELLED: { label: "Cancelled", bg: "bg-gray-100",   text: "text-gray-600",   border: "border-gray-200",   icon: XCircle },
};

const ACCENT_BAR: Record<LeaveStatus, string> = {
  PENDING:   "bg-amber-400",
  APPROVED:  "bg-emerald-500",
  REJECTED:  "bg-red-500",
  CANCELLED: "bg-gray-300",
};

function StatusPill({ status, active, onClick }: { status: string; active: boolean; onClick: () => void }) {
  const meta = STATUS_META[status as LeaveStatus];
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
        active
          ? meta
            ? `${meta.bg} ${meta.text} ${meta.border} shadow-sm`
            : "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-muted-foreground"
      )}
    >
      {meta?.label ?? status}
    </button>
  );
}

export default function LeaveManagement() {
  const queryClient = useQueryClient();
  const { formatDate } = useHrmsFormatters();
  const currentUserId = useAppSelector((s) => Number(s.auth.user?.userId ?? 0));

  const [status, setStatus] = useState<"ALL" | LeaveStatus>("ALL");
  const [category, setCategory] = useState<"ALL" | StaffCategory>("ALL");
  const [search, setSearch] = useState("");
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false);
  const [applyForm, setApplyForm] = useState<LeaveApplicationCreateDTO>(initialApplyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [actionTarget, setActionTarget] = useState<{ row: LeaveApplicationResponseDTO; action: LeaveAction } | null>(null);
  const [remarks, setRemarks] = useState("");

  const leaveTypesQuery = useQuery({
    queryKey: ["hrms", "leave-types"],
    queryFn: () => hrmsService.listLeaveTypes().then((r) => r.data),
  });

  const leavesQuery = useQuery({
    queryKey: ["hrms", "leaves", status, category],
    queryFn: () =>
      hrmsService
        .listLeaveApplications({
          page: 0,
          size: 100,
          sort: ["appliedOn,desc"],
          status: status === "ALL" ? undefined : status,
          category: category === "ALL" ? undefined : category,
        })
        .then((r) => r.data),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["hrms", "leaves"] });
    queryClient.invalidateQueries({ queryKey: ["hrms", "leave-balances"] });
  };

  const applyMutation = useMutation({
    mutationFn: (payload: LeaveApplicationCreateDTO) => hrmsService.applyLeave(payload),
    onSuccess: () => {
      toast.success("Leave application submitted");
      setApplyConfirmOpen(false);
      setApplyOpen(false);
      setApplyForm(initialApplyForm);
      setFieldErrors({});
      refresh();
    },
    onError: (error) => {
      const normalized = normalizeHrmsError(error);
      setFieldErrors(normalized.fieldErrors ?? {});
      toast.error(normalized.message);
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ applicationId, action, payload }: { applicationId: string; action: LeaveAction; payload?: LeaveReviewDTO }) => {
      if (action === "approve") return hrmsService.approveLeave(applicationId, payload);
      if (action === "reject") return hrmsService.rejectLeave(applicationId, payload);
      return hrmsService.cancelLeave(applicationId, payload);
    },
    onSuccess: (_, vars) => {
      const label: Record<LeaveAction, string> = { approve: "approved", reject: "rejected", cancel: "cancelled" };
      toast.success(`Leave ${label[vars.action]} successfully`);
      setActionTarget(null);
      setRemarks("");
      refresh();
    },
    onError: (error) => toast.error(normalizeHrmsError(error).message),
  });

  const rows = leavesQuery.data?.content ?? [];

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.staffName?.toLowerCase().includes(q) ||
        r.leaveTypeName?.toLowerCase().includes(q) ||
        r.leaveTypeCode?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  // KPI stats
  const stats = useMemo(() => {
    const all = rows;
    return {
      total: all.length,
      pending: all.filter((r) => r.status === "PENDING").length,
      approved: all.filter((r) => r.status === "APPROVED").length,
      rejected: all.filter((r) => r.status === "REJECTED").length,
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-blue-500/20 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              📅
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Leave Management</h2>
              <p className="text-sm text-white/70">Review, approve or reject staff leave requests</p>
            </div>
          </div>
          <Button
            onClick={() => { setApplyForm(initialApplyForm); setFieldErrors({}); setApplyOpen(true); }}
            className="bg-white text-violet-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
          >
            ➕ Apply Leave
          </Button>
        </div>

        {/* KPI strip */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          {[
            { label: "Total Requests", value: stats.total,    color: "text-white",        bg: "bg-white/10",  border: "border-white/20" },
            { label: "Pending",        value: stats.pending,  color: "text-amber-200",   bg: "bg-amber-400/20",   border: "border-amber-300/30" },
            { label: "Approved",       value: stats.approved, color: "text-emerald-200", bg: "bg-emerald-400/20", border: "border-emerald-300/30" },
            { label: "Rejected",       value: stats.rejected, color: "text-rose-200",    bg: "bg-rose-400/20",     border: "border-rose-300/30" },
          ].map(({ label, value, color, bg, border }) => (
            <div key={label} className={cn("rounded-xl border p-3 backdrop-blur-sm", bg, border)}>
              <p className="text-xs text-white/70 font-medium">{label}</p>
              <p className={cn("text-2xl font-bold mt-0.5", color)}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff, leave type, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setStatus("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
              status === "ALL"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background text-muted-foreground border-border hover:border-muted-foreground"
            )}
          >
            All
          </button>
          {(["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as LeaveStatus[]).map((s) => (
            <StatusPill key={s} status={s} active={status === s} onClick={() => setStatus(s)} />
          ))}
        </div>

        {/* Category */}
        <Select value={category} onValueChange={(v) => setCategory(v as "ALL" | StaffCategory)}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={refresh} title="Refresh" className="shrink-0">
          <RefreshCw className={cn("h-4 w-4", leavesQuery.isFetching && "animate-spin")} />
        </Button>
      </div>

      {/* ── Error state ── */}
      {leavesQuery.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">{normalizeHrmsError(leavesQuery.error).message}</p>
          <Button variant="outline" size="sm" onClick={() => leavesQuery.refetch()}>Retry</Button>
        </div>
      )}

      {/* ── Content ── */}
      {leavesQuery.isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-base font-semibold text-muted-foreground">No leave requests found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or apply a new leave</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRows.map((row) => {
            const meta = STATUS_META[row.status] ?? STATUS_META.PENDING;
            const StatusIcon = meta.icon;
            const canApprove = row.status === "PENDING" && !(currentUserId > 0 && currentUserId === row.staffId);
            const canReject  = row.status === "PENDING";
            const canCancel  = row.status === "APPROVED" || row.status === "PENDING";
            const durationText = row.isHalfDay
              ? `0.5 day (${row.halfDayType === "FIRST_HALF" ? "1st" : "2nd"} half)`
              : `${row.totalDays} day${row.totalDays !== 1 ? "s" : ""}`;

            return (
              <div key={row.uuid ?? row.applicationId} className="group relative rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden">
                {/* top accent */}
                <div className={cn("h-1 w-full", ACCENT_BAR[row.status] ?? "bg-gray-200")} />

                <div className="p-4 flex flex-wrap items-start gap-4">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                    {row.staffName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{row.staffName}</span>
                      {row.staffCategory && (
                        <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          {row.staffCategory.replace(/_/g, " ")}
                        </span>
                      )}
                      {row.designationName && (
                        <span className="text-[10px] text-muted-foreground">· {row.designationName}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="font-semibold text-primary">{row.leaveTypeName}</span>
                      <span className="text-muted-foreground text-xs bg-muted px-1.5 py-0.5 rounded">{row.leaveTypeCode}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(row.fromDate)} → {formatDate(row.toDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {durationText}
                      </span>
                      {row.reason && (
                        <span className="italic truncate max-w-[220px]">"{row.reason}"</span>
                      )}
                    </div>

                    {row.reviewedByName && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Reviewed by <span className="font-medium text-foreground">{row.reviewedByName}</span>
                        {row.reviewedAt && ` on ${formatDate(row.reviewedAt)}`}
                        {row.reviewRemarks && ` — "${row.reviewRemarks}"`}
                      </p>
                    )}
                  </div>

                  {/* Right side: status + actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border", meta.bg, meta.text, meta.border)}>
                      <StatusIcon className="h-3 w-3" />
                      {meta.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {canApprove && (
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => setActionTarget({ row, action: "approve" })}
                        >
                          Approve
                        </Button>
                      )}
                      {canReject && (
                        <Button size="sm" variant="outline"
                          className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => setActionTarget({ row, action: "reject" })}
                        >
                          Reject
                        </Button>
                      )}
                      {canCancel && (
                        <Button size="sm" variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setActionTarget({ row, action: "cancel" })}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Apply Leave Dialog ── */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
              Apply for Leave
            </DialogTitle>
            <DialogDescription>Submit a leave request that will go through the approval workflow.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Leave Type <span className="text-destructive">*</span></Label>
              <Select
                value={applyForm.leaveTypeRef || undefined}
                onValueChange={(v) => setApplyForm((p) => ({ ...p, leaveTypeRef: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {(leaveTypesQuery.data ?? []).map((type) => (
                    <SelectItem key={type.leaveTypeId} value={type.uuid}>
                      {type.displayName} ({type.leaveCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(fieldErrors.leaveTypeRef?.[0] ?? fieldErrors.leaveTypeId?.[0]) && (
                <p className="text-xs text-destructive">{fieldErrors.leaveTypeRef?.[0] ?? fieldErrors.leaveTypeId?.[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="leave-from">From Date <span className="text-destructive">*</span></Label>
                <Input id="leave-from" type="date" value={applyForm.fromDate}
                  onChange={(e) => setApplyForm((p) => ({ ...p, fromDate: e.target.value }))} />
                {fieldErrors.fromDate?.[0] && <p className="text-xs text-destructive">{fieldErrors.fromDate[0]}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="leave-to">To Date <span className="text-destructive">*</span></Label>
                <Input id="leave-to" type="date" value={applyForm.toDate}
                  onChange={(e) => setApplyForm((p) => ({ ...p, toDate: e.target.value }))} />
                {fieldErrors.toDate?.[0] && <p className="text-xs text-destructive">{fieldErrors.toDate[0]}</p>}
              </div>
            </div>

            {/* Half-day */}
            <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center gap-2 flex-1">
                <Switch id="leave-half" checked={applyForm.isHalfDay ?? false}
                  onCheckedChange={(c) => setApplyForm((p) => ({ ...p, isHalfDay: c, halfDayType: c ? "FIRST_HALF" : undefined }))} />
                <Label htmlFor="leave-half" className="cursor-pointer">Half Day</Label>
              </div>
              {applyForm.isHalfDay && (
                <Select value={applyForm.halfDayType ?? "FIRST_HALF"}
                  onValueChange={(v) => setApplyForm((p) => ({ ...p, halfDayType: v as "FIRST_HALF" | "SECOND_HALF" }))}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST_HALF">First Half</SelectItem>
                    <SelectItem value="SECOND_HALF">Second Half</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="leave-reason">Reason <span className="text-destructive">*</span></Label>
              <Textarea id="leave-reason" value={applyForm.reason ?? ""} maxLength={500}
                placeholder="Briefly describe the reason for your leave…"
                onChange={(e) => setApplyForm((p) => ({ ...p, reason: e.target.value }))} />
              <div className="flex justify-between">
                {fieldErrors.reason?.[0]
                  ? <p className="text-xs text-destructive">{fieldErrors.reason[0]}</p>
                  : <span />}
                <span className="text-[10px] text-muted-foreground">{(applyForm.reason ?? "").length}/500</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="leave-attachment">Attachment URL <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input id="leave-attachment" value={applyForm.attachmentUrl ?? ""}
                onChange={(e) => setApplyForm((p) => ({ ...p, attachmentUrl: e.target.value }))}
                placeholder="https://..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button
              disabled={applyMutation.isPending || !applyForm.leaveTypeRef || !applyForm.fromDate || !applyForm.toDate || !applyForm.reason}
              onClick={() => setApplyConfirmOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-700 hover:to-blue-700"
            >
              Review & Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action confirm dialog */}
      <ReviewDialog
        open={Boolean(actionTarget)}
        onOpenChange={(open) => { if (!open) { setActionTarget(null); setRemarks(""); } }}
        title={actionTarget ? `${actionTarget.action.charAt(0).toUpperCase() + actionTarget.action.slice(1)} Leave?` : "Leave Action"}
        description={actionTarget ? `${actionTarget.action.toUpperCase()} leave for ${actionTarget.row.staffName} (${actionTarget.row.leaveTypeName}, ${actionTarget.row.totalDays} days)` : ""}
        severity={actionTarget?.action === "approve" ? "warning" : "danger"}
        confirmLabel={actionTarget?.action.toUpperCase() ?? "CONFIRM"}
        isPending={actionMutation.isPending}
        requireCheckbox
        checkboxLabel="I have reviewed this request and want to proceed."
        onConfirm={() => {
          if (!actionTarget) return;
          actionMutation.mutate({
            applicationId: actionTarget.row.uuid ?? String(actionTarget.row.applicationId),
            action: actionTarget.action,
            payload: remarks ? { remarks } : undefined,
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="leave-action-remarks">Reviewer Remarks <span className="text-xs text-muted-foreground">(optional)</span></Label>
          <Textarea id="leave-action-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add any notes for the staff member…" />
        </div>
      </ReviewDialog>

      {/* Apply confirm dialog */}
      <ReviewDialog
        open={applyConfirmOpen}
        onOpenChange={setApplyConfirmOpen}
        title="Confirm Leave Application"
        description="Please review your leave details before submitting."
        severity="warning"
        confirmLabel="Submit Leave"
        isPending={applyMutation.isPending}
        requireCheckbox
        checkboxLabel="I confirm these leave details are accurate."
        onConfirm={() => applyMutation.mutate(applyForm)}
      >
        <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
          {[
            { label: "Leave Type", value: leaveTypesQuery.data?.find((t) => t.uuid === applyForm.leaveTypeRef)?.displayName ?? "—" },
            { label: "From", value: applyForm.fromDate || "—" },
            { label: "To", value: applyForm.toDate || "—" },
            { label: "Half Day", value: applyForm.isHalfDay ? (applyForm.halfDayType === "FIRST_HALF" ? "First Half" : "Second Half") : "No" },
            { label: "Reason", value: applyForm.reason?.trim() || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">{label}</span>
              <span className="font-medium text-right">{value}</span>
            </div>
          ))}
        </div>
      </ReviewDialog>
    </div>
  );
}

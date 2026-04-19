import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  ChevronDown,
  ChevronRight,
  CircleX,
  Clock,
  Download,
  FileDown,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StatusTimeline from "@/features/hrms/components/StatusTimeline";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { useAppSelector } from "@/store/hooks";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { triggerBlobDownload } from "@/services/idCard";
import type { PayrollRunCreateDTO, PayrollRunResponseDTO, PayrollStatus } from "@/services/types/hrms";
import type { PayrollPreflightDTO } from "@/services/types/payrollPreflight";

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const now = new Date();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i + 1);

// ── Status config ─────────────────────────────────────────────────────────────

interface StatusMeta {
  label: string;
  dot: string;
  pill: string;
  rowClass: string;
}

const STATUS_META: Record<string, StatusMeta> = {
  DRAFT:      { label: "Draft",           dot: "bg-slate-400",   pill: "bg-slate-50  border-slate-200  text-slate-600",           rowClass: "" },
  PROCESSING: { label: "Processing…",     dot: "bg-yellow-400",  pill: "bg-yellow-50 border-yellow-200 text-yellow-700",          rowClass: "" },
  PROCESSED:  { label: "Needs Approval",  dot: "bg-amber-400",   pill: "bg-amber-50  border-amber-200  text-amber-700",           rowClass: "bg-amber-50/30" },
  APPROVED:   { label: "Approved",        dot: "bg-blue-500",    pill: "bg-blue-50   border-blue-200   text-blue-700",            rowClass: "bg-blue-50/20" },
  DISBURSED:  { label: "Disbursed",       dot: "bg-emerald-500", pill: "bg-emerald-50 border-emerald-200 text-emerald-700",       rowClass: "bg-emerald-50/20" },
  FAILED:     { label: "Failed",          dot: "bg-red-500",     pill: "bg-red-50    border-red-200    text-red-700",             rowClass: "bg-red-50/20" },
  VOIDED:     { label: "Voided",          dot: "bg-slate-300",   pill: "bg-slate-50  border-slate-200  text-slate-400",           rowClass: "opacity-55" },
};

function getStatusMeta(status: string): StatusMeta {
  return STATUS_META[status] ?? STATUS_META.DRAFT;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PayrollReviewTarget =
  | { action: "approve"; run: PayrollRunResponseDTO }
  | { action: "disburse"; run: PayrollRunResponseDTO };

// ── StatusPill ────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const { dot, pill, label } = getStatusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ── StatChip ──────────────────────────────────────────────────────────────────

function StatChip({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string; accent?: "green" | "red" | "amber" | "default";
}) {
  const accentClass = {
    green:   "border-emerald-200 bg-emerald-50  text-emerald-700",
    red:     "border-red-200     bg-red-50      text-red-700",
    amber:   "border-amber-200   bg-amber-50    text-amber-700",
    default: "border-border      bg-muted/40    text-foreground",
  }[accent ?? "default"];
  return (
    <div className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2.5 ${accentClass}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-base font-bold leading-tight">{value}</span>
      {sub && <span className="text-[10px] opacity-60">{sub}</span>}
    </div>
  );
}

// ── AttendanceBlocker ─────────────────────────────────────────────────────────

function AttendanceBlocker({
  details, onMarkAllAbsent, markAbsentPending, onMarkAllPresent, markPresentPending,
}: {
  details: Record<string, unknown>;
  onMarkAllAbsent?: () => void;
  markAbsentPending?: boolean;
  onMarkAllPresent?: () => void;
  markPresentPending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPresentOpen, setConfirmPresentOpen] = useState(false);
  const pct = (details.completionPercentage as number | undefined) ?? 0;
  const staff = (details.unmarkedStaff as { staffName: string; employeeId: string; missingDays: number }[] | undefined) ?? [];
  const workingDays = (details.totalWorkingDays as number | undefined) ?? 0;
  const totalMissingDays = staff.reduce((sum, s) => sum + s.missingDays, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Attendance completion — {workingDays} working days</span>
        <span className="font-semibold tabular-nums text-destructive">{pct.toFixed(1)}%</span>
      </div>
      <Progress value={pct} className="h-1.5 bg-red-100 [&>div]:bg-red-500" />

      {staff.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center gap-1.5 rounded py-1 text-xs font-medium text-destructive hover:underline">
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {open ? "Hide" : "View"} {staff.length} affected staff
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-red-200 bg-red-50/40">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-red-200 bg-red-100/60 text-[10px] font-semibold uppercase text-red-700">
                    <th className="px-2.5 py-1.5">Employee</th>
                    <th className="px-2.5 py-1.5 text-right">Missing Days</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map((s) => (
                    <tr key={s.employeeId} className="border-b border-red-100 last:border-0 text-[11px]">
                      <td className="px-2.5 py-1.5">
                        <span className="font-medium">{s.staffName}</span>
                        <span className="ml-1.5 text-muted-foreground">#{s.employeeId}</span>
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-semibold text-red-600">{s.missingDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-0.5">
        <p className="text-[11px] text-muted-foreground flex-1">
          → Go to the <strong>Attendance</strong> tab and mark attendance for all staff to unblock payroll.
        </p>
        {onMarkAllPresent && (
          <>
            <Button
              size="sm" variant="outline"
              disabled={markPresentPending || markAbsentPending || staff.length === 0}
              onClick={() => setConfirmPresentOpen(true)}
              className="h-7 shrink-0 border-emerald-300 px-2.5 text-xs text-emerald-700 hover:bg-emerald-50"
            >
              {markPresentPending ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Marking…</> : "Mark All as Present"}
            </Button>
            <ReviewDialog
              open={confirmPresentOpen} onOpenChange={setConfirmPresentOpen}
              title="Mark All Unmarked Staff as Present?"
              description={`This will create ${totalMissingDays} present record${totalMissingDays !== 1 ? "s" : ""} for ${staff.length} staff member${staff.length !== 1 ? "s" : ""}.`}
              severity="warning" confirmLabel="Mark Present" isPending={markPresentPending ?? false}
              requireCheckbox checkboxLabel="I confirm this will mark all missing days as PRESENT. This can be corrected from the Attendance module."
              onConfirm={() => { onMarkAllPresent(); setConfirmPresentOpen(false); }}
            >
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">What this does:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>Creates a PRESENT record for each unmarked working day</li>
                  <li>Existing records are not overwritten</li>
                  <li>Can be corrected manually in the Attendance module</li>
                </ul>
              </div>
            </ReviewDialog>
          </>
        )}
        {onMarkAllAbsent && (
          <>
            <Button
              size="sm" variant="outline"
              disabled={markAbsentPending || markPresentPending || staff.length === 0}
              onClick={() => setConfirmOpen(true)}
              className="h-7 shrink-0 border-red-300 px-2.5 text-xs text-red-700 hover:bg-red-50"
            >
              {markAbsentPending ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Marking…</> : "Mark All as Absent"}
            </Button>
            <ReviewDialog
              open={confirmOpen} onOpenChange={setConfirmOpen}
              title="Mark All Unmarked Staff as Absent?"
              description={`This will create ${totalMissingDays} absent record${totalMissingDays !== 1 ? "s" : ""} for ${staff.length} staff member${staff.length !== 1 ? "s" : ""}.`}
              severity="danger" confirmLabel="Mark Absent" isPending={markAbsentPending ?? false}
              requireCheckbox checkboxLabel="I confirm this will mark all missing days as ABSENT. This can be corrected from the Attendance module."
              onConfirm={() => { onMarkAllAbsent(); setConfirmOpen(false); }}
            >
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">What this does:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>Creates an ABSENT record for each unmarked working day</li>
                  <li>Existing records are not overwritten</li>
                  <li>Can be corrected manually in the Attendance module</li>
                </ul>
              </div>
            </ReviewDialog>
          </>
        )}
      </div>
    </div>
  );
}

// ── PreflightPanel ────────────────────────────────────────────────────────────

function PreflightPanel({
  preflight, loading, periodLabel, onRunPayroll, canManagePayroll, runPending,
  onMarkAllAbsent, markAbsentPending, onMarkAllPresent, markPresentPending, onResolveBankDetails,
}: {
  preflight: PayrollPreflightDTO | undefined;
  loading: boolean; periodLabel: string; onRunPayroll: () => void;
  canManagePayroll: boolean; runPending: boolean;
  onMarkAllAbsent: () => void; markAbsentPending: boolean;
  onMarkAllPresent: () => void; markPresentPending: boolean;
  onResolveBankDetails?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border bg-muted/30 px-5 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Running preflight checks for {periodLabel}…
      </div>
    );
  }
  if (!preflight) return null;

  const { canProcess, alreadyProcessed, blockers, warnings, summary } = preflight;

  if (alreadyProcessed) {
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-blue-700">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">Payroll already processed for {periodLabel}</span>
        </div>
        <p className="text-xs text-blue-600">A payroll run exists for this period. Find it in the runs table below to Approve or Disburse.</p>
      </div>
    );
  }

  const statsRow = (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatChip label="Attendance" value={`${summary.attendanceCompletionPercent.toFixed(1)}%`} sub={`${summary.totalStaff} active staff`} accent={summary.attendanceCompletionPercent >= 100 ? "green" : "red"} />
      <StatChip label="Mapped Staff" value={`${summary.staffWithSalaryMapping} / ${summary.totalStaff}`} sub={summary.staffWithoutSalaryMapping > 0 ? `${summary.staffWithoutSalaryMapping} unmapped` : "All mapped"} accent={summary.staffWithoutSalaryMapping > 0 ? "red" : "green"} />
      <StatChip label="Approved Leaves" value={summary.totalApprovedLeaves} accent="default" />
      <StatChip label="Pending Reviews" value={warnings.find((w) => w.type === "PENDING_LEAVE_APPLICATIONS")?.count ?? 0} sub="leave applications" accent={warnings.length > 0 ? "amber" : "default"} />
    </div>
  );

  if (canProcess) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
        <div className="flex items-center gap-2 text-emerald-700">
          <BadgeCheck className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">All checks passed — ready to process {periodLabel}</span>
        </div>
        {statsRow}
        {warnings.length > 0 && (
          <div className="space-y-1.5">
            {warnings.map((w) => (
              <div key={w.type} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{w.message}</span>
                {w.type === "MISSING_BANK_DETAILS" && onResolveBankDetails && (
                  <Button size="sm" variant="ghost" onClick={onResolveBankDetails}
                    className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 shrink-0">
                    Add missing details →
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 pt-1">
          <Button size="default" disabled={!canManagePayroll || runPending} onClick={onRunPayroll} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {runPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</> : "Run Payroll"}
          </Button>
          {!canManagePayroll && <span className="text-xs text-muted-foreground">You don't have permission to run payroll.</span>}
        </div>
      </div>
    );
  }

  const blockerMeta: Record<string, { icon: React.ReactNode; label: string }> = {
    INCOMPLETE_ATTENDANCE: { icon: <Clock className="h-4 w-4 text-red-500" />, label: "Incomplete Attendance" },
    UNMAPPED_STAFF:        { icon: <Users className="h-4 w-4 text-red-500" />, label: "Staff Without Salary Template" },
    DUPLICATE_RUN:         { icon: <CircleX className="h-4 w-4 text-red-500" />, label: "Duplicate Payroll Run" },
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-4">
      <div className="flex items-center gap-2 text-red-700">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">{blockers.length} blocker{blockers.length !== 1 ? "s" : ""} preventing payroll for {periodLabel}</span>
      </div>
      {statsRow}
      <Separator className="bg-red-200" />
      <div className="space-y-3">
        {blockers.map((blocker) => {
          const meta = blockerMeta[blocker.type];
          return (
            <div key={blocker.type} className="rounded-lg border border-red-300 bg-white px-4 py-3 space-y-2 shadow-sm">
              <div className="flex items-center gap-2">
                {meta?.icon ?? <CircleX className="h-4 w-4 text-red-500" />}
                <span className="text-sm font-semibold text-red-700">{meta?.label ?? blocker.type}</span>
              </div>
              <p className="text-xs text-muted-foreground">{blocker.message}</p>
              {blocker.type === "INCOMPLETE_ATTENDANCE" && (
                <AttendanceBlocker details={blocker.details} onMarkAllAbsent={canManagePayroll ? onMarkAllAbsent : undefined} markAbsentPending={markAbsentPending} onMarkAllPresent={canManagePayroll ? onMarkAllPresent : undefined} markPresentPending={markPresentPending} />
              )}
              {blocker.type === "UNMAPPED_STAFF" && (
                <p className="text-[11px] text-muted-foreground">→ Go to <strong>Compensation → Mappings</strong> and assign a salary template to all active staff.</p>
              )}
            </div>
          );
        })}
      </div>
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-amber-700">Warnings (non-blocking)</p>
          {warnings.map((w) => (
              <div key={w.type} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{w.message}</span>
                {w.type === "MISSING_BANK_DETAILS" && onResolveBankDetails && (
                  <Button size="sm" variant="ghost" onClick={onResolveBankDetails}
                    className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 shrink-0">
                    Add missing details →
                  </Button>
                )}
              </div>
          ))}
        </div>
      )}
      <Button size="sm" disabled className="cursor-not-allowed opacity-50">Run Payroll — resolve blockers first</Button>
    </div>
  );
}

// ── RunsTable ─────────────────────────────────────────────────────────────────

function RunsTable({
  runs, isLoading, canManagePayroll, formatCurrency, formatDate,
  approvePending, disbursePending, bankAdvicePending, voidPending,
  onApprove, onDisburse, onBankAdvice, onVoid,
}: {
  runs: PayrollRunResponseDTO[]; isLoading: boolean; canManagePayroll: boolean;
  formatCurrency: (v: number | undefined) => string;
  formatDate: (v: string | undefined) => string;
  approvePending: boolean; disbursePending: boolean; bankAdvicePending: boolean; voidPending: boolean;
  onApprove: (run: PayrollRunResponseDTO) => void;
  onDisburse: (run: PayrollRunResponseDTO) => void;
  onBankAdvice: (run: PayrollRunResponseDTO) => void;
  onVoid: (run: PayrollRunResponseDTO) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading payroll runs…
      </div>
    );
  }
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">No payroll runs yet</p>
        <p className="text-xs text-muted-foreground/60">Process your first payroll run using the panel above.</p>
      </div>
    );
  }

  const isAnyPending = approvePending || disbursePending || bankAdvicePending || voidPending;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 w-12">#</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Staff</th>
            <th className="px-4 py-3 text-right">Gross</th>
            <th className="px-4 py-3 text-right">Deductions</th>
            <th className="px-4 py-3 text-right">Net Pay</th>
            <th className="px-4 py-3">Processed</th>
            <th className="px-4 py-3 text-right w-44">Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const meta = getStatusMeta(run.status);
            const isVoided = run.status === "VOIDED";
            const isDisbursed = run.status === "DISBURSED";
            const canShowBankPdf = run.status === "APPROVED" || isDisbursed;
            const canVoid = !isDisbursed && !isVoided && canManagePayroll;

            return (
              <tr key={run.runUuid} className={`border-b last:border-0 transition-colors hover:bg-muted/20 ${meta.rowClass}`}>
                <td className="px-4 py-3.5">
                  <span className="text-xs font-mono text-muted-foreground">#{run.runId}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`font-semibold ${isVoided ? "line-through text-muted-foreground" : ""}`}>
                    {MONTH_NAMES[(run.payMonth ?? 1) - 1]?.slice(0, 3)} {run.payYear}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={run.status} />
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums">
                  <span className={isVoided ? "text-muted-foreground" : ""}>{run.totalStaff ?? "—"}</span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums">
                  <span className={isVoided ? "text-muted-foreground" : ""}>{formatCurrency(run.totalGross)}</span>
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(run.totalDeductions)}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums">
                  <span className={`font-semibold ${isVoided ? "text-muted-foreground line-through" : "text-emerald-700"}`}>
                    {formatCurrency(run.totalNet)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs text-muted-foreground">{formatDate(run.processedOn)}</span>
                </td>
                <td className="px-4 py-3.5">
                  {isVoided ? (
                    <div className="flex justify-end">
                      <span className="text-xs text-muted-foreground/60 italic">Voided</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5">
                      {run.status === "PROCESSED" && canManagePayroll && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm" disabled={isAnyPending} onClick={() => onApprove(run)}
                                className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                              >
                                {approvePending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve this payroll run</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {run.status === "APPROVED" && canManagePayroll && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm" disabled={isAnyPending} onClick={() => onDisburse(run)}
                                className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              >
                                {disbursePending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Banknote className="mr-1 h-3 w-3" />Disburse</>}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark payroll as disbursed</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {(canShowBankPdf || canVoid) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" disabled={isAnyPending} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {canShowBankPdf && (
                              <DropdownMenuItem onClick={() => onBankAdvice(run)} disabled={bankAdvicePending}>
                                <Download className="mr-2 h-3.5 w-3.5" />Bank Advice PDF
                              </DropdownMenuItem>
                            )}
                            {canShowBankPdf && canVoid && <DropdownMenuSeparator />}
                            {canVoid && (
                              <DropdownMenuItem
                                onClick={() => onVoid(run)} disabled={voidPending}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />Void Run
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PayrollProcessing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);

  const [createError, setCreateError] = useState<string | null>(null);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<PayrollReviewTarget | null>(null);
  const [voidTarget, setVoidTarget] = useState<PayrollRunResponseDTO | null>(null);
  const [form, setForm] = useState<PayrollRunCreateDTO>({
    payMonth: now.getMonth() + 1,
    payYear: now.getFullYear(),
    remarks: "",
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "payroll", "runs"],
    queryFn: () => hrmsService.listPayrollRuns({ page: 0, size: 100, sort: ["payYear,desc", "payMonth,desc"] }).then((res) => res.data),
  });

  const { data: preflight, isLoading: preflightLoading } = useQuery({
    queryKey: ["hrms", "payroll", "preflight", form.payMonth, form.payYear],
    queryFn: () => hrmsService.getPayrollPreflight(form.payMonth, form.payYear).then((res) => res.data),
    enabled: form.payMonth >= 1 && form.payMonth <= 12 && form.payYear >= 2000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hrms", "payroll", "runs"] });

  const canManagePayroll = roles
    .map((r) => r.toUpperCase().replace(/^ROLE_/, ""))
    .some((r) => r === "SUPER_ADMIN" || r === "SCHOOL_ADMIN" || r === "ADMIN");

  const createMutation = useMutation({
    mutationFn: (payload: PayrollRunCreateDTO) => hrmsService.createPayrollRun(payload),
    onSuccess: () => {
      toast.success("Payroll run created & processed");
      setCreateError(null);
      setIsProcessDialogOpen(false);
      refresh();
      queryClient.invalidateQueries({ queryKey: ["hrms", "payroll", "preflight"] });
    },
    onError: (mutationError) => {
      const normalized = normalizeHrmsError(mutationError);
      setCreateError(normalized.message);
      toast.error(normalized.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: (runUuid: string) => hrmsService.approvePayrollRun(runUuid),
    onSuccess: () => { toast.success("Payroll run approved"); setReviewTarget(null); refresh(); },
    onError: (mutationError) => toast.error(normalizeHrmsError(mutationError).message),
  });

  const disburseMutation = useMutation({
    mutationFn: (runUuid: string) => hrmsService.disbursePayrollRun(runUuid),
    onSuccess: () => { toast.success("Payroll run disbursed"); setReviewTarget(null); refresh(); },
    onError: (mutationError) => toast.error(normalizeHrmsError(mutationError).message),
  });

  const voidMutation = useMutation({
    mutationFn: (runUuid: string) => hrmsService.voidPayrollRun(runUuid),
    onSuccess: () => {
      toast.success("Payroll run voided — loan EMIs, overtime, and payslips have been reversed.");
      setVoidTarget(null);
      refresh();
    },
    onError: (mutationError) => toast.error(normalizeHrmsError(mutationError).message),
  });

  const bankAdviceMutation = useMutation({
    mutationFn: async (run: PayrollRunResponseDTO) => {
      const response = await hrmsService.downloadBankSalaryAdvice(run.runUuid);
      const monthStr = String(run.payMonth).padStart(2, "0");
      triggerBlobDownload(response.data, `bank-salary-advice-${monthStr}-${run.payYear}.pdf`);
    },
    onError: (mutationError) => toast.error(normalizeHrmsError(mutationError).message),
  });

  const markAbsentMutation = useMutation({
    mutationFn: () => hrmsService.markAllAbsentForPeriod(form.payMonth, form.payYear),
    onSuccess: (res) => {
      toast.success(`Marked ${res.data.markedAbsent} absent record(s) for ${periodLabel}`);
      queryClient.invalidateQueries({ queryKey: ["hrms", "payroll", "preflight"] });
    },
    onError: (mutationError) => toast.error(normalizeHrmsError(mutationError).message),
  });

  const markPresentMutation = useMutation({
    mutationFn: () => hrmsService.markAllPresentForPeriod(form.payMonth, form.payYear),
    onSuccess: (res) => {
      toast.success(`Marked ${res.data.markedPresent} present record(s) for ${periodLabel}`);
      queryClient.invalidateQueries({ queryKey: ["hrms", "payroll", "preflight"] });
    },
    onError: (mutationError) => toast.error(normalizeHrmsError(mutationError).message),
  });

  const periodLabel = `${MONTH_NAMES[form.payMonth - 1] ?? ""} ${form.payYear}`;

  const runs = data?.content ?? [];
  const stats = useMemo(() => {
    const active = runs.filter((r) => r.status !== "VOIDED" && r.status !== "FAILED");
    const disbursed = active.filter((r) => r.status === "DISBURSED");
    return {
      pendingApproval: active.filter((r) => r.status === "PROCESSED").length,
      pendingDisburse: active.filter((r) => r.status === "APPROVED").length,
      totalDisbursed: disbursed.reduce((s, r) => s + (r.totalNet ?? 0), 0),
      disbursedCount: disbursed.length,
    };
  }, [runs]);

  if (isError) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm text-destructive">{normalizeHrmsError(error).message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary strip */}
      {runs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Total Runs</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums">{runs.length}</p>
            <p className="text-[10px] text-muted-foreground">{stats.disbursedCount} disbursed</p>
          </div>
          <div className={`rounded-xl border bg-card px-4 py-3 shadow-sm ${stats.pendingApproval > 0 ? "border-amber-200 bg-amber-50/40" : ""}`}>
            <p className="text-xs text-muted-foreground">Needs Approval</p>
            <p className={`mt-0.5 text-2xl font-bold tabular-nums ${stats.pendingApproval > 0 ? "text-amber-700" : ""}`}>{stats.pendingApproval}</p>
            <p className="text-[10px] text-muted-foreground">runs awaiting approval</p>
          </div>
          <div className={`rounded-xl border bg-card px-4 py-3 shadow-sm ${stats.pendingDisburse > 0 ? "border-blue-200 bg-blue-50/40" : ""}`}>
            <p className="text-xs text-muted-foreground">Ready to Disburse</p>
            <p className={`mt-0.5 text-2xl font-bold tabular-nums ${stats.pendingDisburse > 0 ? "text-blue-700" : ""}`}>{stats.pendingDisburse}</p>
            <p className="text-[10px] text-muted-foreground">approved runs</p>
          </div>
          <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs text-muted-foreground">Total Disbursed</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-700 truncate">{formatCurrency(stats.totalDisbursed)}</p>
            <p className="text-[10px] text-muted-foreground">across all runs</p>
          </div>
        </div>
      )}

      {/* Run Payroll card */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="text-base font-semibold">Run Payroll</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Select a pay period, review preflight checks, then process.</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          {!canManagePayroll && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              View-only — run/approve/disburse actions require ADMIN or SCHOOL_ADMIN role.
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs">Month</Label>
              <Select value={String(form.payMonth)} onValueChange={(v) => setForm((p) => ({ ...p, payMonth: Number(v) }))}>
                <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Year</Label>
              <Select value={String(form.payYear)} onValueChange={(v) => setForm((p) => ({ ...p, payYear: Number(v) }))}>
                <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px] space-y-1.5">
              <Label className="text-xs">Remarks (optional)</Label>
              <Textarea rows={1} value={form.remarks ?? ""} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} placeholder="Optional notes for this run" className="min-h-0 resize-none" />
            </div>
          </div>
          <PreflightPanel
            preflight={preflight} loading={preflightLoading} periodLabel={periodLabel}
            onRunPayroll={() => setIsProcessDialogOpen(true)} canManagePayroll={canManagePayroll} runPending={createMutation.isPending}
            onMarkAllAbsent={() => markAbsentMutation.mutate()} markAbsentPending={markAbsentMutation.isPending}
            onMarkAllPresent={() => markPresentMutation.mutate()} markPresentPending={markPresentMutation.isPending}
            onResolveBankDetails={() => navigate("/dashboard/admin/hrms/bank-details", { state: { tab: "missing" } })}
          />
          {createError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{createError}</div>
          )}
        </div>
      </div>

      {/* Payroll Runs table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <h3 className="text-sm font-semibold">Payroll Runs</h3>
            {runs.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{runs.length} total · sorted newest first</p>}
          </div>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={refresh}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>
        <RunsTable
          runs={runs} isLoading={isLoading} canManagePayroll={canManagePayroll}
          formatCurrency={formatCurrency} formatDate={formatDate}
          approvePending={approveMutation.isPending} disbursePending={disburseMutation.isPending}
          bankAdvicePending={bankAdviceMutation.isPending} voidPending={voidMutation.isPending}
          onApprove={(run) => setReviewTarget({ action: "approve", run })}
          onDisburse={(run) => setReviewTarget({ action: "disburse", run })}
          onBankAdvice={(run) => bankAdviceMutation.mutate(run)}
          onVoid={(run) => setVoidTarget(run)}
        />
      </div>

      {/* Run Payroll confirmation */}
      <ReviewDialog
        open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}
        title="Run Payroll?" description={`Process payroll for ${periodLabel}.`}
        severity="warning" confirmLabel="Run Payroll" isPending={createMutation.isPending}
        requireCheckbox checkboxLabel="I have verified attendance, mappings, and financial totals for this run."
        onConfirm={() => createMutation.mutate(form)}
      >
        <div className="space-y-3 text-sm">
          <StatusTimeline steps={[{ label: "Process", status: "current" }, { label: "Approve", status: "pending" }, { label: "Disburse", status: "pending" }]} />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Period</p><p className="font-semibold">{periodLabel}</p></div>
            <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Mapped Staff</p><p className="font-semibold">{preflight?.summary.staffWithSalaryMapping ?? "—"}</p></div>
          </div>
          {form.remarks?.trim() && <p className="text-xs text-muted-foreground">Remarks: <span className="text-foreground">{form.remarks}</span></p>}
        </div>
      </ReviewDialog>

      {/* Approve */}
      <ReviewDialog
        open={reviewTarget?.action === "approve"} onOpenChange={(open) => { if (!open) setReviewTarget(null); }}
        title="Approve Payroll Run?"
        description={reviewTarget?.action === "approve" ? `Run #${reviewTarget.run.runId} · ${MONTH_NAMES[(reviewTarget.run.payMonth ?? 1) - 1]} ${reviewTarget.run.payYear}` : undefined}
        severity="warning" confirmLabel="Approve" isPending={approveMutation.isPending}
        requireCheckbox checkboxLabel="I have reviewed the totals and authorize this payroll run."
        onConfirm={() => { if (reviewTarget?.action !== "approve") return; approveMutation.mutate(reviewTarget.run.runUuid); }}
      >
        <div className="space-y-3 text-sm">
          {reviewTarget?.action === "approve" && (
            <>
              <StatusTimeline steps={[{ label: "Processed", status: "completed", date: formatDate(reviewTarget.run.processedOn) }, { label: "Approve", status: "current" }, { label: "Disburse", status: "pending" }]} />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Staff</p><p className="font-semibold">{reviewTarget.run.totalStaff}</p></div>
                <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Gross Pay</p><p className="font-semibold">{formatCurrency(reviewTarget.run.totalGross)}</p></div>
                <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Deductions</p><p className="font-semibold">{formatCurrency(reviewTarget.run.totalDeductions)}</p></div>
                <div className="rounded-lg border p-2.5 bg-emerald-50 border-emerald-200"><p className="text-muted-foreground">Net Pay</p><p className="font-semibold text-emerald-700">{formatCurrency(reviewTarget.run.totalNet)}</p></div>
              </div>
            </>
          )}
        </div>
      </ReviewDialog>

      {/* Disburse */}
      <ReviewDialog
        open={reviewTarget?.action === "disburse"} onOpenChange={(open) => { if (!open) setReviewTarget(null); }}
        title="Disburse Payroll?"
        description={reviewTarget?.action === "disburse" ? `Run #${reviewTarget.run.runId} · ${MONTH_NAMES[(reviewTarget.run.payMonth ?? 1) - 1]} ${reviewTarget.run.payYear}` : undefined}
        severity="danger" confirmLabel="Disburse" isPending={disburseMutation.isPending}
        requireCheckbox checkboxLabel="I confirm payment instructions are final and funds are ready for disbursement."
        requireTypeConfirm="DISBURSE" typeConfirmLabel={'Type "DISBURSE" to confirm final payout:'}
        onConfirm={() => { if (reviewTarget?.action !== "disburse") return; disburseMutation.mutate(reviewTarget.run.runUuid); }}
      >
        <div className="space-y-3 text-sm">
          {reviewTarget?.action === "disburse" && (
            <>
              <StatusTimeline steps={[{ label: "Processed", status: "completed", date: formatDate(reviewTarget.run.processedOn) }, { label: "Approved", status: "completed" }, { label: "Disburse", status: "current" }]} />
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                <strong>Irreversible action.</strong> This will mark payroll as disbursed. Download the Bank Salary Advice PDF after disbursement to submit to your bank.
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border p-2.5"><p className="text-muted-foreground">Staff</p><p className="font-semibold">{reviewTarget.run.totalStaff}</p></div>
                <div className="rounded-lg border p-2.5 bg-emerald-50 border-emerald-200"><p className="text-muted-foreground">Net Disbursable</p><p className="font-semibold text-emerald-700">{formatCurrency(reviewTarget.run.totalNet)}</p></div>
              </div>
            </>
          )}
        </div>
      </ReviewDialog>

      {/* Void */}
      <ConfirmDialog
        open={Boolean(voidTarget)}
        onOpenChange={(open) => { if (!open) setVoidTarget(null); }}
        title="Void this payroll run?"
        description={
          voidTarget
            ? `This will reverse all loan EMI deductions, revert overtime conversions, and delete all ${voidTarget.totalStaff} payslips for ${MONTH_NAMES[(voidTarget.payMonth ?? 1) - 1]} ${voidTarget.payYear}. The run will be marked VOIDED. This cannot be undone.`
            : ""
        }
        confirmLabel="Void Payroll Run"
        onConfirm={() => { if (voidTarget) voidMutation.mutate(voidTarget.runUuid); }}
        loading={voidMutation.isPending}
        destructive
      />
    </div>
  );
}

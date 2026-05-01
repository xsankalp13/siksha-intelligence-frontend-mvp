/**
 * PriorityInbox
 * -------------
 * Unified priority queue surfacing the highest-impact pending actions:
 *   1. Leave applications (with inline approve/reject)
 *   2. Uncovered proxy periods
 *   3. Late clock-in reviews
 *   4. Overdue invoices
 *
 * Replaces the old "Operational Alerts" widget.
 * Uses existing backend endpoints — no new APIs required.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  FileText,
  ArrowRightLeft,
  TimerOff,
  IndianRupee,
  Check,
  X,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";
import { hrmsService } from "@/services/hrms";
import type { HrmsDashboardSummaryDTO } from "@/services/dashboard";
import { DASHBOARD_KEYS } from "@/hooks/useDashboardQueries";

// ── Types ─────────────────────────────────────────────────────────────
type InboxItemType = "LEAVE" | "PROXY" | "LATE_CLOCKIN" | "INVOICE";

interface InboxItem {
  id: string;
  type: InboxItemType;
  urgency: "critical" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
  /** For leave items: the leave application uuid */
  leaveUuid?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────
function urgencyBorderClass(urgency: InboxItem["urgency"]) {
  if (urgency === "critical") return "border-red-500/40 bg-red-500/5";
  if (urgency === "warning") return "border-amber-500/40 bg-amber-500/5";
  return "border-border bg-card";
}

function typeIcon(type: InboxItemType) {
  switch (type) {
    case "LEAVE": return FileText;
    case "PROXY": return ArrowRightLeft;
    case "LATE_CLOCKIN": return TimerOff;
    case "INVOICE": return IndianRupee;
  }
}

function typeColor(urgency: InboxItem["urgency"]) {
  if (urgency === "critical") return "text-red-500 bg-red-500/10";
  if (urgency === "warning") return "text-amber-500 bg-amber-500/10";
  return "text-blue-500 bg-blue-500/10";
}

// ── Leave sub-list fetched independently ─────────────────────────────
const LEAVE_QUERY_KEY = ["dashboard", "pending-leaves"] as const;

function usePendingLeaves() {
  return useQuery({
    queryKey: LEAVE_QUERY_KEY,
    queryFn: () =>
      hrmsService
        .listLeaveApplications({ status: "PENDING", page: 0, size: 5 })
        .then((r) => r.data.content),
    staleTime: 60_000,
    retry: 1,
  });
}

// ── Inline Approve / Reject ───────────────────────────────────────────
interface LeaveActionButtonsProps {
  leaveUuid: string;
  onDone: () => void;
}

function LeaveActionButtons({ leaveUuid, onDone }: LeaveActionButtonsProps) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: LEAVE_QUERY_KEY });
    qc.invalidateQueries({ queryKey: DASHBOARD_KEYS.hrmsSummary });
  };

  const approveMutation = useMutation({
    mutationFn: () => hrmsService.approveLeave(leaveUuid),
    onSuccess: () => {
      toast.success("Leave approved");
      invalidate();
      onDone();
    },
    onError: () => toast.error("Failed to approve leave"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => hrmsService.rejectLeave(leaveUuid),
    onSuccess: () => {
      toast.success("Leave rejected");
      invalidate();
      onDone();
    },
    onError: () => toast.error("Failed to reject leave"),
  });

  const busy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="flex gap-1.5 mt-2">
      <button
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); approveMutation.mutate(); }}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        aria-label="Approve leave"
      >
        <Check className="h-3.5 w-3.5" />
        Approve
      </button>
      <button
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(); }}
        className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
        aria-label="Reject leave"
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
interface PriorityInboxProps {
  hrmsSummary: HrmsDashboardSummaryDTO | null;
  pendingInvoices: number;
  outstanding: number;
}

export function PriorityInbox({ hrmsSummary, pendingInvoices, outstanding }: PriorityInboxProps) {
  const navigate = useNavigate();
  const { data: pendingLeaves = [] } = usePendingLeaves();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const dismiss = (id: string) =>
    setDismissedIds((prev) => new Set([...prev, id]));

  // Build the unified priority queue
  const items: InboxItem[] = [];

  // 1. Individual leave applications (inline approve)
  for (const leave of pendingLeaves) {
    const id = `leave-${leave.uuid ?? leave.applicationId}`;
    items.push({
      id,
      type: "LEAVE",
      urgency: "warning",
      title: `${leave.staffName} — ${leave.leaveTypeName}`,
      detail: `${format(new Date(leave.fromDate), "dd MMM")} → ${format(new Date(leave.toDate), "dd MMM")} (${leave.totalDays}d)`,
      href: "/dashboard/admin/hrms",
      leaveUuid: leave.uuid ?? String(leave.applicationId),
    });
  }

  // 2. Remaining leave count (if more than displayed)
  const remainingLeaves =
    (hrmsSummary?.pendingLeaveApplications ?? 0) - pendingLeaves.length;
  if (remainingLeaves > 0) {
    items.push({
      id: "leaves-remaining",
      type: "LEAVE",
      urgency: "info",
      title: `+${remainingLeaves} more leave requests`,
      detail: "Click to review all in HRMS",
      href: "/dashboard/admin/hrms",
    });
  }

  // 3. Proxy coverage
  if (hrmsSummary && hrmsSummary.pendingProxyCount > 0) {
    items.push({
      id: "proxy",
      type: "PROXY",
      urgency: hrmsSummary.pendingProxyCount > 3 ? "critical" : "warning",
      title: `${hrmsSummary.pendingProxyCount} uncovered proxy period${hrmsSummary.pendingProxyCount > 1 ? "s" : ""}`,
      detail: "Classes may be unattended — assign proxies",
      href: "/dashboard/admin/proxy",
    });
  }

  // 4. Late clock-ins
  if (hrmsSummary && hrmsSummary.pendingLateClockInCount > 0) {
    items.push({
      id: "late-clockin",
      type: "LATE_CLOCKIN",
      urgency: "warning",
      title: `${hrmsSummary.pendingLateClockInCount} late clock-in review${hrmsSummary.pendingLateClockInCount > 1 ? "s" : ""}`,
      detail: "Staff arrived late and need review",
      href: "/dashboard/admin/hrms",
    });
  }

  // 5. Overdue invoices
  if (pendingInvoices > 0 && outstanding > 0) {
    const formatC = (n: number) => {
      if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
      return `₹${n.toLocaleString("en-IN")}`;
    };
    items.push({
      id: "invoices",
      type: "INVOICE",
      urgency: outstanding > 500_000 ? "critical" : "warning",
      title: `${formatC(outstanding)} outstanding from ${pendingInvoices} invoice${pendingInvoices > 1 ? "s" : ""}`,
      detail: "Fee collection action required",
      href: "/dashboard/admin/finance",
    });
  }

  const visibleItems = items.filter((i) => !dismissedIds.has(i.id));

  if (visibleItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground/40 stroke-[1.5]" />
        <p className="text-sm font-semibold text-muted-foreground">All clear — nothing needs you right now</p>
        <p className="text-xs text-muted-foreground/70">Check back later or explore the modules below</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-y-auto pr-1 custom-scrollbar">
      <AnimatePresence initial={false}>
        {visibleItems.map((item) => {
          const Icon = typeIcon(item.type);
          const colorCls = typeColor(item.urgency);

          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className={`relative rounded-xl border p-3.5 cursor-pointer group transition-shadow hover:shadow-md ${urgencyBorderClass(item.urgency)}`}
              onClick={() => navigate(item.href)}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorCls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{item.detail}</p>
                  {item.leaveUuid && (
                    <LeaveActionButtons
                      leaveUuid={item.leaveUuid}
                      onDone={() => dismiss(item.id)}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!item.leaveUuid && (
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(item.id); }}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Dismiss item"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

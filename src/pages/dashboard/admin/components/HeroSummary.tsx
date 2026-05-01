/**
 * HeroSummary
 * -----------
 * "Today at a glance" strip below the header.
 * Derives a 1–2 sentence heuristic narrative from existing data,
 * plus up to 3 action chips for the highest-priority items.
 * Phase 2 can swap the narrative for an LLM-generated summary.
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, TrendingDown, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HrmsDashboardSummaryDTO } from "@/services/dashboard";

interface HeroSummaryProps {
  hrmsSummary: HrmsDashboardSummaryDTO | null;
  pendingInvoices: number;
  outstanding: number;
  hrmsLoading: boolean;
  financeLoading: boolean;
}

interface ActionChip {
  label: string;
  href: string;
  urgency: "critical" | "warning" | "info";
  icon: React.ElementType;
}

const formatCompact = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

export function HeroSummary({
  hrmsSummary,
  pendingInvoices,
  outstanding,
  hrmsLoading,
  financeLoading,
}: HeroSummaryProps) {
  const navigate = useNavigate();

  const { narrative, chips } = useMemo(() => {
    const loading = hrmsLoading || financeLoading;
    if (loading || !hrmsSummary) {
      return { narrative: null, chips: [] };
    }

    const leaveCount = hrmsSummary.pendingLeaveApplications;
    const proxyCount = hrmsSummary.pendingProxyCount;
    const lateCount = hrmsSummary.pendingLateClockInCount;
    const absentCount = hrmsSummary.todayAbsent;

    // Build prioritised action chips
    const actionChips: ActionChip[] = [];

    if (leaveCount > 0) {
      actionChips.push({
        label: `${leaveCount} leave approval${leaveCount > 1 ? "s" : ""} pending`,
        href: "/dashboard/admin/hrms",
        urgency: leaveCount >= 5 ? "critical" : "warning",
        icon: UserCheck,
      });
    }

    if (outstanding > 0 && pendingInvoices > 0) {
      actionChips.push({
        label: `${formatCompact(outstanding)} outstanding · ${pendingInvoices} invoices`,
        href: "/dashboard/admin/finance",
        urgency: outstanding > 500_000 ? "critical" : "warning",
        icon: TrendingDown,
      });
    }

    if (proxyCount > 0 || lateCount > 0) {
      const total = proxyCount + lateCount;
      actionChips.push({
        label: `${total} HRMS item${total > 1 ? "s" : ""} need attention`,
        href: "/dashboard/admin/proxy",
        urgency: "warning",
        icon: AlertTriangle,
      });
    }

    // Narrative text (heuristic)
    const totalItems =
      (leaveCount > 0 ? 1 : 0) +
      (outstanding > 0 && pendingInvoices > 0 ? 1 : 0) +
      (proxyCount > 0 || lateCount > 0 ? 1 : 0);

    let narrativeText = "";
    if (totalItems === 0) {
      narrativeText = `All clear — no pending actions today. Staff presence is at ${hrmsSummary.staffPresentPercent.toFixed(0)}%.`;
    } else {
      const parts: string[] = [];
      if (leaveCount > 0)
        parts.push(`${leaveCount} leave approval${leaveCount > 1 ? "s" : ""}`);
      if (outstanding > 0 && pendingInvoices > 0)
        parts.push(`${formatCompact(outstanding)} overdue from ${pendingInvoices} invoice${pendingInvoices > 1 ? "s" : ""}`);
      if (absentCount > 0)
        parts.push(`${absentCount} staff absent today`);
      narrativeText = `${totalItems} thing${totalItems > 1 ? "s" : ""} need${totalItems === 1 ? "s" : ""} your attention today: ${parts.join(", ")}.`;
    }

    return { narrative: narrativeText, chips: actionChips.slice(0, 3) };
  }, [hrmsSummary, pendingInvoices, outstanding, hrmsLoading, financeLoading]);

  if (hrmsLoading || financeLoading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/40 px-5 py-4 animate-pulse">
        <div className="h-4 w-2/3 rounded bg-muted mb-3" />
        <div className="flex gap-2">
          <div className="h-7 w-40 rounded-full bg-muted" />
          <div className="h-7 w-40 rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  if (!narrative) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <p className="flex-1 text-sm font-medium text-foreground leading-relaxed">
        {narrative}
      </p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 shrink-0">
          {chips.map((chip) => (
            <button
              key={chip.label}
              onClick={() => navigate(chip.href)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                chip.urgency === "critical"
                  ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/15"
                  : chip.urgency === "warning"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
                  : "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/15"
              }`}
            >
              <chip.icon className="h-3.5 w-3.5" />
              {chip.label}
              <ArrowRight className="h-3 w-3 opacity-60" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

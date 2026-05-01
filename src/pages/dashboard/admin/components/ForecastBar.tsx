/**
 * ForecastBar
 * ─────────────────────────────────────────────────────────────────────
 * Predictive intelligence strip displayed between the Hero Summary and
 * the KPI row.  Shows three live forecast signals:
 *
 *   1. Revenue EOM trajectory  — will we hit this month's fee target?
 *   2. Staff attendance trend  — improving / stable / declining (7-day)?
 *   3. Outstanding risk        — is unpaid balance growing fast (MoM)?
 *
 * Data comes from GET /auth/dashboard/forecast via useForecastQuery().
 * On loading: 3 skeleton chips.
 * On error / no data: component renders nothing (silent degradation).
 */
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,

} from "lucide-react";
import type { DashboardForecastDTO } from "@/services/dashboard";

// ── Helpers ───────────────────────────────────────────────────────────
function formatCompact(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

// ── Chip styles ───────────────────────────────────────────────────────
const CHIP_STYLES = {
  ON_TRACK: {
    bg: "bg-emerald-500/10 border-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  AT_RISK: {
    bg: "bg-amber-500/10 border-amber-500/25",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
  },
  CRITICAL: {
    bg: "bg-rose-500/10 border-rose-500/25",
    text: "text-rose-700 dark:text-rose-400",
    icon: AlertTriangle,
  },
  IMPROVING: {
    bg: "bg-emerald-500/10 border-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: TrendingUp,
  },
  STABLE: {
    bg: "bg-blue-500/10 border-blue-500/25",
    text: "text-blue-700 dark:text-blue-400",
    icon: Minus,
  },
  DECLINING: {
    bg: "bg-amber-500/10 border-amber-500/25",
    text: "text-amber-700 dark:text-amber-400",
    icon: TrendingDown,
  },
  LOW: {
    bg: "bg-emerald-500/10 border-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  MEDIUM: {
    bg: "bg-amber-500/10 border-amber-500/25",
    text: "text-amber-700 dark:text-amber-400",
    icon: AlertTriangle,
  },
  HIGH: {
    bg: "bg-rose-500/10 border-rose-500/25",
    text: "text-rose-700 dark:text-rose-400",
    icon: AlertTriangle,
  },
} as const;

// ── Skeleton Chip ─────────────────────────────────────────────────────
function SkeletonChip() {
  return (
    <div className="flex-1 min-w-[200px] h-14 animate-pulse rounded-2xl border border-border bg-muted/40" />
  );
}

// ── Forecast Chip ──────────────────────────────────────────────────────
function ForecastChip({
  label,
  value,
  subtext,
  style,
}: {
  label: string;
  value: string;
  subtext: string;
  style: (typeof CHIP_STYLES)[keyof typeof CHIP_STYLES];
}) {
  const Icon = style.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-1 min-w-[200px] items-center gap-3 rounded-2xl border px-4 py-3 ${style.bg}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
        <Icon className={`h-4.5 w-4.5 ${style.text}`} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
          {label}
        </p>
        <p className={`text-sm font-extrabold leading-tight ${style.text}`}>{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">{subtext}</p>
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
interface ForecastBarProps {
  forecast: DashboardForecastDTO | undefined;
  isLoading: boolean;
}

export function ForecastBar({ forecast, isLoading }: ForecastBarProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-3">
        <SkeletonChip />
        <SkeletonChip />
        <SkeletonChip />
      </div>
    );
  }

  if (!forecast) return null;

  // ── Chip 1: Revenue trajectory ──────────────────────────────────────
  const revStyle = CHIP_STYLES[forecast.revenueTrajectory];
  const revValue =
    forecast.revenueTrajectory === "ON_TRACK"
      ? `On track · ${forecast.revenueTrajectoryPct.toFixed(0)}% of target`
      : forecast.revenueTrajectory === "AT_RISK"
      ? `At risk · ${forecast.revenueTrajectoryPct.toFixed(0)}% of target`
      : `Critical · ${forecast.revenueTrajectoryPct.toFixed(0)}% of target`;
  const revSubtext = `EOM forecast ${formatCompact(forecast.revenueEomForecast)} / target ${formatCompact(forecast.revenueMonthTarget)}`;

  // ── Chip 2: Attendance trend ────────────────────────────────────────
  const attStyle = CHIP_STYLES[forecast.attendanceTrend];
  const attVerb =
    forecast.attendanceTrend === "IMPROVING"
      ? "Improving"
      : forecast.attendanceTrend === "DECLINING"
      ? "Declining"
      : "Stable";
  const attValue = `${attVerb} · ${forecast.currentStaffAttendancePct.toFixed(1)}% today`;
  const slopeSign = forecast.attendanceTrendSlope >= 0 ? "+" : "";
  const attSubtext = `7-day slope ${slopeSign}${forecast.attendanceTrendSlope.toFixed(1)}pp/day`;

  // ── Chip 3: Outstanding risk ────────────────────────────────────────
  const outStyle = CHIP_STYLES[forecast.outstandingRisk];
  const outSign = forecast.outstandingGrowthRate >= 0 ? "+" : "";
  const outValue = `Outstanding risk: ${forecast.outstandingRisk}`;
  const outSubtext = `MoM change ${outSign}${forecast.outstandingGrowthRate.toFixed(1)}% vs last month`;

  return (
    <div className="flex flex-wrap gap-3" role="region" aria-label="Forecast intelligence">
      <ForecastChip
        label="Revenue forecast"
        value={revValue}
        subtext={revSubtext}
        style={revStyle}
      />
      <ForecastChip
        label="Staff attendance"
        value={attValue}
        subtext={attSubtext}
        style={attStyle}
      />
      <ForecastChip
        label="Outstanding risk"
        value={outValue}
        subtext={outSubtext}
        style={outStyle}
      />
    </div>
  );
}

// Also export a standalone "Forecast Insight" label to use in ExportMenu if needed
export { formatCompact as forecastFormatCompact };

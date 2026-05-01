import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type HrmsStatTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "primary";

interface HrmsStatCardProps {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: HrmsStatTone;
  className?: string;
  onClick?: () => void;
}

/**
 * Compact stat / KPI card with a thin gradient stripe on top.
 * Tone controls the accent color while the layout stays identical
 * across the HRMS module so cards line up nicely in any grid.
 */
const TONES: Record<
  HrmsStatTone,
  { stripe: string; iconBg: string; iconText: string; valueText: string }
> = {
  primary: {
    stripe: "from-violet-400 to-indigo-500",
    iconBg: "bg-violet-50 dark:bg-violet-500/10",
    iconText: "text-violet-600 dark:text-violet-400",
    valueText: "text-violet-700 dark:text-violet-300",
  },
  info: {
    stripe: "from-blue-400 to-indigo-500",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconText: "text-blue-600 dark:text-blue-400",
    valueText: "text-blue-700 dark:text-blue-300",
  },
  success: {
    stripe: "from-emerald-400 to-teal-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconText: "text-emerald-600 dark:text-emerald-400",
    valueText: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    stripe: "from-amber-400 to-orange-500",
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconText: "text-amber-600 dark:text-amber-400",
    valueText: "text-amber-700 dark:text-amber-300",
  },
  danger: {
    stripe: "from-rose-400 to-red-500",
    iconBg: "bg-rose-50 dark:bg-rose-500/10",
    iconText: "text-rose-600 dark:text-rose-400",
    valueText: "text-rose-700 dark:text-rose-300",
  },
  neutral: {
    stripe: "from-slate-300 to-slate-400",
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconText: "text-slate-600 dark:text-slate-300",
    valueText: "text-slate-800 dark:text-slate-100",
  },
};

export default function HrmsStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  className,
  onClick,
}: HrmsStatCardProps) {
  const t = TONES[tone];
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white dark:bg-slate-900 px-4 py-3 shadow-sm transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", t.stripe)} />
      <div className="flex items-center gap-3 mt-1">
        {Icon && (
          <div className={cn("rounded-lg p-2", t.iconBg)}>
            <Icon className={cn("h-4 w-4", t.iconText)} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("text-xl font-bold tabular-nums truncate", t.valueText)}>{value}</p>
          {hint && (
            <p className="text-[11px] text-muted-foreground truncate">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}

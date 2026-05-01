import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HrmsPageHeaderProps {
  /** Optional Lucide icon — rendered inside a glass tile on the left. */
  icon?: LucideIcon;
  /** Optional emoji (used when no icon supplied, or alongside it). */
  emoji?: string;
  /** Page / tab title. */
  title: string;
  /** Optional subtitle / description. */
  subtitle?: string;
  /** Optional content rendered on the right (CTA buttons, badges, etc.). */
  actions?: React.ReactNode;
  /** Optional stat strip rendered below the title row. */
  stats?: Array<{
    label: string;
    value: React.ReactNode;
    /** Tailwind class for the small accent dot, e.g. "bg-emerald-300". */
    accent?: string;
  }>;
  /** Extra classes appended to the root container. */
  className?: string;
}

/**
 * Canonical HRMS page header.
 *
 * Renders a violet→indigo→blue gradient banner that matches the module shell,
 * giving every HRMS tab a visually unified hero block. Use this component in
 * place of bespoke per-feature banners.
 */
export default function HrmsPageHeader({
  icon: Icon,
  emoji,
  title,
  subtitle,
  actions,
  stats,
  className,
}: HrmsPageHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 px-5 py-5 sm:px-6 text-white shadow-lg",
        className,
      )}
    >
      {/* Decorative blur orbs */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white" />
        <div className="absolute -bottom-20 left-0 h-44 w-44 rounded-full bg-white" />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-2xl shadow-inner">
            {Icon ? <Icon className="h-5 w-5 text-white" /> : <span>{emoji ?? "✨"}</span>}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg sm:text-xl font-bold tracking-tight text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-white/75 line-clamp-2">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {stats.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur-sm"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", s.accent ?? "bg-white/70")} />
              <span className="text-xs text-white/80">{s.label}</span>
              <span className="text-sm font-bold tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

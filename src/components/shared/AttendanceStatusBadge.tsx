import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "ON_LEAVE"
  | "HALF_DAY"
  | "NOT_MARKED";

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
  variant?: "badge" | "card";
  animated?: boolean;
  size?: "sm" | "md" | "lg";
}

const STATUS_META: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT: {
    label: "Present",
    className: "bg-[hsl(var(--attendance-present-bg,152_60%_42%))] text-[var(--attendance-present-text,#fff)]",
  },
  ABSENT: {
    label: "Absent",
    className: "bg-[hsl(var(--attendance-absent-bg,0_72%_51%))] text-[var(--attendance-absent-text,#fff)]",
  },
  LATE: {
    label: "Late",
    className: "bg-[hsl(var(--attendance-late-bg,38_92%_50%))] text-[var(--attendance-late-text,#2e2722)]",
  },
  ON_LEAVE: {
    label: "On Leave",
    className: "bg-[hsl(var(--attendance-leave-bg,271_65%_55%))] text-[var(--attendance-leave-text,#fff)]",
  },
  HALF_DAY: {
    label: "Half Day",
    className: "bg-[hsl(var(--attendance-late-bg,38_92%_50%))] text-[var(--attendance-late-text,hsl(20_14%_16%))]",
  },
  NOT_MARKED: {
    label: "Not Marked",
    className: "bg-[hsl(var(--attendance-unmarked-bg,0_0%_96%))] text-[hsl(var(--attendance-unmarked-text,0_0%_40%))]",
  },
};

export default function AttendanceStatusBadge({
  status,
  variant = "badge",
  animated = true,
  size = "md",
}: AttendanceStatusBadgeProps) {
  const meta = STATUS_META[status] ?? STATUS_META.NOT_MARKED;
  const sizeClass =
    size === "sm"
      ? "text-xs px-2 py-0.5"
      : size === "lg"
        ? "text-sm px-3 py-1.5"
        : "text-xs px-2.5 py-1";

  const classes = cn(
    "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-300",
    variant === "card" ? "w-full rounded-xl py-2" : sizeClass,
    meta.className,
  );

  if (!animated) {
    return <span className={classes}>{meta.label}</span>;
  }

  return (
    <motion.span
      layout
      initial={{ opacity: 0.8, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={classes}
    >
      {meta.label}
    </motion.span>
  );
}

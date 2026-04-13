import {
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  Coffee,
  Flag,
  Handshake,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TeacherSlotType } from "@/services/types/teacher";

export const AT_RISK_THRESHOLD = 75;
export const LOW_ATTENDANCE_THRESHOLD = 80;

export const SLOT_STYLE_MAP: Record<TeacherSlotType, string> = {
  TEACHING: "border-primary/40 bg-primary/5",
  LEISURE: "border-dashed border-border bg-muted/30",
  BREAK: "border-amber-300/40 bg-amber-500/5",
  MEETING: "border-orange-400/40 bg-orange-500/5",
  EVENT: "border-violet-400/40 bg-violet-500/5",
};

export const SLOT_ICON_MAP: Record<TeacherSlotType, LucideIcon> = {
  TEACHING: BookOpen,
  LEISURE: Sparkles,
  BREAK: Coffee,
  MEETING: Handshake,
  EVENT: Flag,
};

export const ALERT_SEVERITY_CLASS: Record<"critical" | "warning" | "info" | "success", string> = {
  critical: "border-red-500/30 bg-red-500/10 text-red-700",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-700",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
};

export const ALERT_ICON_MAP = {
  attendance: CalendarCheck,
  reminder: Calendar,
  alert: Bell,
};

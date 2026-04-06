import { useMemo } from "react";
import { AlertTriangle, Bell, CheckCircle2, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  TeacherDashboardSummaryResponseDto,
  TeacherHomeroomResponseDto,
  TeacherScheduleResponseDto,
} from "@/services/types/teacher";

export type AlertSeverity = "critical" | "warning" | "info" | "success";

export type AlertItem = {
  id: string;
  severity: AlertSeverity;
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href: string };
  timestamp: Date;
};

const dayName = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export function useComputedAlerts(
  summary?: TeacherDashboardSummaryResponseDto,
  schedule?: TeacherScheduleResponseDto,
  homeroom?: TeacherHomeroomResponseDto
) {
  return useMemo(() => {
    const now = new Date();
    const alerts: AlertItem[] = [];

    if (summary?.alerts.atRiskStudentCount && summary.alerts.atRiskStudentCount > 0) {
      alerts.push({
        id: "risk",
        severity: "critical",
        icon: AlertTriangle,
        title: `${summary.alerts.atRiskStudentCount} at-risk students`,
        description: "Attendance has dropped below threshold for some students.",
        action: { label: "Open My Class", href: "/dashboard/teacher/my-class" },
        timestamp: now,
      });
    }

    if ((summary?.attendance.notMarked ?? 0) > 0) {
      alerts.push({
        id: "attendance-pending",
        severity: "warning",
        icon: Bell,
        title: "Attendance not fully marked",
        description: `${summary?.attendance.notMarked ?? 0} attendance records are pending today.`,
        action: { label: "Mark Attendance", href: "/dashboard/teacher/attendance" },
        timestamp: now,
      });
    }

    const todaysEntries = (schedule?.entries ?? []).filter((e) => e.dayOfWeek === dayName(now));
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const next = todaysEntries
      .filter((e) => e.slotType === "TEACHING" && toMinutes(e.timeslot.startTime) >= nowMinutes)
      .sort((a, b) => toMinutes(a.timeslot.startTime) - toMinutes(b.timeslot.startTime))[0];

    if (next) {
      const minsLeft = toMinutes(next.timeslot.startTime) - nowMinutes;
      if (minsLeft <= 15 && minsLeft >= 0) {
        alerts.push({
          id: "next-class",
          severity: "info",
          icon: Clock,
          title: "Next class starts soon",
          description: `${next.subject?.subjectName ?? "Class"} in ${minsLeft} min.`,
          action: { label: "View Schedule", href: "/dashboard/teacher/schedule" },
          timestamp: now,
        });
      }
    }

    if ((summary?.attendance.absent ?? 0) === 0 && (summary?.attendance.late ?? 0) === 0) {
      alerts.push({
        id: "perfect",
        severity: "success",
        icon: CheckCircle2,
        title: "Perfect attendance today",
        description: "No absences or late marks recorded so far.",
        timestamp: now,
      });
    }

    if (homeroom?.classTeacher && (homeroom.atRiskStudents?.length ?? 0) > 0) {
      alerts.push({
        id: "homeroom-risk",
        severity: "warning",
        icon: AlertTriangle,
        title: "Homeroom follow-up needed",
        description: `${homeroom.atRiskStudents?.length ?? 0} homeroom students need intervention.`,
        action: { label: "Open My Class", href: "/dashboard/teacher/my-class" },
        timestamp: now,
      });
    }

    return alerts.sort((a, b) => {
      const weight: Record<AlertSeverity, number> = {
        critical: 0,
        warning: 1,
        info: 2,
        success: 3,
      };
      return weight[a.severity] - weight[b.severity];
    });
  }, [homeroom, schedule, summary]);
}

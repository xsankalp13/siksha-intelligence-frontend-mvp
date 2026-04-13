import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsService } from "@/features/super-admin/services/superAdminService";
import { useAppSelector } from "@/store/hooks";

interface EditWindowGuardProps {
  attendanceDate: string;
  attendanceType: "staff" | "student";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function hasAdminBypass(roles: string[]): boolean {
  return roles
    .map((role) => role.toUpperCase().replace(/^ROLE_/, ""))
    .some((role) => role === "SUPER_ADMIN" || role === "SCHOOL_ADMIN" || role === "ADMIN");
}

export default function EditWindowGuard({
  attendanceDate,
  attendanceType,
  children,
  fallback = null,
}: EditWindowGuardProps) {
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);

  const { data, isError } = useQuery({
    queryKey: ["super", "settings", "attendance"],
    queryFn: () => settingsService.getSettings("ATTENDANCE").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on 403, fail open immediately
  });

  const isAllowed = useMemo(() => {
    if (hasAdminBypass(roles)) return true;
    if (isError) return true; // Optimistic fallback: if we can't load settings, let backend reject

    const attendanceSettings =
      (data as Record<string, { key: string; value: string }[]> | undefined)?.ATTENDANCE ?? [];

    const enabledSetting = attendanceSettings.find((s) => s.key === "attendance.edit.window.enabled");
    if (enabledSetting?.value === "false") return true;

    const teacherHoursSetting = attendanceSettings.find(
      (s) => s.key === "attendance.edit.window.teacher.hours",
    );
    const windowHours = Number(teacherHoursSetting?.value ?? "0");
    if (!Number.isFinite(windowHours) || windowHours <= 0) return true;

    const targetDate = new Date(`${attendanceDate}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) return true;

    const elapsedMs = Date.now() - targetDate.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    if (attendanceType === "student" || attendanceType === "staff") {
      return elapsedHours <= windowHours;
    }

    return true;
  }, [attendanceDate, attendanceType, data, roles]);

  return <>{isAllowed ? children : fallback}</>;
}

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import StaffSelfCheckIn from "@/features/teacher/components/StaffSelfCheckIn";
import StaffAttendanceCalendar from "@/features/teacher/components/StaffAttendanceCalendar";
import { useTeacherSchedule } from "@/features/teacher/queries/useTeacherQueries";
import { attendanceService } from "@/services/attendance";
import { format, endOfMonth, startOfMonth } from "date-fns";

export default function TeacherSelfAttendancePage() {
  const reduce = useReducedMotion();
  const { data: schedule } = useTeacherSchedule();
  const now = new Date();
  const fromDate = format(startOfMonth(now), "yyyy-MM-dd");
  const toDate = format(endOfMonth(now), "yyyy-MM-dd");

  const { data: monthData } = useQuery({
    queryKey: ["ams", "staff", "my-attendance", format(now, "yyyy-MM"), schedule?.staffUuid],
    queryFn: () => attendanceService.listStaffAttendance({
      staffUuid: schedule?.staffUuid,
      fromDate,
      toDate,
      size: 31,
    }).then(r => r.data),
    enabled: !!schedule?.staffUuid,
  });

  const stats = (() => {
    const all = monthData?.content ?? [];
    const p = all.filter(r => r.shortCode === "P").length;
    const a = all.filter(r => r.shortCode === "A").length;
    const l = all.filter(r => r.shortCode === "L").length;
    const lv = all.filter(r => r.shortCode === "LV").length;
    const total = p + a + l + lv;
    const pct = total === 0 ? 0 : ((p + l + lv) / total) * 100;
    return { p, a, l, lv, total, pct };
  })();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 pt-2">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Record your self check-in and review your monthly attendance.
        </p>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={reduce ? {} : { opacity: 1, y: 0 }}
        transition={reduce ? undefined : { duration: 0.25 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
      >
        {/* Left: Check-in + Monthly Stats */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
          <StaffSelfCheckIn />

          {/* Monthly Stats Mini Panel */}
          <div className="flex-1 rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {format(now, "MMMM yyyy")} Summary
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Present", value: stats.p, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Absent", value: stats.a, color: "text-red-600", bg: "bg-red-50" },
                { label: "Late", value: stats.l, color: "text-amber-500", bg: "bg-amber-50" },
                { label: "Leave", value: stats.lv, color: "text-violet-600", bg: "bg-violet-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 flex flex-col items-center`}>
                  <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 mt-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-muted-foreground font-medium">Attendance Rate</span>
                <span className="text-[11px] font-bold text-primary">{stats.pct.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, stats.pct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Calendar */}
        <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-5 shadow-sm h-full">
          <h2 className="text-lg font-semibold mb-4">Monthly Overview</h2>
          <StaffAttendanceCalendar />
        </div>
      </motion.div>
    </div>
  );
}

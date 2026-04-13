import { useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCcw, AlertTriangle, X, CheckCircle2, LogIn } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  teacherKeys,
  useTeacherClasses,
  useTeacherDashboardSummary,
  useTeacherHomeroom,
  useTeacherSchedule,
  useTeacherStudents,
} from "@/features/teacher/queries/useTeacherQueries";
import { useComputedAlerts } from "@/features/teacher/queries/useComputedAlerts";
import DailyBriefing from "@/features/teacher/components/DailyBriefing";
import KpiRibbon from "@/features/teacher/components/KpiRibbon";
import ScheduleTimeline from "@/features/teacher/components/ScheduleTimeline";
import QuickAttendanceGrid from "@/features/teacher/components/QuickAttendanceGrid";
import WeekTimetableOverview from "@/features/teacher/components/WeekTimetableOverview";
import AlertCenter from "@/features/teacher/components/AlertCenter";
import LeaveBalanceSummary from "@/features/teacher/components/LeaveBalanceSummary";
import AttendanceHeatmapCalendar from "@/features/teacher/components/AttendanceHeatmapCalendar";
import WeeklyTeachingChart from "@/features/teacher/components/WeeklyTeachingChart";
import AttendanceTrendChart from "@/features/teacher/components/AttendanceTrendChart";
import ClassDistributionChart from "@/features/teacher/components/ClassDistributionChart";
import DashboardSkeleton from "@/features/teacher/skeletons/DashboardSkeleton";
import { attendanceService } from "@/services/attendance";
import type { TeacherScheduleEntry } from "@/services/types/teacher";

const dayName = (d: Date) => d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
const dateKey = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function ServiceUnreachableState() {
  return (
    <div className="h-full min-h-[220px] rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 text-center">
      <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-rose-600" />
      <p className="text-sm text-muted-foreground">This widget is currently unavailable.</p>
    </div>
  );
}

export default function TeacherDashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const dismissKey = `teacher-alerts-dismissed-${dateKey()}`;
  const [alertsDismissed, setAlertsDismissed] = useState(false);

  const { data: summary, isLoading: summaryLoading, isError: summaryError, isFetching } = useTeacherDashboardSummary();
  const { data: schedule } = useTeacherSchedule();
  const { data: classes } = useTeacherClasses();
  const { data: homeroom } = useTeacherHomeroom();
  const { data: homeroomStudents } = useTeacherStudents(
    homeroom?.classTeacher && homeroom.sectionUuid ? { sectionUuid: homeroom.sectionUuid, page: 0, size: 100 } : undefined,
    Boolean(homeroom?.classTeacher && homeroom.sectionUuid)
  );

  const todaysEntries = useMemo(() => {
    const day = dayName(new Date());
    return (schedule?.entries ?? []).filter((entry: TeacherScheduleEntry) => entry.dayOfWeek === day);
  }, [schedule?.entries]);

  const alerts = useComputedAlerts(summary, schedule, homeroom);

  const { data: todayStaffAttendance } = useQuery({
    queryKey: ["ams", "staff", "my-attendance", "today", schedule?.staffUuid],
    queryFn: () =>
      attendanceService
        .listStaffAttendance({
          staffUuid: schedule?.staffUuid,
          fromDate: dateKey(),
          toDate: dateKey(),
          size: 1,
        })
        .then((r) => r.data.content[0]),
    enabled: Boolean(schedule?.staffUuid),
  });

  useEffect(() => {
    const dismissed = localStorage.getItem(dismissKey) === "1";
    setAlertsDismissed(dismissed);
  }, [dismissKey]);

  const dismissAlerts = () => {
    localStorage.setItem(dismissKey, "1");
    setAlertsDismissed(true);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: teacherKeys.all });
    toast.success("Teacher dashboard refreshed");
  };

  if (summaryError) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="mb-3 h-10 w-10 text-rose-600" />
        <h2 className="text-xl font-semibold">Unable to load dashboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">Please retry. Other modules are unaffected.</p>
        <Button className="mt-4" onClick={refresh}>
          <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (summaryLoading && !summary) {
    return <DashboardSkeleton />;
  }

  const isCheckedIn = Boolean(todayStaffAttendance?.timeIn);
  const checkInHoverLabel = todayStaffAttendance?.timeIn
    ? `Checked in at ${todayStaffAttendance.timeIn.slice(0, 5)}`
    : "Open My Attendance panel";

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12 pt-2">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <DailyBriefing
          teacherName={schedule?.teacherName}
          summary={summary}
          schedule={schedule}
          homeroom={homeroom}
        />

        <div className="flex items-center justify-end gap-2 lg:pt-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isFetching}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Syncing..." : "Refresh"}
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/dashboard/teacher/self-attendance")}
            title={checkInHoverLabel}
            className={isCheckedIn
              ? "border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              : "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md hover:from-emerald-600 hover:to-green-700"
            }
            variant={isCheckedIn ? "outline" : "default"}
          >
            {isCheckedIn ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Checked In {todayStaffAttendance?.timeIn ? `(${todayStaffAttendance.timeIn.slice(0, 5)})` : ""}
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Check In
              </>
            )}
          </Button>
        </div>
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={reduce ? {} : { opacity: 1, y: 0 }}
        transition={reduce ? undefined : { duration: 0.25 }}
        className="space-y-6"
      >
        <KpiRibbon summary={summary} />

        {!alertsDismissed && alerts.length > 0 ? (
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Alert Center</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={dismissAlerts}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ErrorBoundary fallback={<ServiceUnreachableState />}>
              <AlertCenter alerts={alerts} compact />
            </ErrorBoundary>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ErrorBoundary fallback={<ServiceUnreachableState />}>
              <WeeklyTeachingChart entries={schedule?.entries ?? []} />
            </ErrorBoundary>
          </div>
          <div className="lg:col-span-4">
            <ErrorBoundary fallback={<ServiceUnreachableState />}>
              <AttendanceTrendChart />
            </ErrorBoundary>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <ErrorBoundary fallback={<ServiceUnreachableState />}>
              <ClassDistributionChart classes={classes ?? []} />
            </ErrorBoundary>
          </div>
          <div className="lg:col-span-4">
            <ErrorBoundary fallback={<ServiceUnreachableState />}>
              <LeaveBalanceSummary />
            </ErrorBoundary>
          </div>
          <div className="lg:col-span-4">
            <ErrorBoundary fallback={<ServiceUnreachableState />}>
              <AttendanceHeatmapCalendar />
            </ErrorBoundary>
          </div>
        </div>

        {homeroom?.classTeacher ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold">Today&apos;s Timeline</h3>
                  <ScheduleTimeline entries={todaysEntries} />
                </div>
              </ErrorBoundary>
            </div>

            <div className="lg:col-span-7">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold">Quick Attendance</h3>
                  <QuickAttendanceGrid
                    students={homeroomStudents?.content ?? []}
                    sectionUuid={homeroom.sectionUuid!}
                    staffUuid={schedule?.staffUuid ?? ""}
                    onSubmitSuccess={() => queryClient.invalidateQueries({ queryKey: teacherKeys.summary() })}
                  />
                </div>
              </ErrorBoundary>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold">Today&apos;s Timeline</h3>
                  <ScheduleTimeline entries={todaysEntries} />
                </div>
              </ErrorBoundary>
            </div>
            <div className="lg:col-span-8">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold">This Week&apos;s Schedule</h3>
                  <WeekTimetableOverview entries={schedule?.entries ?? []} />
                </div>
              </ErrorBoundary>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

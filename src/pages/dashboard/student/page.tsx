import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { motion, type Variants } from "framer-motion";
import { RefreshCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStudentOverview, overviewKeys } from "@/features/student/dashboard/queries";
import { useQueryClient } from "@tanstack/react-query";
import {
  KpiRibbonWidget,
  DailyRoutineTimelineWidget,
  PendingTasksWidget,
  PerformanceChartWidget,
  NoticeBoardWidget
} from "@/features/student/dashboard/components/DashboardWidgets";
import {
  InteractiveQuickAccessBento,
  AttendanceInsightWidget,
  ExamCountdownWidget,
  LeaveStatusWidget,
  StreakBadgeWidget,
  TeacherConnectWidget,
} from "@/features/student/dashboard/components/DashboardWidgets2";
import { DashboardBentoSkeleton } from "@/features/student/dashboard/components/DashboardSkeletons";
import { ShikshaAIChatWidget } from "@/features/student/dashboard/components/ShikshaAIChatWidget";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 22 } }
};

function ServiceUnreachableState() {
  return (
    <div className="h-full border border-rose-500/20 bg-rose-500/5 rounded-xl flex flex-col items-center justify-center p-6 text-center shadow-sm min-h-[250px]">
      <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 opacity-80" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Service Unavailable</h3>
      <p className="text-sm text-muted-foreground">This segment is temporarily unreachable. The rest of your dashboard remains active.</p>
    </div>
  );
}

export default function StudentDashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, isFetching } = useStudentOverview();

  // Scroll to top on mount
  useEffect(() => window.scrollTo(0, 0), []);

  const handleManualRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: overviewKeys.all });
    toast.success("Dashboard synced with latest data", { duration: 2000 });
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-3">Unable to Load Dashboard</h2>
        <p className="text-muted-foreground mb-8 max-w-md">We couldn't connect to the student intelligence matrix. Please check your connection and try again.</p>
        <Button onClick={handleManualRefresh} size="lg" className="shadow-sm">
          <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 pt-4 px-2 sm:px-4">

      {/* ── Top Utility Bar ─────────────────────────────────────────── */}
      <div className="flex justify-end items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isFetching || isLoading}
          className="text-muted-foreground hover:text-foreground shadow-sm bg-background"
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${(isFetching || isLoading) ? "animate-spin" : ""}`} />
          {(isFetching || isLoading) ? "Syncing..." : "Refresh Pulse"}
        </Button>
      </div>

      {isLoading && !data ? (
        <DashboardBentoSkeleton />
      ) : (
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* ── ROW 1: KPI Ribbon (Profile + Attendance + Fees) ─────── */}
          <motion.div variants={itemVariants}>
            <KpiRibbonWidget profile={data?.profile} kpis={data?.kpis} />
          </motion.div>

          {/* ── ROW 2: Quick Access Bento ────────────────────────────── */}
          <motion.div variants={itemVariants}>
            <ErrorBoundary fallback={<ServiceUnreachableState />}>
              <InteractiveQuickAccessBento />
            </ErrorBoundary>
          </motion.div>

          {/* ── ROW 3: Today's Schedule + Exam Countdown ─────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-8 h-full">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <DailyRoutineTimelineWidget schedule={data?.todaySchedule} />
              </ErrorBoundary>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-4 h-full">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <ExamCountdownWidget assignments={data?.pendingAssignments} />
              </ErrorBoundary>
            </motion.div>
          </div>

          {/* ── ROW 4: Attendance Insights + Pending Tasks ───────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-5 h-full">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <AttendanceInsightWidget kpis={data?.kpis} schedule={data?.todaySchedule} />
              </ErrorBoundary>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-7 h-full">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <PendingTasksWidget assignments={data?.pendingAssignments} />
              </ErrorBoundary>
            </motion.div>
          </div>

          {/* ── ROW 5: Performance Chart + Notice Board ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-7 h-full">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <PerformanceChartWidget trends={data?.performanceTrend} />
              </ErrorBoundary>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-5 h-full">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <NoticeBoardWidget notices={data?.recentAnnouncements} />
              </ErrorBoundary>
            </motion.div>
          </div>

          {/* ── ROW 6: Leave Tracker + Streak Badges ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-5 h-full">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <LeaveStatusWidget />
              </ErrorBoundary>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-7 h-full">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <StreakBadgeWidget kpis={data?.kpis} />
              </ErrorBoundary>
            </motion.div>
          </div>

          {/* ── ROW 7: Teacher Connect ───────────────────────────────── */}
          {data?.todaySchedule && data.todaySchedule.length > 0 && (
            <motion.div variants={itemVariants}>
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <TeacherConnectWidget schedule={data?.todaySchedule} />
              </ErrorBoundary>
            </motion.div>
          )}

        </motion.div>
      )}

      {/* Floating AI Chat Widget */}
      <ShikshaAIChatWidget />
    </div>
  );
}

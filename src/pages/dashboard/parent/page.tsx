import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { motion, type Variants } from "framer-motion";
import { RefreshCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { parentKeys, useParentDashboard } from "@/features/parent/queries/useParentQueries";
import DashboardSkeleton from "@/features/parent/skeletons/DashboardSkeleton";
import { 
  ChildSummaryCard,
  AttendanceSummaryCard,
  PerformanceSummaryCard,
  FeesDueCard,
  HomeworkPendingCard,
  RecentNotificationsList
} from "@/features/parent/components/ParentDashboardWidgets";
import { useChildStore } from "@/features/parent/stores/useChildStore";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function ServiceUnreachableState() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center shadow-sm">
      <AlertTriangle className="mb-4 h-10 w-10 text-rose-500 opacity-80" />
      <h3 className="mb-2 text-base font-semibold text-foreground">Widget Unavailable</h3>
      <p className="text-sm text-muted-foreground">This section is temporarily unavailable.</p>
    </div>
  );
}

export default function ParentDashboardPage() {
  const queryClient = useQueryClient();
  const { selectedChildId } = useChildStore();
  const { data, isLoading, isError, isFetching } = useParentDashboard();

  useEffect(() => window.scrollTo(0, 0), []);

  const handleManualRefresh = async () => {
    if (selectedChildId) {
      await queryClient.invalidateQueries({ queryKey: parentKeys.dashboard(selectedChildId) });
      toast.success("Dashboard synced with latest data");
    }
  };

  if (!selectedChildId && !isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <h2 className="mb-3 text-2xl font-bold tracking-tight">Welcome to Parent Portal</h2>
        <p className="mb-8 max-w-md text-muted-foreground">Select a child from the top menu to view their intelligence matrix.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
          <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
        </div>
        <h2 className="mb-3 text-2xl font-bold tracking-tight">Unable to Load Dashboard</h2>
        <p className="mb-8 max-w-md text-muted-foreground">We couldn't retrieve the latest data for your child. Please try again.</p>
        <Button onClick={handleManualRefresh} size="lg" className="shadow-sm">
          <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 pb-12">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleManualRefresh} 
          disabled={isFetching || isLoading}
          className="bg-background text-muted-foreground hover:text-foreground shadow-sm"
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${(isFetching || isLoading) ? "animate-spin" : ""}`} />
          {(isFetching || isLoading) ? "Syncing..." : "Refresh Status"}
        </Button>
      </div>

      {isLoading && !data ? (
        <DashboardSkeleton />
      ) : data ? (
        <motion.div 
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Main Top Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Child Profile - Col Span 2 on large screens */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <ChildSummaryCard child={data.child} />
              </ErrorBoundary>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <AttendanceSummaryCard attendance={data.attendance} />
              </ErrorBoundary>
            </motion.div>

            <motion.div variants={itemVariants}>
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <PerformanceSummaryCard performance={data.performance} />
              </ErrorBoundary>
            </motion.div>
          </div>

          {/* Secondary Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <FeesDueCard fees={data.feesDue} />
              </ErrorBoundary>
            </motion.div>
            
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <HomeworkPendingCard homework={data.homeworkPending} />
              </ErrorBoundary>
            </motion.div>
            
            <motion.div variants={itemVariants} className="lg:col-span-4">
              <ErrorBoundary fallback={<ServiceUnreachableState />}>
                <RecentNotificationsList notifications={data.recentNotifications} />
              </ErrorBoundary>
            </motion.div>
          </div>

        </motion.div>
      ) : null}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CalendarRange } from "lucide-react";
import { hrmsService } from "@/services/hrms";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaveBalanceSummary() {
  const { data: balances, isLoading, isError } = useQuery({
    queryKey: ["hrms", "leave-balances", "me"],
    queryFn: () => hrmsService.getMyLeaveBalance().then((res) => res.data),
  });

  if (isError) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-center">
        <AlertCircle className="mb-2 h-8 w-8 text-rose-500" />
        <p className="text-sm font-medium text-rose-700">Failed to load leave balances</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[220px] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <CalendarRange className="h-4 w-4" />
          </div>
          <h3 className="text-base font-semibold">Leave Balances</h3>
        </div>
        {balances?.[0]?.academicYear && (
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {balances[0].academicYear}
          </span>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))
        ) : !balances || balances.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No active leave types found.
          </div>
        ) : (
          balances.map((balance) => {
            const used = balance.used || 0;
            const total = balance.totalQuota || 1; // avoid division by zero
            const percentage = Math.min(100, Math.max(0, (used / total) * 100));
            
            // Color logic based on usage
            let progressColor = "bg-emerald-500";
            if (percentage > 85) progressColor = "bg-rose-500";
            else if (percentage > 60) progressColor = "bg-amber-500";

            return (
              <div key={balance.balanceId} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{balance.leaveTypeCode}</span>
                  <span className="text-muted-foreground">
                    <strong className="text-foreground">{balance.remaining}</strong> / {balance.totalQuota} left
                  </span>
                </div>
                <Progress 
                  value={percentage} 
                  className="h-2" 
                  indicatorClassName={progressColor} 
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

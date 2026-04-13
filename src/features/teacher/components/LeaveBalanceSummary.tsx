import { useMemo } from "react";
import { Briefcase, CalendarOff, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { hrmsService } from "@/services/hrms";
import type { LeaveBalanceResponseDTO } from "@/services/types/hrms";

const DOT_COLORS = [
  "text-emerald-500 fill-emerald-500",
  "text-amber-500 fill-amber-500",
  "text-blue-500 fill-blue-500",
  "text-purple-500 fill-purple-500",
  "text-rose-500 fill-rose-500",
] as const;

export default function LeaveBalanceSummary() {
  const { data } = useQuery({
    queryKey: ["teacher", "leave-balance"],
    queryFn: async () => (await hrmsService.getMyLeaveBalance()).data,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const leaveRows = useMemo(() => {
    return (data ?? []).map((item: LeaveBalanceResponseDTO) => {
      const totalQuota = Number(item.totalQuota ?? 0);
      const used = Number(item.used ?? 0);
      const remaining = Number(item.remaining ?? Math.max(0, totalQuota - used));
      const progress = totalQuota > 0 ? Math.min(100, Math.max(0, (used / totalQuota) * 100)) : 0;
      return {
        key: `${item.leaveTypeCode}-${item.balanceId}`,
        name: item.leaveTypeName || item.leaveTypeCode,
        used,
        totalQuota,
        remaining,
        progress,
      };
    });
  }, [data]);

  const totalRemaining = useMemo(
    () => leaveRows.reduce((sum, row) => sum + row.remaining, 0),
    [leaveRows],
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Leave Balance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {leaveRows.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <CalendarOff className="h-6 w-6 opacity-60" />
            <p className="text-sm">No leave data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaveRows.map((row, index) => (
              <div key={row.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Circle className={`h-3 w-3 ${DOT_COLORS[index % DOT_COLORS.length]}`} />
                    <span className="truncate">{row.name}</span>
                  </span>
                  <span className="font-semibold">
                    {row.totalQuota > 0 ? `${row.used}/${row.totalQuota}` : `${row.remaining} remaining`}
                  </span>
                </div>
                {row.totalQuota > 0 ? <Progress value={row.progress} /> : null}
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 text-sm">
              <span className="font-medium text-muted-foreground">Total</span>
              <span className="font-semibold">{totalRemaining}</span>
            </div>
          </div>
        )}
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/dashboard/teacher/my-hr"><Briefcase className="mr-2 h-4 w-4" />Apply Leave</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

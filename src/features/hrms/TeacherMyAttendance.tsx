import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hrmsService } from "@/services/hrms";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-emerald-500 text-white",
  ABSENT: "bg-red-500 text-white",
  LEAVE: "bg-amber-500 text-white",
  HOLIDAY: "bg-blue-400 text-white",
  WEEKEND: "bg-muted text-muted-foreground",
};

const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-emerald-500",
  ABSENT: "bg-red-500",
  LEAVE: "bg-amber-500",
  HOLIDAY: "bg-blue-400",
  WEEKEND: "bg-muted-foreground/30",
};

export default function TeacherMyAttendance() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["hrms", "self", "attendance", year, month],
    queryFn: async () => {
      try {
        return (await hrmsService.getMyAttendanceSummary({ year, month })).data;
      } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 403)) {
          return {
            periodLabel: `${MONTH_NAMES[month - 1]} ${year}`,
            totalDays: 0,
            presentDays: 0,
            absentDays: 0,
            leaveDays: 0,
            holidays: 0,
            attendancePercentage: 0,
            dailyRecords: [],
          };
        }
        throw err;
      }
    },
  });

  const calCells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const recordMap = new Map<number, string>();
    for (const r of data?.dailyRecords ?? []) {
      const d = new Date(r.date).getDate();
      recordMap.set(d, r.status);
    }

    const cells: Array<{ day: number | null; status: string | null; isToday: boolean }> = [];

    for (let i = 0; i < offset; i++) cells.push({ day: null, status: null, isToday: false });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const isToday = dateObj.toDateString() === now.toDateString();
      const dow = dateObj.getDay();
      let status = recordMap.get(d) ?? null;
      if (!status && (dow === 0 || dow === 6)) status = "WEEKEND";
      cells.push({ day: d, status, isToday });
    }

    return cells;
  }, [year, month, data?.dailyRecords, now]);

  const pct = data?.attendancePercentage ?? 0;
  const isEmpty = !data?.dailyRecords?.length;

  return (
    <div className="space-y-5">
      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatMini label="Total Days" value={data?.totalDays ?? 0} loading={isLoading} />
        <StatMini label="Present" value={data?.presentDays ?? 0} loading={isLoading} color="text-emerald-600" />
        <StatMini label="Absent" value={data?.absentDays ?? 0} loading={isLoading} color="text-red-600" />
        <StatMini label="Leave" value={data?.leaveDays ?? 0} loading={isLoading} color="text-amber-600" />
        <StatMini label="Attendance %" value={`${pct.toFixed(1)}%`} loading={isLoading} color="text-primary" />
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {isEmpty && !isLoading ? (
            <div className="py-8 text-center">
              <CalendarX className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">No attendance record found for {MONTH_NAMES[month - 1]} {year}</p>
              <p className="mt-1 text-xs text-muted-foreground">Records will appear here once attendance is tracked.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="py-1 text-[10px] font-semibold text-muted-foreground">{d}</div>
                ))}
                {calCells.map((cell, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-md text-xs font-medium transition-colors",
                      cell.day === null && "invisible",
                      cell.isToday && "ring-2 ring-primary/50",
                      cell.status ? STATUS_COLOR[cell.status] ?? "bg-muted/50" : "bg-muted/20 text-muted-foreground"
                    )}
                  >
                    {cell.day}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                {Object.entries(STATUS_DOT).map(([status, color]) => (
                  <span key={status} className="flex items-center gap-1">
                    <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatMini({
  label,
  value,
  loading,
  color,
}: {
  label: string;
  value: number | string;
  loading: boolean;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", color ?? "text-foreground")}>
        {loading ? "..." : value}
      </p>
    </div>
  );
}

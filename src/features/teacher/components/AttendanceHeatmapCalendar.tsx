import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceService } from "@/services/attendance";
import { cn } from "@/lib/utils";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type DayBucket = {
  present: number;
  total: number;
};

function monthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    fromDate: dayKey(start),
    toDate: dayKey(end),
  };
}

function colorFor(pct: number | null) {
  if (pct === null) return "bg-muted";
  if (pct >= 95) return "bg-emerald-600/70";
  if (pct >= 85) return "bg-emerald-400/50";
  if (pct >= 75) return "bg-amber-500/60";
  return "bg-red-500/60";
}

function tooltipLabel(date: Date, pct: number | null, present: number, total: number) {
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (pct === null) return `${label}: No data`;
  return `${label}: ${pct.toFixed(1)}% (${present}/${total})`;
}

function weekdayMonZero(date: Date) {
  return (date.getDay() + 6) % 7;
}

export default function AttendanceHeatmapCalendar() {
  const { fromDate, toDate } = useMemo(() => monthRange(), []);

  const { data } = useQuery({
    queryKey: ["teacher", "attendance-heatmap", fromDate, toDate],
    queryFn: async () =>
      (await attendanceService.listStudentAttendance({
        fromDate,
        toDate,
        page: 0,
        size: 1000,
      })).data,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const buckets = useMemo(() => {
    const map = new Map<string, DayBucket>();
    (data?.content ?? []).forEach((record) => {
      const key = String(record.attendanceDate).slice(0, 10);
      const prev = map.get(key) ?? { present: 0, total: 0 };
      prev.total += 1;
      if (record.attendanceTypeShortCode === "P") prev.present += 1;
      map.set(key, prev);
    });
    return map;
  }, [data?.content]);

  const days = useMemo(() => {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const result: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push(new Date(d));
    }
    return result;
  }, [fromDate, toDate]);

  const leadingSpacers = useMemo(() => {
    const first = new Date(fromDate);
    return weekdayMonZero(first);
  }, [fromDate]);

  const todayKey = dayKey(new Date());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attendance Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 grid grid-cols-7 gap-1">
          {WEEK_DAYS.map((day) => (
            <p key={day} className="text-center text-[10px] font-medium text-muted-foreground">
              {day}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingSpacers }).map((_, idx) => (
            <div key={`spacer-${idx}`} className="h-9" aria-hidden />
          ))}
          {days.map((date) => {
            const key = dayKey(date);
            const bucket = buckets.get(key);
            const present = bucket?.present ?? 0;
            const total = bucket?.total ?? 0;
            const pct = total > 0 ? (present / total) * 100 : null;
            const isToday = key === todayKey;
            return (
              <div key={key} className="text-center">
                <div
                  title={tooltipLabel(date, pct, present, total)}
                  className={cn(
                    "mx-auto h-7 w-7 rounded",
                    colorFor(pct),
                    isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                  )}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">{date.getDate()}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-600/70" /> {">= 95%"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-400/50" /> {"85-95%"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-500/60" /> {"75-85%"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500/60" /> {"< 75%"}</span>
          <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted" /> No data</span>
        </div>
      </CardContent>
    </Card>
  );
}

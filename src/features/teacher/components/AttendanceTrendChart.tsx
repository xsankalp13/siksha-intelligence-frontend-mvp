import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { attendanceService } from "@/services/attendance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type TrendPoint = {
  date: string;
  fullDate: string;
  percentage: number;
  present: number;
  total: number;
};

function AttendanceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: TrendPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow">
      <p>{`${point.date}: ${point.percentage.toFixed(1)}% (${point.present}/${point.total} present)`}</p>
    </div>
  );
}

export default function AttendanceTrendChart() {
  const { fromDate, toDate } = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return {
      fromDate: thirtyDaysAgo.toISOString().slice(0, 10),
      toDate: today.toISOString().slice(0, 10),
    };
  }, []);

  // Resolve current school's present short code from types config
  const { data: attendanceTypes } = useQuery({
    queryKey: ["ams", "types"],
    queryFn: async () => (await attendanceService.getAllTypes()).data,
    staleTime: 5 * 60 * 1000,
  });
  const presentCode = useMemo(
    () => attendanceTypes?.find((t) => t.presentMark)?.shortCode ?? "P",
    [attendanceTypes]
  );

  const { data } = useQuery({
    queryKey: ["teacher", "attendance-trend", fromDate, toDate],
    queryFn: async () =>
      (await attendanceService.listStudentAttendance({
        fromDate,
        toDate,
        page: 0,
        size: 9999,
      })).data,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const chartData = useMemo<TrendPoint[]>(() => {
    const byDate = new Map<string, { present: number; total: number }>();

    (data?.content ?? []).forEach((record) => {
      const key = String(record.attendanceDate).slice(0, 10);
      const prev = byDate.get(key) ?? { present: 0, total: 0 };
      prev.total += 1;
      if (record.attendanceTypeShortCode === presentCode) prev.present += 1;
      byDate.set(key, prev);
    });

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fullDate, counts]) => {
        const date = new Date(fullDate);
        return {
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          fullDate,
          percentage: counts.total > 0 ? (counts.present / counts.total) * 100 : 0,
          present: counts.present,
          total: counts.total,
        };
      });
  }, [data?.content]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Attendance Trend</CardTitle>
        <CardDescription>Last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <Activity className="h-6 w-6 opacity-60" />
            <p className="text-sm">No attendance data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(152 57% 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(152 57% 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                interval={0}
                tickFormatter={(value, index) => (index % 5 === 0 ? String(value) : "")}
              />
              <YAxis
                domain={[0, 100]}
                width={35}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<AttendanceTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <ReferenceLine
                y={75}
                stroke="hsl(0 84% 60%)"
                strokeDasharray="5 5"
                label={{ value: "75%", position: "right", fontSize: 10 }}
              />
              <Area
                type="monotone"
                dataKey="percentage"
                stroke="hsl(152 57% 50%)"
                strokeWidth={2}
                fill="url(#attendanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

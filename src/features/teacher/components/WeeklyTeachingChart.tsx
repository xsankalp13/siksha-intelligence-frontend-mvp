import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeacherScheduleEntry } from "@/services/types/teacher";

type Props = {
  entries: TeacherScheduleEntry[];
};

type ChartPoint = {
  day: string;
  teaching: number;
  free: number;
  break: number;
  isToday: boolean;
};

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

function formatHours(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}h`;
}

function WeeklyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; dataKey?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const findValue = (key: string) => Number(payload.find((item) => item.dataKey === key)?.value ?? 0);
  const teaching = findValue("teaching");
  const free = findValue("free");
  const breakHours = findValue("break");

  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow">
      <p className="mb-1 font-semibold">{label}</p>
      <p>Teaching: {formatHours(teaching)}</p>
      <p>Free: {formatHours(free)}</p>
      <p>Break: {formatHours(breakHours)}</p>
    </div>
  );
}

export default function WeeklyTeachingChart({ entries }: Props) {
  const chartData = useMemo<ChartPoint[]>(() => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();

    return DAYS.map((day, index) => {
      const dayEntries = entries.filter((entry) => entry.dayOfWeek === day);
      const agg = dayEntries.reduce(
        (sum, entry) => {
          const duration = Math.max(
            0,
            (toMinutes(entry.timeslot.endTime) - toMinutes(entry.timeslot.startTime)) / 60,
          );

          if (entry.slotType === "TEACHING") {
            sum.teaching += duration;
          } else if (entry.slotType === "LEISURE") {
            sum.free += duration;
          } else {
            sum.break += duration;
          }
          return sum;
        },
        { teaching: 0, free: 0, break: 0 },
      );

      return {
        day: LABELS[index],
        teaching: Number(agg.teaching.toFixed(2)),
        free: Number(agg.free.toFixed(2)),
        break: Number(agg.break.toFixed(2)),
        isToday: day === today,
      };
    });
  }, [entries]);

  const hasData = chartData.some((item) => item.teaching > 0 || item.free > 0 || item.break > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Weekly Teaching Load</CardTitle>
        <CardDescription>Hours by day</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No schedule data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                width={35}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip content={<WeeklyTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} />
              <Bar dataKey="free" stackId="a" fill="hsl(var(--muted-foreground) / 0.2)">
                {chartData.map((item) => (
                  <Cell
                    key={`free-${item.day}`}
                    fill={item.isToday ? "hsl(var(--muted-foreground) / 0.35)" : "hsl(var(--muted-foreground) / 0.2)"}
                  />
                ))}
              </Bar>
              <Bar dataKey="break" stackId="a" fill="hsl(38 92% 50% / 0.6)">
                {chartData.map((item) => (
                  <Cell
                    key={`break-${item.day}`}
                    fill={item.isToday ? "hsl(38 92% 50% / 0.78)" : "hsl(38 92% 50% / 0.6)"}
                  />
                ))}
              </Bar>
              <Bar dataKey="teaching" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                {chartData.map((item) => (
                  <Cell
                    key={`teaching-${item.day}`}
                    fill={item.isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.75)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

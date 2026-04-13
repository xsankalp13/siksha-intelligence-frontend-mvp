import { useMemo } from "react";
import { GraduationCap } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TeacherMyClassesResponseDto } from "@/services/types/teacher";

type Props = {
  classes: TeacherMyClassesResponseDto[];
};

type ChartPoint = {
  name: string;
  value: number;
  subjects: number;
};

const COLORS = [
  "hsl(220, 70%, 55%)",
  "hsl(152, 57%, 50%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 50%)",
] as const;

function ClassTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ChartPoint }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow">
      <p>{`${point.name}: ${point.value} students, ${point.subjects} subjects`}</p>
    </div>
  );
}

export default function ClassDistributionChart({ classes }: Props) {
  const chartData = useMemo<ChartPoint[]>(() => {
    return classes.map((c) => ({
      name: `${c.className}-${c.sectionName}`,
      value: Number(c.studentCount ?? 0),
      subjects: c.subjects?.length ?? 0,
    }));
  }, [classes]);

  const totalStudents = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData],
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Class Distribution</CardTitle>
        <CardDescription>Students by class</CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <GraduationCap className="h-6 w-6 opacity-60" />
            <p className="text-sm">No classes assigned</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`pie-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ClassTooltip />} />
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">
                  {totalStudents}
                </text>
                <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
                  students
                </text>
              </PieChart>
            </ResponsiveContainer>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {chartData.map((item, index) => (
                <div key={item.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span>({item.value})</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

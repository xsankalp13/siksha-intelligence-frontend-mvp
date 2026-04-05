import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";

export default function TeacherMyAttendance() {
  const current = new Date();
  const [year, setYear] = useState(current.getFullYear());
  const [month, setMonth] = useState(current.getMonth() + 1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "self", "attendance", year, month],
    queryFn: () => hrmsService.getMyAttendanceSummary({ year, month }).then((res) => res.data),
  });

  if (isError) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
        <p className="text-sm text-destructive">{normalizeHrmsError(error).message}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="number"
          min={2000}
          max={2100}
          value={year}
          onChange={(e) => setYear(Number(e.target.value || current.getFullYear()))}
          className="w-[120px]"
        />
        <Input
          type="number"
          min={1}
          max={12}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value || current.getMonth() + 1))}
          className="w-[100px]"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-5">
          <p>Period: <span className="font-semibold">{isLoading ? "..." : data?.periodLabel ?? "-"}</span></p>
          <p>Total: <span className="font-semibold">{isLoading ? "..." : data?.totalDays ?? 0}</span></p>
          <p>Present: <span className="font-semibold">{isLoading ? "..." : data?.presentDays ?? 0}</span></p>
          <p>Absent: <span className="font-semibold">{isLoading ? "..." : data?.absentDays ?? 0}</span></p>
          <p>Leave: <span className="font-semibold">{isLoading ? "..." : data?.leaveDays ?? 0}</span></p>
        </CardContent>
      </Card>
    </div>
  );
}

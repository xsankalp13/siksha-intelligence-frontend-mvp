import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable, { type Column } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { attendanceService } from "@/services/attendance";
import { normalizeHrmsError } from "@/services/hrms";
import type { StaffAttendanceResponseDTO } from "@/services/types/attendance";

export default function StaffAttendanceTab() {
  const [date, setDate] = useState("");
  const { formatDate } = useHrmsFormatters();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["hrms", "staff-attendance", date],
    queryFn: () =>
      attendanceService
        .listStaffAttendance({ page: 0, size: 100, sort: "attendanceDate,desc", date: date || undefined })
        .then((res) => res.data),
  });

  const rows = data?.content ?? [];

  const columns = useMemo<Column<StaffAttendanceResponseDTO>[]>(
    () => [
      { key: "staffName", header: "Staff", searchable: true },
      { key: "jobTitle", header: "Job Title", searchable: true, render: (row) => row.jobTitle || "-" },
      {
        key: "attendanceDate",
        header: "Date",
        render: (row) => formatDate(row.attendanceDate),
      },
      { key: "shortCode", header: "Code", searchable: true, className: "font-mono" },
      { key: "attendanceMark", header: "Mark", searchable: true },
      { key: "source", header: "Source", searchable: true },
      { key: "totalHours", header: "Hours", render: (row) => row.totalHours ?? "-" },
      { key: "notes", header: "Notes", render: (row) => row.notes || "-" },
    ],
    [formatDate]
  );

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
      <div className="flex items-center gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[220px]" />
        <Button variant="outline" size="sm" onClick={() => setDate("")}>Clear</Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.uuid ?? row.staffAttendanceId ?? `${row.staffName}-${row.attendanceDate}-${row.shortCode}`}
        emptyMessage={isLoading ? "Loading attendance..." : "No attendance records found."}
      />
    </div>
  );
}

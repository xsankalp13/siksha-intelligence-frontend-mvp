import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Search, ChevronLeft, ChevronRight, Users, UserCheck, UserX, Clock } from "lucide-react";
import { getLocalDateString } from "@/lib/dateUtils";
import type { StudentAttendanceResponseDTO } from "@/services/types/attendance";

type StatusFilter = "ALL" | "P" | "A" | "L" | "LV";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  P: { label: "Present", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  A: { label: "Absent", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  L: { label: "Late", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  LV: { label: "On Leave", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  HD: { label: "Half Day", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
};

function StatusBadge({ code }: { code: string }) {
  const cfg = STATUS_CONFIG[code] ?? { label: code, bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  return (
    <Badge variant="outline" className={`${cfg.bg} ${cfg.text} ${cfg.border} font-semibold px-3 py-1`}>
      {cfg.label}
    </Badge>
  );
}

function StatusDot({ code }: { code: string }) {
  const colorMap: Record<string, string> = {
    P: "bg-emerald-500",
    A: "bg-red-500",
    L: "bg-amber-500",
    LV: "bg-violet-500",
    HD: "bg-orange-500",
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[code] ?? "bg-gray-400"}`} />;
}

export default function StudentAttendanceReview() {
  const today = getLocalDateString();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["ams", "student", "attendance-review", fromDate, toDate, statusFilter, page],
    queryFn: () =>
      attendanceService
        .listStudentAttendance({
          fromDate,
          toDate,
          attendanceTypeShortCode: statusFilter !== "ALL" ? statusFilter : undefined,
          page,
          size: pageSize,
          sort: "attendanceDate,desc",
        })
        .then((r) => r.data),
  });

  const records = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const t = search.toLowerCase();
    return records.filter(
      (r) =>
        r.studentFullName?.toLowerCase().includes(t) ||
        r.takenByStaffName?.toLowerCase().includes(t)
    );
  }, [records, search]);

  // Stats from current page
  const stats = useMemo(() => {
    const present = records.filter((r) => r.attendanceTypeShortCode === "P").length;
    const absent = records.filter((r) => r.attendanceTypeShortCode === "A").length;
    const late = records.filter((r) => r.attendanceTypeShortCode === "L").length;
    return { present, absent, late, total: records.length };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Student Attendance</h2>
            <p className="text-sm text-muted-foreground">
              {totalElements} record{totalElements !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
            className="w-[160px] h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(0); }}
            className="w-[160px] h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="P">
              <span className="flex items-center gap-2"><StatusDot code="P" /> Present</span>
            </SelectItem>
            <SelectItem value="A">
              <span className="flex items-center gap-2"><StatusDot code="A" /> Absent</span>
            </SelectItem>
            <SelectItem value="L">
              <span className="flex items-center gap-2"><StatusDot code="L" /> Late</span>
            </SelectItem>
            <SelectItem value="LV">
              <span className="flex items-center gap-2"><StatusDot code="LV" /> On Leave</span>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student or staff name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total (Page)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Present</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <UserX className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm">Loading attendance records...</p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No records found</p>
              <p className="text-xs mt-1">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Marked By</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((row) => (
                    <tr
                      key={row.uuid}
                      className={`transition-colors hover:bg-muted/30 ${
                        row.attendanceTypeShortCode === "A"
                          ? "bg-red-50/40"
                          : row.attendanceTypeShortCode === "L"
                            ? "bg-amber-50/40"
                            : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {(row.studentFullName || "?")[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">
                            {row.studentFullName || "Unknown Student"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {row.attendanceDate}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge code={row.attendanceTypeShortCode} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.takenByStaffName || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                        {row.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, totalElements)} of {totalElements}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{page + 1} / {totalPages}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

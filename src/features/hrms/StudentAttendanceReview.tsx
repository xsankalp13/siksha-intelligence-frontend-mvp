import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceService } from "@/services/attendance";
import { academicClassService } from "@/services/academicClass";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditStudentAttendanceDialog, StudentAttendanceHistoryDialog } from "./StudentAttendanceReviewDialogs";
import { GraduationCap, Search, ChevronLeft, ChevronRight, Users, UserCheck, UserX, Clock, Edit } from "lucide-react";
import { getLocalDateString } from "@/lib/dateUtils";

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

type AttendanceRow = {
  uuid?: string;
  studentId?: number;
  studentUuid?: string;
  studentFullName?: string | null;
  studentName?: string | null;
  studentDisplayName?: string | null;
  attendanceDate: string;
  attendanceTypeShortCode: string;
  takenByStaffId?: number;
  takenByStaffUuid?: string;
  takenByStaffName?: string | null;
  takenByName?: string | null;
  markedByName?: string | null;
  notes?: string | null;
  note?: string | null;
  remarks?: string | null;
  createdBy?: string;
  student?: { fullName?: string; firstName?: string; lastName?: string; name?: string };
  takenByStaff?: { fullName?: string; firstName?: string; lastName?: string; name?: string };
  takenBy?: { fullName?: string; firstName?: string; lastName?: string; name?: string };
};


const pickFirstString = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
};

const resolvePersonName = (person?: { fullName?: string; firstName?: string; lastName?: string; name?: string }) => {
  if (!person) return undefined;
  const full = pickFirstString(person.fullName, person.name);
  if (full) return full;
  const combined = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
  return combined || undefined;
};

const resolveStudentName = (row: AttendanceRow) =>
  pickFirstString(row.studentFullName, row.studentName, row.studentDisplayName, resolvePersonName(row.student));

const resolveMarkedByName = (row: AttendanceRow) =>
  pickFirstString(row.takenByStaffName, row.markedByName, row.takenByName, resolvePersonName(row.takenByStaff), resolvePersonName(row.takenBy));

const resolveNotes = (row: AttendanceRow) => pickFirstString(row.notes, row.note, row.remarks);


export default function StudentAttendanceReview() {
  const today = getLocalDateString();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [classFilter, setClassFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [editRecord, setEditRecord] = useState<AttendanceRow | null>(null);
  const [historyStudent, setHistoryStudent] = useState<{ uuid?: string, studentId?: number, name?: string } | null>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ["academic", "classes"],
    queryFn: () => academicClassService.getAllClasses(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["academic", "sections", classFilter],
    queryFn: () => academicClassService.getSectionsForClass(classFilter),
    enabled: classFilter !== "ALL",
    staleTime: 10 * 60 * 1000,
  });

  // no per-class student fetch needed - backend now returns class/section metadata and names

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ams", "student", "attendance-review", fromDate, toDate, statusFilter, classFilter, sectionFilter, search, page],
    queryFn: () =>
      attendanceService
        .listStudentAttendance({
          fromDate,
          toDate,
          attendanceTypeShortCode: statusFilter !== "ALL" ? statusFilter : undefined,
          classUuid: classFilter !== "ALL" ? classFilter : undefined,
          sectionUuid: sectionFilter !== "ALL" ? sectionFilter : undefined,
          search: search.trim() || undefined,
          page,
          size: pageSize,
          sort: "attendanceDate,desc",
        })
        .then((r) => r.data),
  });

  const records: AttendanceRow[] = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // backend now enriches names and provides class/section fields; no per-row enrichment needed

  // server-side search is used; frontend will render server-provided rows directly
  const filtered = records;

  const stats = useMemo(() => {
    const present = records.filter((r) => r.attendanceTypeShortCode === "P").length;
    const absent = records.filter((r) => r.attendanceTypeShortCode === "A").length;
    const late = records.filter((r) => r.attendanceTypeShortCode === "L").length;
    return { present, absent, late, total: records.length };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* existing head and filters */}
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
            className="w-[160px] h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
            className="w-[160px] h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => {
          setStatusFilter(v as StatusFilter);
          setPage(0);
        }}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="P"><span className="flex items-center gap-2"><StatusDot code="P" /> Present</span></SelectItem>
            <SelectItem value="A"><span className="flex items-center gap-2"><StatusDot code="A" /> Absent</span></SelectItem>
            <SelectItem value="L"><span className="flex items-center gap-2"><StatusDot code="L" /> Late</span></SelectItem>
            <SelectItem value="LV"><span className="flex items-center gap-2"><StatusDot code="LV" /> On Leave</span></SelectItem>
          </SelectContent>
        </Select>

        <Select value={classFilter} onValueChange={(value) => {
          setClassFilter(value);
          setSectionFilter("ALL");
          setPage(0);
        }}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.classId} value={c.classId}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sectionFilter} onValueChange={(value) => {
          setSectionFilter(value);
          setPage(0);
        }}>
          <SelectTrigger className="w-[170px] h-9">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s.uuid} value={s.sectionName}>{s.sectionName}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student or staff name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total (Filtered)</p>
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
            <div className="max-h-[58vh] overflow-auto">
              <table className="w-full min-w-[760px] text-sm text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80">
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Student</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Date</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Marked By</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Notes</th>
                    <th className="px-4 py-3 font-semibold text-right text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border cursor-pointer">
                  {filtered.map((row) => {
                    const studentName = resolveStudentName(row) || "Unknown Student";
                    const markedByName = resolveMarkedByName(row) || "—";
                    const notes = resolveNotes(row) || "—";

                    return (
                      <tr
                        key={row.uuid}
                        onClick={() => setHistoryStudent({ uuid: row.studentUuid, studentId: row.studentId, name: studentName })}
                        className={`transition-colors hover:bg-muted/40 ${
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
                              {(studentName || "?")[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-foreground">{studentName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.attendanceDate}</td>
                        <td className="px-4 py-3"><StatusBadge code={row.attendanceTypeShortCode} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{markedByName}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs max-w-[220px] truncate">{notes}</td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditRecord({ ...row, studentFullName: studentName });
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

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

      <EditStudentAttendanceDialog
        open={!!editRecord}
        onOpenChange={(o) => (!o ? setEditRecord(null) : null)}
        record={editRecord}
        onSuccess={() => refetch()}
      />

      <StudentAttendanceHistoryDialog
        open={!!historyStudent}
        onOpenChange={(o) => (!o ? setHistoryStudent(null) : null)}
        studentInfo={historyStudent}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, FileText, Lock, Shield, Table2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EditWindowGuard from "@/components/shared/EditWindowGuard";
import { useTeacherCtClasses, useTeacherCtStudents, useTeacherSchedule } from "@/features/teacher/queries/useTeacherQueries";
import { useSectionAttendance } from "@/features/teacher/queries/useAttendanceQueries";
import ClassSelector from "@/features/teacher/components/ClassSelector";
import QuickAttendanceGrid from "@/features/teacher/components/QuickAttendanceGrid";
import { attendanceService } from "@/services/attendance";
import { teacherService } from "@/services/teacherService";

// ── Export helpers ────────────────────────────────────────────────────

function getDateRange(option: "day" | "week" | "month", base: string) {
  const d = new Date(`${base}T12:00:00`);
  if (option === "day") return { from: base, to: base };
  if (option === "week") {
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) };
  }
  // month
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

function buildRows(records: { studentUuid?: string; studentFullName?: string; attendanceDate?: string; attendanceTypeShortCode?: string }[]) {
  return records.map((r) => ({
    Date: r.attendanceDate ?? "",
    Student: r.studentFullName ?? "",
    Status: r.attendanceTypeShortCode ?? "",
  }));
}

function downloadAsCSV(rows: ReturnType<typeof buildRows>, filename: string) {
  if (rows.length === 0) { toast.warning("No records to export"); return; }
  const header = Object.keys(rows[0]).join(",");
  const lines = rows.map((r) => Object.values(r).map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadAsXLSX(rows: ReturnType<typeof buildRows>, filename: string) {
  if (rows.length === 0) { toast.warning("No records to export"); return; }
  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto-width columns
  const colWidths = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length, ...rows.map((r) => String(r[k as keyof typeof r]).length)) + 2 }));
  ws["!cols"] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, filename);
}

export default function TeacherAttendancePage() {
  const { data: classes = [], isLoading } = useTeacherCtClasses();
  const { data: schedule } = useTeacherSchedule();
  const staffUuid = schedule?.staffUuid ?? "";
  const defaultSelection = classes[0] ? `${classes[0].classUuid}:${classes[0].sectionUuid}` : "";
  const [selectedClass, setSelectedClass] = useState(defaultSelection);
  const [downloading, setDownloading] = useState(false);

  const today = new Date();
  const maxDate = today.toISOString().split("T")[0];
  const minDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(maxDate);

  useEffect(() => {
    if (!selectedClass && defaultSelection) {
      setSelectedClass(defaultSelection);
    }
  }, [defaultSelection, selectedClass]);

  const selectedSectionUuid = useMemo(() => selectedClass.split(":")[1], [selectedClass]);
  const selectedClassObj = useMemo(
    () => classes.find((c) => `${c.classUuid}:${c.sectionUuid}` === selectedClass),
    [classes, selectedClass]
  );

  const { data: students } = useTeacherCtStudents(
    selectedSectionUuid
      ? { sectionUuid: selectedSectionUuid, page: 0, size: 500 }
      : undefined,
    Boolean(selectedSectionUuid)
  );

  const sectionLabel = selectedClassObj
    ? `${selectedClassObj.className}-${selectedClassObj.sectionName}`
    : "attendance";

  const handleExportPDF = async (range: "day" | "week" | "month") => {
    if (!selectedSectionUuid) return;
    const { from } = getDateRange(range, selectedDate);
    setDownloading(true);
    try {
      const res = await teacherService.exportAttendanceSheet(selectedSectionUuid, from);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${sectionLabel}-${from}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleExportData = async (format: "xlsx" | "csv", range: "day" | "week" | "month") => {
    if (!selectedSectionUuid) return;
    setDownloading(true);
    try {
      const { from, to } = getDateRange(range, selectedDate);
      const res = await attendanceService.listStudentAttendance({
        sectionUuid: selectedSectionUuid,
        fromDate: from,
        toDate: to,
        size: 9999,
      });
      const rows = buildRows(res.data.content ?? []);
      const base = `attendance-${sectionLabel}-${from}${from !== to ? `_to_${to}` : ""}`;
      if (format === "csv") {
        downloadAsCSV(rows, `${base}.csv`);
        toast.success("CSV downloaded");
      } else {
        downloadAsXLSX(rows, `${base}.xlsx`);
        toast.success("Excel downloaded");
      }
    } catch {
      toast.error("Failed to export data");
    } finally {
      setDownloading(false);
    }
  };

  // Fetch existing attendance records for the section+date — use sectionUuid (not staffUuid)
  // so records marked by any substitute/proxy teacher are also loaded
  const { data: existingAttendancePage, refetch: refetchExisting } = useSectionAttendance(
    selectedSectionUuid && selectedDate
      ? { sectionUuid: selectedSectionUuid, fromDate: selectedDate, toDate: selectedDate, size: 500 }
      : undefined,
    Boolean(selectedSectionUuid && selectedDate)
  );

  // Map existing records to student Uuids for QuickAttendanceGrid
  const initialRecords = useMemo(() => {
    if (!existingAttendancePage?.content || existingAttendancePage.content.length === 0) return null;
    if (!students?.content) return null;

    // Filter to only records belonging to students in the CURRENT selected section
    const sectionStudentUuids = new Set(students.content.map((s) => s.uuid));
    const relevantRecords = existingAttendancePage.content.filter((r) =>
      r.studentUuid && sectionStudentUuids.has(r.studentUuid)
    );

    if (relevantRecords.length === 0) return null;

    const map: Record<string, string> = {};
    relevantRecords.forEach((r) => {
      if (r.attendanceTypeShortCode && r.studentUuid) {
        map[r.studentUuid] = r.attendanceTypeShortCode;
      }
    });
    return map;
  }, [existingAttendancePage, students]);

  if (!isLoading && classes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <Shield className="mx-auto mb-3 h-10 w-10 text-amber-600" />
          <h1 className="text-xl font-bold">Attendance Not Available</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Only class teachers can mark attendance. You are not assigned as a class teacher for any section.
            If you believe this is an error, please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Take Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {selectedClassObj
              ? `Mark attendance for ${selectedClassObj.className}-${selectedClassObj.sectionName}`
              : "Select a class to mark attendance."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            min={minDate}
            max={maxDate}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <ClassSelector value={selectedClass} onChange={setSelectedClass} classes={classes} />

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={downloading || !selectedSectionUuid}>
                <Download className="mr-1 h-4 w-4" />
                {downloading ? "Exporting…" : "Export"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
                <FileText className="h-3.5 w-3.5" /> PDF (from backend)
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => handleExportPDF("day")}>
                  Today
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (XLSX)
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => handleExportData("xlsx", "day")}>
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExportData("xlsx", "week")}>
                  This week
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExportData("xlsx", "month")}>
                  This month
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
                <Table2 className="h-3.5 w-3.5" /> CSV
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => handleExportData("csv", "day")}>
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExportData("csv", "week")}>
                  This week
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExportData("csv", "month")}>
                  This month
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditWindowGuard
        attendanceDate={selectedDate}
        attendanceType="student"
        fallback={
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-10 text-center">
            <Lock className="h-8 w-8 text-amber-500" />
            <p className="font-semibold text-amber-700 dark:text-amber-400">Edit window closed</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              The attendance edit window for this date has expired. Contact your administrator if you need to make changes.
            </p>
          </div>
        }
      >
        <QuickAttendanceGrid
          students={students?.content ?? []}
          sectionUuid={selectedSectionUuid ?? ""}
          staffUuid={staffUuid}
          selectedDate={selectedDate}
          initialRecords={initialRecords}
          onSubmitSuccess={() => refetchExisting()}
        />
      </EditWindowGuard>
    </div>
  );
}

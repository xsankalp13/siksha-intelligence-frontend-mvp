import { useEffect, useMemo, useState } from "react";
import { Download, LayoutGrid, Hand, Shield } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useTeacherCtClasses, useTeacherCtStudents, useTeacherSchedule } from "@/features/teacher/queries/useTeacherQueries";
import ClassSelector from "@/features/teacher/components/ClassSelector";
import QuickAttendanceGrid from "@/features/teacher/components/QuickAttendanceGrid";
import { attendanceService } from "@/services/attendance";
import { teacherService } from "@/services/teacherService";
import { useQuery } from "@tanstack/react-query";
import { useGetAllExams } from "@/features/examination/hooks/useExaminationQueries";
import { Link } from "react-router-dom";

export default function TeacherAttendancePage() {
  const { data: classes = [], isLoading } = useTeacherCtClasses();
  const { data: schedule } = useTeacherSchedule();
  const staffUuid = schedule?.staffUuid ?? "";
  const defaultSelection = classes[0] ? `${classes[0].classUuid}:${classes[0].sectionUuid}` : "";
  const [selectedClass, setSelectedClass] = useState(defaultSelection);
  const [mode, setMode] = useState("grid");
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
      ? { sectionUuid: selectedSectionUuid, page: 0, size: 120 }
      : undefined,
    Boolean(selectedSectionUuid)
  );

  const handleDownload = async () => {
    if (!selectedSectionUuid) return;
    setDownloading(true);
    try {
      const res = await teacherService.exportAttendanceSheet(selectedSectionUuid, selectedDate);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Attendance sheet downloaded");
    } catch {
      toast.error("Failed to download attendance sheet");
    } finally {
      setDownloading(false);
    }
  };

  // Fetch existing attendance records for this teacher on the selected date
  const { data: existingAttendancePage } = useQuery({
    queryKey: ["teacher-attendance", staffUuid, selectedDate],
    queryFn: async () => {
      if (!staffUuid) return null;
      return (
        await attendanceService.listStudentAttendance({
          takenByStaffUuid: staffUuid,
          fromDate: selectedDate,
          toDate: selectedDate,
          size: 200,
        })
      ).data;
    },
    enabled: Boolean(staffUuid && selectedDate),
  });

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

  // Check if there is an active exam on the selected date
  const { data: allExams } = useGetAllExams();
  const activeExam = useMemo(() => {
    if (!allExams) return null;
    return allExams.find(exam => 
      exam.published && 
      selectedDate >= exam.startDate && 
      selectedDate <= exam.endDate
    );
  }, [allExams, selectedDate]);

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
          <h1 className="text-2xl font-bold">Mark Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {selectedClassObj
              ? `Class teacher attendance for ${selectedClassObj.className}-${selectedClassObj.sectionName}`
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
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList>
              <TabsTrigger value="grid"><LayoutGrid className="mr-1 h-4 w-4" />Grid</TabsTrigger>
              <TabsTrigger value="swipe"><Hand className="mr-1 h-4 w-4" />Swipe</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading || !selectedSectionUuid}>
            <Download className="mr-1 h-4 w-4" />
            {downloading ? "Downloading..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {activeExam ? (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-8 text-center">
          <Shield className="mx-auto mb-3 h-10 w-10 text-blue-600" />
          <h1 className="text-xl font-bold">Attendance is handled via Exam Attendance</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground mb-6">
            There is an active examination ({activeExam.name}) scheduled for this date. Regular class attendance is disabled.
          </p>
          <Button asChild>
            <Link to="/dashboard/invigilator/attendance">Go to Exam Attendance</Link>
          </Button>
        </div>
      ) : mode === "grid" ? (
        <div className="space-y-4">
          <QuickAttendanceGrid
            students={students?.content ?? []}
            sectionUuid={selectedSectionUuid ?? ""}
            staffUuid={staffUuid}
            selectedDate={selectedDate}
            initialRecords={initialRecords}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Swipe mode is kept as a fallback UX; grid mode is the default and primary flow now.
          <br />
          Selected class: {selectedClassObj ? `${selectedClassObj.className}-${selectedClassObj.sectionName}` : "N/A"}
        </div>
      )}
    </div>
  );
}

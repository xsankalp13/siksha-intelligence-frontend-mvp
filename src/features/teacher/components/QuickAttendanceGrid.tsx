import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { attendanceService } from "@/services/attendance";
import { hrmsService } from "@/services/hrms";
import { handleAttendanceError } from "@/features/attendance/utils/attendanceError";
import { getLocalDateString } from "@/lib/dateUtils";
import type { StudentAttendanceRequestDTO } from "@/services/types/attendance";
import type { TeacherStudentResponseDto } from "@/services/types/teacher";
import StudentAttendanceModal from "./StudentAttendanceModal";

type LocalCode = "P" | "A" | "L";

type Props = {
  students: TeacherStudentResponseDto[];
  sectionUuid: string;
  staffUuid: string;
  selectedDate?: string;
  initialRecords?: Record<string, string> | null;
  onSubmitSuccess?: () => void;
};

export default function QuickAttendanceGrid({
  students,
  sectionUuid,
  staffUuid,
  selectedDate,
  initialRecords,
  onSubmitSuccess,
}: Props) {
  const [open, setOpen] = useState(false);

  const { data: attendanceTypes } = useQuery({
    queryKey: ["ams", "types"],
    queryFn: async () => (await attendanceService.getAllTypes()).data,
    staleTime: 5 * 60 * 1000,
  });

  const shortCodeMap = useMemo(() => {
    if (!attendanceTypes || attendanceTypes.length === 0) return null;
    const pCode = attendanceTypes.find((t) => t.presentMark)?.shortCode;
    const aCode = attendanceTypes.find((t) => t.absenceMark)?.shortCode;
    const lCode = attendanceTypes.find((t) => t.lateMark)?.shortCode;
    return { P: pCode ?? "P", A: aCode ?? "A", L: lCode ?? "L" };
  }, [attendanceTypes]);

  const modalInitialState = useMemo<Record<string, LocalCode>>(() => {
    const next: Record<string, LocalCode> = {};
    students.forEach((s) => {
      const backendCode = initialRecords?.[s.uuid];
      if (!backendCode) {
        next[s.uuid] = "P";
        return;
      }
      if (backendCode === shortCodeMap?.A) next[s.uuid] = "A";
      else if (backendCode === shortCodeMap?.L) next[s.uuid] = "L";
      else next[s.uuid] = "P";
    });
    return next;
  }, [initialRecords, shortCodeMap, students]);

  const attendanceDate = selectedDate || getLocalDateString();
  const { data: calendarEvents } = useQuery({
    queryKey: ["hrms", "calendar", "events", attendanceDate],
    queryFn: () => {
      const d = new Date(attendanceDate);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const ay = m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
      return hrmsService.listCalendarEvents({ month: m, academicYear: ay, fromDate: attendanceDate, toDate: attendanceDate }).then(r => r.data);
    },
  });

  const holidayEvent = useMemo(() => {
    return calendarEvents?.find(e => (e.dayType === "HOLIDAY" || e.dayType === "VACATION") && e.date === attendanceDate);
  }, [calendarEvents, attendanceDate]);

  const isHoliday = !!holidayEvent;

  const submit = async (state: Record<string, LocalCode>) => {
    if (students.length === 0) return;
    if (!shortCodeMap) {
      toast.error("Attendance types are not configured.");
      return;
    }

    const attendanceDate = selectedDate || getLocalDateString();

    const payload: StudentAttendanceRequestDTO[] = students.map((student) => {
      const code = state[student.uuid] ?? "P";
      return {
        studentUuid: student.uuid,
        attendanceShortCode: shortCodeMap[code] ?? "P",
        attendanceDate,
        takenByStaffUuid: staffUuid,
      };
    });

    try {
      await attendanceService.createStudentAttendanceBatch(payload);
      toast.success(`Attendance submitted for ${sectionUuid}`);
      onSubmitSuccess?.();
    } catch (error) {
      handleAttendanceError(error, "Failed to submit attendance");
      throw error;
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      {isHoliday ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3 mb-4">
          <CalendarCheck2 className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Holiday: {holidayEvent?.title || "Non-Working Day"}</p>
            <p className="text-xs mt-0.5 text-amber-700">Student attendance cannot be recorded on a holiday.</p>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Student Attendance</p>
          <p className="text-xs text-muted-foreground">
            {initialRecords
              ? `Attendance recorded for ${Object.keys(initialRecords).length} student(s). Tap to modify.`
              : "Mark attendance for all students in this section."}
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2" disabled={students.length === 0 || isHoliday}
          variant={initialRecords ? "outline" : "default"}
        >
          {initialRecords ? (
            <><Pencil className="h-4 w-4" /> Edit Attendance</>
          ) : (
            <><CalendarCheck2 className="h-4 w-4" /> Take Attendance</>
          )}
        </Button>
      </div>

      <StudentAttendanceModal
        open={open}
        onOpenChange={setOpen}
        students={students}
        initialState={modalInitialState}
        onSubmit={submit}
      />
    </div>
  );
}
